import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function toProduct(
  p: Record<string, unknown>,
  branchInfo: { quantity: number | null; availableAtOtherBranch: boolean } | null
) {
  return {
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
    ...(branchInfo ? { branchQuantity: branchInfo.quantity, availableAtOtherBranch: branchInfo.availableAtOtherBranch } : {}),
  };
}

// Plain search/filter over the store's catalog — no AI, just text matching
// and simple comparisons. Powers "Найти товар", "По бюджету" и "Каталог".
export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  // Comma-separated to support a category-group filter (e.g. all of "Уход за
  // лицом"'s subcategories at once) — see src/lib/categories.ts.
  const categories = (searchParams.get("category") ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  const maxPriceRaw = searchParams.get("maxPrice");
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null;
  // Only when a branch is picked (src/app/(app)/catalog/page.tsx) do we show
  // otherwise-hidden (per-branch out-of-stock) rows with a "нет в наличии"
  // label instead of hiding them entirely — the old, branch-agnostic
  // behavior below (hide anything with in_stock=false) is unchanged.
  const branchId = searchParams.get("branchId")?.trim() || null;

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("products").select("*").eq("store_id", profile.storeId).order("name", { ascending: true });
  if (!branchId) query = query.eq("in_stock", true);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }

  let products = data ?? [];

  if (q) {
    products = products.filter((p) => {
      const haystack = [p.name, p.brand, p.category, p.description, p.characteristics, p.purpose]
        .filter((field): field is string => typeof field === "string")
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (categories.length > 0) {
    products = products.filter(
      (p) => typeof p.category === "string" && categories.includes(p.category.toLowerCase())
    );
  }

  if (maxPrice !== null && Number.isFinite(maxPrice)) {
    products = products.filter((p) => typeof p.price === "number" && p.price <= maxPrice);
  }

  if (!branchId) {
    return NextResponse.json({ products: products.map((p) => toProduct(p, null)) });
  }

  const productIds = products.map((p) => p.id as string);
  const { data: stockRows } = await supabase
    .from("product_branch_stock")
    .select("product_id, branch_id, quantity")
    .in("product_id", productIds);

  const quantityAtBranch = new Map<string, number>();
  const hasBranchData = new Set<string>();
  const availableElsewhere = new Set<string>();
  for (const row of stockRows ?? []) {
    const productId = row.product_id as string;
    hasBranchData.add(productId);
    if (row.branch_id === branchId) quantityAtBranch.set(productId, row.quantity as number);
    else if ((row.quantity as number) > 0) availableElsewhere.add(productId);
  }

  return NextResponse.json({
    products: products.map((p) => {
      const id = p.id as string;
      const quantity = quantityAtBranch.has(id) ? quantityAtBranch.get(id)! : hasBranchData.has(id) ? 0 : null;
      const isOutHere = quantity === 0 || (quantity === null && !p.in_stock);
      return toProduct(p, { quantity, availableAtOtherBranch: isOutHere && availableElsewhere.has(id) });
    }),
  });
}
