import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { loadCart } from "@/lib/cart-server";
import { orderLinesFromCart } from "@/lib/cart-logic";
import { applyWholesale } from "@/lib/wholesale";
import { parseDeliveryInput } from "@/lib/delivery";

// Товары заказа берутся НЕ из запроса, а из корзины аккаунта (только отмеченные галочкой), с ценами
// из каталога и акциями — см. loadCart(). Заказанные строки потом удаляются из корзины; неотмеченные
// остаются там, пока клиент сам их не удалит.
export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const branchId: string = body.branchId;
  const customerName: string = (body.customerName ?? "").trim();
  const customerPhone: string = (body.customerPhone ?? "").trim();

  if (!branchId || !customerName || !customerPhone) {
    return NextResponse.json({ error: "Не хватает данных для оформления заказа." }, { status: 400 });
  }
  // Самовывоз или доставка (адрес обязателен) — lib/delivery.ts, supabase/order_delivery.sql.
  const parsedDelivery = parseDeliveryInput(body);
  if (!parsedDelivery.ok) {
    return NextResponse.json({ error: parsedDelivery.error }, { status: 400 });
  }
  const { delivery } = parsedDelivery;

  try {
    const supabase = await createServerSupabaseClient();

    const cart = await loadCart(supabase, profile.userId, profile.storeId, { selectedOnly: true });
    // От порога — оптовые цены (supabase/wholesale.sql, lib/wholesale.ts); ниже — обычные.
    const { items, summary: wholesale } = applyWholesale(cart.items, cart.threshold);
    if (items.length === 0) {
      return NextResponse.json({ error: "Отметьте в корзине хотя бы один товар." }, { status: 400 });
    }

    const { data: branch } = await supabase
      .from("branches")
      .select("*")
      .eq("id", branchId)
      .eq("store_id", profile.storeId)
      .maybeSingle();
    if (!branch) {
      return NextResponse.json({ error: "Филиал не найден." }, { status: 404 });
    }

    const { lines, total: totalPrice } = orderLinesFromCart(items);

    // Stock check in the chosen branch. Only what is certainly not there stops the order — a missing stock row
    // ("no data") is allowed, and the seller still has the last word.
    const productIds = lines.map((l) => l.productId);
    const { data: stockRows } = await supabase
      .from("product_branch_stock")
      .select("product_id, quantity")
      .eq("branch_id", branch.id)
      .in("product_id", productIds);
    const stockOf = new Map((stockRows ?? []).map((r) => [r.product_id as string, r.quantity as number]));
    const problems = lines
      .filter((l) => stockOf.has(l.productId) && stockOf.get(l.productId)! < l.quantity)
      .map((l) => {
        const left = stockOf.get(l.productId)!;
        return left <= 0 ? `«${l.name}» — нет в этом филиале` : `«${l.name}» — осталось только ${left} шт.`;
      });
    if (problems.length > 0) {
      return NextResponse.json(
        { error: `В выбранном филиале не хватает: ${problems.join("; ")}. Выберите другой филиал или уменьшите количество.` },
        { status: 409 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        store_id: profile.storeId,
        user_id: profile.userId,
        branch_id: branch.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_price: totalPrice,
        status: "sent",
        items_json: lines,
        // «Опт» — только если оптовые цены реально применены (порог мог набраться без единой оптовой цены).
        is_wholesale: wholesale.applied,
        delivery_method: delivery.method,
        delivery_address: delivery.address,
        delivery_time: delivery.time,
        courier_phone: delivery.courierPhone,
      })
      .select("id, status_token, number")
      .single();

    if (orderError) throw orderError;
    // Номер (1, 2, 3 …) выдаёт база — триггер orders_assign_number, см. supabase/order_numbers.sql.
    const orderNumber = order.number as string;

    // Заказ уже в базе — если убрать строки из корзины не получилось, заказ всё равно оформлен:
    // клиент просто увидит эти товары в корзине и удалит их сам. Ошибку не возвращаем.
    await supabase.from("cart_items").delete().eq("user_id", profile.userId).in("product_id", productIds);

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
      wholesaleThreshold: wholesale.applied ? wholesale.threshold : null,
      delivery,
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
