import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile, isStaff } from "@/lib/auth";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

// For orders that still need action, show the CURRENT stock of each line in the order's branch, so the seller
// sees at once if something ran out after the customer ordered. Older orders (no productId saved) are matched
// by name + brand. A line with no stock row gets `quantity: null` ("no data").
async function attachStock(supabase: Client, storeId: string, orders: ReturnType<typeof mapOrder>[]) {
  const open = orders.filter((o) => o.status === "sent" || o.status === "confirmed");
  if (open.length === 0) return;

  const legacyNames = new Set<string>();
  for (const o of open) for (const it of o.items) if (!it.productId) legacyNames.add(it.name);
  const idByName = new Map<string, string>();
  if (legacyNames.size > 0) {
    const { data } = await supabase.from("products").select("id, name, brand").eq("store_id", storeId).in("name", [...legacyNames].slice(0, 200));
    for (const p of data ?? []) idByName.set(`${p.name}|${p.brand}`.toLowerCase(), p.id as string);
  }

  const productIdOf = (it: { productId?: string; name: string; brand: string }) => it.productId ?? idByName.get(`${it.name}|${it.brand}`.toLowerCase());
  const ids = [...new Set(open.flatMap((o) => o.items.map(productIdOf)).filter(Boolean) as string[])];
  const quantity = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 80) {
    const { data } = await supabase.from("product_branch_stock").select("product_id, branch_id, quantity").eq("store_id", storeId).in("product_id", ids.slice(i, i + 80));
    for (const r of data ?? []) quantity.set(`${r.product_id}|${r.branch_id}`, r.quantity as number);
  }

  for (const o of open) {
    for (const it of o.items) {
      const pid = productIdOf(it);
      it.stock = { quantity: pid && o.branch ? (quantity.get(`${pid}|${o.branch.id}`) ?? null) : null };
    }
  }
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStaff(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from("orders").select("*, branches(*)").eq("store_id", profile.storeId).order("created_at", { ascending: false });
    if (profile.role === "branch_manager") {
      // Only the orders of their own branch (RLS enforces the same on the database side).
      if (!profile.branchId) return NextResponse.json({ orders: [], error: "Вам пока не назначен филиал." }, { status: 403 });
      query = query.eq("branch_id", profile.branchId);
    }
    const { data: orders, error } = await query;

    if (error) throw error;

    const mapped = orders.map(mapOrder);
    try {
      await attachStock(supabase, profile.storeId, mapped);
    } catch (e) {
      console.error("attachStock failed — listing orders without stock info", e);
    }
    return NextResponse.json({ orders: mapped });
  } catch (e) {
    console.error("admin orders failed", e);
    // A real error status, so the screen shows the problem instead of a misleading "no orders yet".
    return NextResponse.json({ orders: [], error: "Не удалось загрузить заказы. Обновите страницу." }, { status: 500 });
  }
}
