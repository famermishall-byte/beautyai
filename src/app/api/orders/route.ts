import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { formatOrderNumber, buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { CartItem } from "@/types";

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json();
  const branchId: string = body.branchId;
  const customerName: string = (body.customerName ?? "").trim();
  const customerPhone: string = (body.customerPhone ?? "").trim();
  const items: CartItem[] = body.items ?? [];

  if (!branchId || !customerName || !customerPhone || items.length === 0) {
    return NextResponse.json({ error: "Не хватает данных для оформления заказа." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: branch } = await supabase
      .from("branches")
      .select("*")
      .eq("id", branchId)
      .eq("store_id", profile.storeId)
      .maybeSingle();
    if (!branch) {
      return NextResponse.json({ error: "Филиал не найден." }, { status: 404 });
    }

    const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", profile.storeId);
    const orderNumber = formatOrderNumber((orderCount ?? 0) + 1);

    const itemsForOrder = items.map((item) => ({
      name: item.product.name,
      brand: item.product.brand,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        store_id: profile.storeId,
        branch_id: branch.id,
        number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_price: totalPrice,
        status: "sent",
        items_json: itemsForOrder,
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    const message = buildOrderMessage({
      orderNumber,
      items,
      totalPrice,
      customerName,
      customerPhone,
      branchName: branch.name,
      branchAddress: branch.address,
      storeName: profile.storeName,
    });
    const whatsappUrl = buildWhatsAppUrl(branch.whatsapp, message);

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber, whatsappUrl });
  } catch {
    return NextResponse.json({ error: "Не удалось оформить заказ — база данных недоступна." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ orders: [] });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, branches(*)")
      .in("id", ids)
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders: orders.map(mapOrder) });
  } catch {
    return NextResponse.json({ orders: [], error: "База данных недоступна." });
  }
}
