import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { loadCart } from "@/lib/cart-server";
import type { Delivery } from "@/lib/delivery";

// Сколько минут назад мог быть оформлен «потерянный» заказ. Время сравнивает сервер — часы телефона не важны.
const WINDOW_MINUTES = 10;

type OrderLine = { name: string; price: number; quantity: number };

// Заказ мог сохраниться, а ответ до клиента — не дойти (обрыв связи на секунду). Клиент видит ошибку,
// хотя заказ есть и товар под него забронирован. Корзина спрашивает здесь: «нет ли у меня только что
// оформленного заказа в этот филиал на эту сумму?» — и, если есть, показывает обычный экран «Заказ отправлен».
export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const branchId = request.nextUrl.searchParams.get("branchId")?.trim();
  const total = Number(request.nextUrl.searchParams.get("total"));
  if (!branchId || !Number.isFinite(total)) {
    return NextResponse.json({ error: "Не хватает данных." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { data: rows, error } = await supabase
      .from("orders")
      .select("*, branches(*)")
      .eq("user_id", profile.userId)
      .eq("branch_id", branchId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;

    // Совпадение по сумме отличает «тот самый» заказ от другого, оформленного чуть раньше.
    const row = (rows ?? []).find((r) => Math.abs(Number(r.total_price) - total) < 0.5);
    const branch = row?.branches as { name: string; address: string; whatsapp: string } | null | undefined;
    if (!row || !branch) {
      return NextResponse.json({ order: null });
    }

    const lines = (row.items_json ?? []) as OrderLine[];
    const delivery: Delivery =
      row.delivery_method === "delivery"
        ? { method: "delivery", address: row.delivery_address ?? null, time: row.delivery_time ?? null, courierPhone: row.courier_phone ?? null }
        : { method: "pickup", address: null, time: null, courierPhone: null };
    // Порог опта в сообщении — тот же, что считает корзина (supabase/wholesale.sql).
    const threshold = row.is_wholesale ? (await loadCart(supabase, profile.userId, profile.storeId)).threshold : null;

    const message = buildOrderMessage({
      orderNumber: row.number as string,
      items: lines.map((l) => ({ product: { name: l.name, price: l.price }, quantity: l.quantity })),
      totalPrice: Number(row.total_price),
      customerName: row.customer_name as string,
      customerPhone: row.customer_phone as string,
      branchName: branch.name,
      branchAddress: branch.address,
      storeName: profile.storeName,
      statusToken: row.status_token as string,
      origin: request.nextUrl.origin,
      wholesaleThreshold: threshold,
      delivery,
    });

    return NextResponse.json({ order: { orderNumber: row.number as string, whatsappUrl: buildWhatsAppUrl(branch.whatsapp, message) } });
  } catch {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }
}
