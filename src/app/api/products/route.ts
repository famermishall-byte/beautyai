import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function toProduct(p: Record<string, unknown>) {
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
  };
}

// Plain search/filter over the store's catalog — no AI, just text matching
// and simple comparisons. Powers "Найти товар", "По бюджету" and "Каталог".
export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const category = searchParams.get("category")?.trim().toLowerCase() ?? "";
  const maxPriceRaw = searchParams.get("maxPrice");
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", profile.storeId)
    .eq("in_stock", true)
    .order("name", { ascending: true });

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

  if (category) {
    products = products.filter((p) => typeof p.category === "string" && p.category.toLowerCase() === category);
  }

  if (maxPrice !== null && Number.isFinite(maxPrice)) {
    products = products.filter((p) => typeof p.price === "number" && p.price <= maxPrice);
  }

  return NextResponse.json({ products: products.map(toProduct) });
}
