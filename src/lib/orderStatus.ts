// Order life-cycle: Новый → Подтверждён → Оплачен (this is the sale) → Выполнен (or Отменён at any point).
// Delivery is the seller's job in WhatsApp, so "Передан курьеру" stays as an optional status but is not in the main flow.
// Payment and delivery happen outside the app (cash / bank / courier), so the branch marks each step —
// one tap on the "next step" button in the admin, or one tap on a link in the WhatsApp message.
export const ORDER_STATUSES = ["sent", "confirmed", "paid", "shipped", "completed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Display text lives in messages (namespace "orderStatus": customer.<status>, admin.<status>, next.<key>).
// Label helpers take the translator of that namespace: `const t = useTranslations("orderStatus")`.
// Customer wording ("Мои покупки"): "sent" reads "Отправлен". Branch wording: "sent" is a NEW order there.

/** A sale is counted once the order is paid: paid, handed to the courier, or completed. */
export const SALE_STATUSES: readonly string[] = ["paid", "shipped", "completed"];

/** The next step of the normal flow, for the one-tap button. */
export const NEXT_ORDER_STEP: Partial<Record<OrderStatus, { status: OrderStatus; labelKey: "paid" | "completed" }>> = {
  sent: { status: "paid", labelKey: "paid" },
  confirmed: { status: "paid", labelKey: "paid" },
  paid: { status: "completed", labelKey: "completed" },
  shipped: { status: "completed", labelKey: "completed" },
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

type StatusT = (key: string) => string;

export function getOrderStatusLabel(t: StatusT, status: string): string {
  return isOrderStatus(status) ? t(`customer.${status}`) : status;
}

export function getOrderStatusAdminLabel(t: StatusT, status: string): string {
  return isOrderStatus(status) ? t(`admin.${status}`) : status;
}
