import { normalizeContactPhone } from "./feedback";

// Самовывоз / доставка и шаги продавца (docs/superpowers/specs/2026-09-29-order-delivery-design.md). Чистые функции —
// одни и те же на сервере (заказ), на листе заказа по ссылке, в админке и на странице курьера.

export type DeliveryMethod = "pickup" | "delivery";
export type Delivery = { method: DeliveryMethod; address: string | null; time: string | null; courierPhone: string | null };

const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

/** Проверка «Как получить» из корзины. Для самовывоза поля доставки отбрасываются. */
export function parseDeliveryInput(body: Record<string, unknown>): { ok: true; delivery: Delivery } | { ok: false; error: string } {
  const method = body.deliveryMethod === undefined || body.deliveryMethod === null ? "pickup" : body.deliveryMethod;
  if (method === "pickup") return { ok: true, delivery: { method: "pickup", address: null, time: null, courierPhone: null } };
  if (method !== "delivery") return { ok: false, error: "Выберите самовывоз или доставку." };

  const address = text(body.deliveryAddress);
  if (address.length < 5) return { ok: false, error: "Укажите адрес доставки." };
  if (address.length > 300) return { ok: false, error: "Адрес слишком длинный." };
  const time = text(body.deliveryTime);
  if (time.length > 100) return { ok: false, error: "Время доставки — не длиннее 100 символов." };
  const rawPhone = text(body.courierPhone);
  const courierPhone = rawPhone ? normalizeContactPhone(rawPhone) : null;
  if (rawPhone && !courierPhone) return { ok: false, error: "Проверьте телефон для курьера — нужно от 9 до 15 цифр." };

  return { ok: true, delivery: { method: "delivery", address, time: time || null, courierPhone } };
}

type OrderState = { status: string; deliveryMethod: DeliveryMethod; paidAt: string | null };

/**
 * Кнопки продавца по порядку (первая — главная): paid «Оплата получена», ship «Отправлен», handedOver «Выдан клиенту»,
 * delivered «Доставлен», cancel «Отменить». Доставку можно отправить и до оплаты (оплата курьеру).
 */
export type SellerAction = "paid" | "ship" | "handedOver" | "delivered" | "cancel";

export function sellerActions(order: OrderState): SellerAction[] {
  const delivery = order.deliveryMethod === "delivery";
  switch (order.status) {
    case "sent":
    case "confirmed":
      return delivery ? ["paid", "ship", "cancel"] : ["paid", "cancel"];
    case "paid":
      return delivery ? ["ship"] : ["handedOver"];
    case "shipped":
      return ["delivered"];
    default:
      return [];
  }
}

/** Статус, который ставит кнопка. */
export const ACTION_STATUS: Record<SellerAction, string> = {
  paid: "paid",
  ship: "shipped",
  handedOver: "completed",
  delivered: "completed",
  cancel: "cancelled",
};

/** Продажа: оплачен или выполнен; «Отправлен» — только если оплату уже получили (иначе клиент платит курьеру). */
export function isSale(order: OrderState): boolean {
  if (order.status === "paid" || order.status === "completed") return true;
  return order.status === "shipped" && !!order.paidAt;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Текст, который продавец пересылает курьеру в WhatsApp. */
export function buildCourierMessage(o: {
  number: string;
  customerName: string;
  customerPhone: string;
  courierPhone: string | null;
  address: string;
  time: string | null;
  totalPrice: number;
  paid: boolean;
  link: string;
}): string {
  return [
    `Доставка заказа #${o.number} 🚚`,
    "",
    `Адрес: ${o.address}`,
    ...(o.time ? [`Время: ${o.time}`] : []),
    `Клиент: ${o.customerName}, ${o.customerPhone}`,
    ...(o.courierPhone ? [`Телефон для курьера: ${o.courierPhone}`] : []),
    o.paid ? "Заказ оплачен — деньги брать не нужно." : `Получить с клиента: ${o.totalPrice.toLocaleString("ru-RU")} сом`,
    "",
    "Когда отдадите заказ — откройте ссылку и нажмите «Доставлен»:",
    `👉 ${o.link}`,
  ].join("\n");
}
