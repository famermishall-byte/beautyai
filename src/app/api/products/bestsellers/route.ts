import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

const LIMIT = 8;

// "Хит продаж": the products of a category set that were ordered most often in
// this store (RPC top_selling_items, see supabase/top_selling_items.sql). Until
// there are enough orders the list is topped up with products that have a photo,
// so the block is never empty — swap-in is automatic as real orders come in.
export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const categories = (request.nextUrl.searchParams.get("category") ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const supabase = await createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", profile.storeId)
    .eq("in_stock", true)
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });

  const pool = (rows ?? []).filter(
    (p) => categories.length === 0 || (typeof p.category === "string" && categories.includes(p.category.toLowerCase()))
  );

  // If the RPC isn't installed yet this just errors — fall through to the fallback.
  const { data: top } = await supabase.rpc("top_selling_items", { p_limit: 100 });
  const key = (name: unknown, brand: unknown) => `${String(name ?? "").toLowerCase()}|${String(brand ?? "").toLowerCase()}`;
  const rank = new Map<string, number>();
  ((top ?? []) as { name: string; brand: string }[]).forEach((t, i) => rank.set(key(t.name, t.brand), i));

  const sold = pool.filter((p) => rank.has(key(p.name, p.brand))).sort((a, b) => rank.get(key(a.name, a.brand))! - rank.get(key(b.name, b.brand))!);
  const soldIds = new Set(sold.map((p) => p.id));
  const filler = pool
    .filter((p) => !soldIds.has(p.id))
    .sort((a, b) => {
      const hit = (p: Record<string, unknown>) => Number(Boolean((p.attributes as { hit?: boolean } | null)?.hit));
      return hit(b) - hit(a) || Number(Boolean(b.image_url)) - Number(Boolean(a.image_url));
    });

  const picked = [...sold, ...filler].slice(0, LIMIT);
  return NextResponse.json({
    products: picked.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      description: p.description,
      characteristics: p.characteristics,
      purpose: p.purpose,
      inStock: p.in_stock,
      imageUrl: p.image_url,
      createdAt: p.created_at,
      attributes: p.attributes ?? undefined,
    })),
  });
}
