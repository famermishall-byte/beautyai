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

    // Stock check in the chosen branch. Only what is certainly not there stops the order — a missing stock row
    // ("no data") is allowed, and the seller still has the last word.
    const productIds = items.map((i) => i.product.id);
    const { data: stockRows } = await supabase
      .from("product_branch_stock")
      .select("product_id, quantity")
      .eq("branch_id", branch.id)
      .in("product_id", productIds);
    const stockOf = new Map((stockRows ?? []).map((r) => [r.product_id as string, r.quantity as number]));
    const problems = items
      .filter((i) => stockOf.has(i.product.id) && stockOf.get(i.product.id)! < i.quantity)
      .map((i) => {
        const left = stockOf.get(i.product.id)!;
        return left <= 0 ? `«${i.product.name}» — нет в этом филиале` : `«${i.product.name}» — осталось только ${left} шт.`;
      });
    if (problems.length > 0) {
      return NextResponse.json(
        { error: `В выбранном филиале не хватает: ${problems.join("; ")}. Выберите другой филиал или уменьшите количество.` },
        { status: 409 }
      );
    }

    const itemsForOrder = items.map((item) => ({
      name: item.product.name,
      brand: item.product.brand,
      price: item.product.price,
      quantity: item.quantity,
      orderedQuantity: item.quantity,
      productId: item.product.id,
      sku: item.product.sku,
    }));

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        store_id: profile.storeId,
        user_id: profile.userId,
        branch_id: branch.id,
        number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_price: totalPrice,
        status: "sent",
        items_json: itemsForOrder,
      })
      .select("id, status_token")
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
      statusToken: order.status_token,
      origin: request.nextUrl.origin,
    });
    const whatsappUrl = buildWhatsAppUrl(branch.whatsapp, message);

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber, whatsappUrl });
  } catch {
    return NextResponse.json({ error: "Не удалось оформить заказ — база данных недоступна." }, { status: 500 });
  }
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, branches(*)")
      .eq("user_id", profile.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders: orders.map(mapOrder) });
  } catch {
    return NextResponse.json({ orders: [], error: "База данных недоступна." });
  }
}
