import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff, type SessionProfile } from "@/lib/auth";
import { stockStatus, type StockStatus } from "@/lib/stock";

const PAGE_SIZE = 50;

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

// PostgREST caps a single response (1000 rows by default) — read in pages until exhausted.
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

async function recalcInStock(supabase: Client, storeId: string, productId: string) {
  const { data } = await supabase.from("product_branch_stock").select("quantity").eq("product_id", productId);
  const any = (data ?? []).some((r) => (r.quantity as number) > 0);
  await supabase.from("products").update({ in_stock: any }).eq("id", productId).eq("store_id", storeId);
}

// A branch manager works only with their own branch, whatever the request says.
function resolveBranchId(profile: SessionProfile, requested: string): string | null {
  if (profile.role !== "branch_manager") return requested;
  return profile.branchId;
}

// Stock of every product in ONE branch: GET lists (search / status filter / pages), PUT sets one quantity.
export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStaff(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const branchId = resolveBranchId(profile, sp.get("branchId") ?? "");
  if (!branchId) return NextResponse.json({ error: "Вам пока не назначен филиал — обратитесь к владельцу." }, { status: 403 });
  const q = (sp.get("q") ?? "").replace(/[,()%*\\]/g, " ").trim();
  const statusFilter = sp.get("status") ?? "all";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: branch } = await supabase.from("branches").select("id").eq("id", branchId).eq("store_id", profile.storeId).maybeSingle();
    if (!branch) return NextResponse.json({ error: "Филиал не найден." }, { status: 404 });

    const products = await fetchAll<Record<string, unknown>>((from, to) => {
      let query = supabase.from("products").select("id, sku, name, brand, category, image_url").eq("store_id", profile.storeId).order("name");
      if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
      return query.range(from, to);
    });
    const stock = await fetchAll<Record<string, unknown>>((from, to) =>
      supabase.from("product_branch_stock").select("product_id, quantity, updated_at").eq("branch_id", branchId).eq("store_id", profile.storeId).range(from, to)
    );
    const byProduct = new Map(stock.map((s) => [s.product_id as string, s]));

    const all = products.map((p) => {
      const s = byProduct.get(p.id as string);
      const quantity = s ? (s.quantity as number) : null;
      return {
        id: p.id as string,
        sku: p.sku as string,
        name: p.name as string,
        brand: p.brand as string,
        category: p.category as string,
        imageUrl: (p.image_url as string | null) ?? null,
        quantity,
        updatedAt: s ? (s.updated_at as string) : null,
        status: stockStatus(quantity),
      };
    });

    const counts: Record<StockStatus | "all", number> = { all: all.length, out: 0, low: 0, ok: 0, unknown: 0 };
    for (const i of all) counts[i.status]++;

    // Default order: problems first (нет → мало → не заполнено → в наличии), then by name;
    // `sort=name` keeps plain alphabetical order.
    if (sp.get("sort") !== "name") {
      const rank: Record<StockStatus, number> = { out: 0, low: 1, unknown: 2, ok: 3 };
      all.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name, "ru"));
    }

    const filtered = statusFilter === "all" ? all : all.filter((i) => i.status === statusFilter);
    const items = filtered.slice(0, page * PAGE_SIZE);
    return NextResponse.json({ items, total: filtered.length, counts });
  } catch {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStaff(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const branchId = resolveBranchId(profile, String(body.branchId ?? "")) ?? "";
  const productId = String(body.productId ?? "");
  const quantity = Number(body.quantity);
  if (!branchId || !productId || !Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) {
    return NextResponse.json({ error: "Укажите целое число от 0." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const [{ data: branch }, { data: product }] = await Promise.all([
      supabase.from("branches").select("id").eq("id", branchId).eq("store_id", profile.storeId).maybeSingle(),
      supabase.from("products").select("id").eq("id", productId).eq("store_id", profile.storeId).maybeSingle(),
    ]);
    if (!branch || !product) return NextResponse.json({ error: "Филиал или товар не найден." }, { status: 404 });

    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("product_branch_stock")
      .upsert({ store_id: profile.storeId, product_id: productId, branch_id: branchId, quantity, updated_at: updatedAt }, { onConflict: "product_id,branch_id" });
    if (error) throw error;

    await recalcInStock(supabase, profile.storeId, productId);
    return NextResponse.json({ quantity, updatedAt, status: stockStatus(quantity) });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить остаток." }, { status: 500 });
  }
}
