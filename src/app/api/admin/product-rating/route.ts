import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff, type SessionProfile } from "@/lib/auth";

// PostgREST caps a single response (1000 rows by default) — read in pages until exhausted.
// Same helper as admin/stock/route.ts.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// A branch manager only ever sees their own branch, whatever the request says — same rule as admin/stock/route.ts.
function resolveBranchId(profile: SessionProfile, requested: string): string | null {
  if (profile.role !== "branch_manager") return requested;
  return profile.branchId;
}

// Весь каталог одного филиала, отсортированный по факту продаж (top_selling_items_by_branch,
// see supabase/top_selling_items_by_branch.sql) — товары без единой продажи идут в конце с 0.
export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStaff(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const branchId = resolveBranchId(profile, request.nextUrl.searchParams.get("branchId") ?? "");
  if (!branchId) return NextResponse.json({ error: "Вам пока не назначен филиал — обратитесь к владельцу." }, { status: 403 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: branch } = await supabase.from("branches").select("id").eq("id", branchId).eq("store_id", profile.storeId).maybeSingle();
    if (!branch) return NextResponse.json({ error: "Филиал не найден." }, { status: 404 });

    const products = await fetchAll<Record<string, unknown>>((from, to) =>
      supabase
        .from("products")
        .select("id, sku, name, brand, category, image_url, price")
        .eq("store_id", profile.storeId)
        .order("name")
        .range(from, to)
    );

    const { data: sold, error: soldError } = await supabase.rpc("top_selling_items_by_branch", { p_branch_id: branchId, p_limit: 5000 });
    if (soldError) throw soldError;
    const qtyByProduct = new Map<string, number>(
      (sold ?? []).map((r: { product_id: string; total_qty: number }): [string, number] => [r.product_id, Number(r.total_qty)])
    );

    const items = products
      .map((p) => ({
        id: p.id as string,
        sku: p.sku as string,
        name: p.name as string,
        brand: p.brand as string,
        category: p.category as string,
        imageUrl: (p.image_url as string | null) ?? null,
        price: p.price as number,
        soldQty: qtyByProduct.get(p.id as string) ?? 0,
      }))
      .sort((a, b) => b.soldQty - a.soldQty || a.name.localeCompare(b.name, "ru"));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }
}
