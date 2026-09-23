import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import type { Product } from "@/types";

function toProduct(p: Record<string, unknown>) {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode ?? null,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    description: p.description,
    characteristics: p.characteristics,
    purpose: p.purpose,
    nameKy: p.name_ky ?? null,
    descriptionKy: p.description_ky ?? null,
    characteristicsKy: p.characteristics_ky ?? null,
    purposeKy: p.purpose_ky ?? null,
    inStock: p.in_stock,
    imageUrl: p.image_url,
    attributes: p.attributes ?? undefined,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId")?.trim() || null;

  const supabase = await createServerSupabaseClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("store_id", profile.storeId)
    .maybeSingle();

  if (error || !product) {
    return NextResponse.json({ error: "Товар не найден." }, { status: 404 });
  }

  const { data: promoRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("store_id", profile.storeId)
    .eq("status", "active")
    .eq("product_id", id);
  const promotionsByProduct = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));
  const withPromo = (p: Product) => applyActivePromotion(p, promotionsByProduct);

  if (!branchId) {
    return NextResponse.json({ product: withPromo(toProduct(product) as Product) });
  }

  const { data: stockRows } = await supabase
    .from("product_branch_stock")
    .select("branch_id, quantity")
    .eq("product_id", id);

  const quantityAtBranch = (stockRows ?? []).find((r) => r.branch_id === branchId)?.quantity ?? null;
  const availableAtOtherBranch = (stockRows ?? []).some((r) => r.branch_id !== branchId && (r.quantity as number) > 0);

  return NextResponse.json({
    product: withPromo({
      ...toProduct(product),
      branchQuantity: quantityAtBranch,
      availableAtOtherBranch: (quantityAtBranch === 0 || quantityAtBranch === null) && availableAtOtherBranch,
    } as Product),
  });
}
