import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapHomeSlide, mapProduct } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import { slideRowFromBody, SLIDE_INPUT_ERRORS } from "@/lib/home-slides";
import type { Product } from "@/types";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("home_slides")
      .select("*")
      .eq("store_id", profile.storeId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;

    const productIds = [...new Set((rows ?? []).map((r) => r.product_id as string | null).filter((id): id is string => !!id))];
    const productsById = new Map<string, Product>();
    if (productIds.length > 0) {
      const { data: productRows } = await supabase.from("products").select("*").in("id", productIds).eq("store_id", profile.storeId);
      for (const p of productRows ?? []) productsById.set(p.id as string, mapProduct(p) as Product);
    }

    const slides = (rows ?? []).map((r) => mapHomeSlide(r, r.product_id ? (productsById.get(r.product_id as string) ?? null) : null));
    return NextResponse.json({ slides });
  } catch {
    return NextResponse.json({ slides: [], error: "База данных недоступна." });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = slideRowFromBody(body);
  if (!parsed.ok) return NextResponse.json({ error: SLIDE_INPUT_ERRORS[parsed.error] }, { status: 400 });

  try {
    const supabase = await createServerSupabaseClient();
    // Новый слайд — в конец списка.
    const { data: last } = await supabase
      .from("home_slides")
      .select("priority")
      .eq("store_id", profile.storeId)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();
    const priority = last ? (last.priority as number) + 1 : 0;

    const { data: row, error } = await supabase
      .from("home_slides")
      .insert({ ...parsed.row, store_id: profile.storeId, priority, active: body?.active === false ? false : true })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: row.id });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить слайд." }, { status: 500 });
  }
}
