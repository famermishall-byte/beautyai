// Тексты push-уведомлений и правила получателей (docs/superpowers/specs/2026-09-29-web-push-design.md).
// Без Deno/Node-API — тот же файл работает в Edge Function и в тестах (npm test).

export type PushMessage = { title: string; body: string; url: string; tag: string };

const som = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/\s/g, " ")} сом`;

export function newOrderMessage(o: { number: string; total_price: number; delivery_method: string; customer_name: string }): PushMessage {
  return {
    title: `Новый заказ №${o.number}`,
    body: [som(o.total_price), o.delivery_method === "delivery" ? "Доставка" : "Самовывоз", o.customer_name].filter(Boolean).join(" · "),
    url: "/admin/orders",
    tag: `order-${o.number}`,
  };
}

/** Клиенту — о смене статуса или изменении состава; null — об этом статусе не сообщаем. */
export function customerOrderMessage(event: string, o: { number: string; status: string; delivery_method: string }): PushMessage | null {
  let body: string | null = null;
  if (event === "order_edited") body = "Продавец изменил заказ — проверьте состав и сумму.";
  else if (o.status === "paid") body = "Оплата получена — спасибо!";
  else if (o.status === "shipped") body = "Заказ в пути 🚚";
  else if (o.status === "completed") body = o.delivery_method === "delivery" ? "Заказ доставлен. Спасибо за покупку!" : "Заказ выдан. Спасибо за покупку!";
  else if (o.status === "cancelled") body = "Заказ отменён.";
  if (!body) return null;
  return { title: `Заказ №${o.number}`, body, url: "/orders", tag: `order-${o.number}` };
}

/** Кто из сотрудников получает «новый заказ»: владелец и админы — все заказы магазина, управляющий — только своего филиала. */
export function staffRecipient(
  p: { role: string; store_id: string | null; branch_id: string | null },
  order: { store_id: string; branch_id: string | null }
): boolean {
  if (p.store_id !== order.store_id) return false;
  if (p.role === "owner" || p.role === "admin") return true;
  return p.role === "branch_manager" && !!p.branch_id && p.branch_id === order.branch_id;
}

/** Рассылка клиентам: к тексту — «До 05.10», если есть срок действия (docs/superpowers/specs/2026-09-29-push-schedule-design.md). */
export function broadcastMessage(b: { id: string; title: string; body: string; url: string | null; valid_until: string | null }): PushMessage {
  const until = b.valid_until ? ` · До ${b.valid_until.slice(8, 10)}.${b.valid_until.slice(5, 7)}` : "";
  return { title: b.title, body: `${b.body}${until}`, url: b.url || "/", tag: `broadcast-${b.id}` };
}

const BISHKEK_OFFSET_H = 6;
const MAX_TTL = 28 * 24 * 3600;

/** Сколько секунд push-служба хранит рассылку для выключенных телефонов: до конца дня «до» по Бишкеку, не больше 28 дней. */
export function broadcastTtl(validUntil: string | null, now: Date = new Date()): number {
  if (!validUntil) return 24 * 3600;
  const [y, m, d] = validUntil.split("-").map(Number);
  const end = Date.UTC(y, m - 1, d + 1, -BISHKEK_OFFSET_H); // 00:00 следующего дня в Бишкеке
  const seconds = Math.floor((end - now.getTime()) / 1000);
  return Math.max(0, Math.min(MAX_TTL, seconds));
}
