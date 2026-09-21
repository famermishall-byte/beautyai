// Order life-cycle: Новый → Подтверждён → Оплачен → Передан курьеру → Выполнен (or Отменён at any point).
// Payment and delivery happen outside the app (cash / bank / courier), so the branch marks each step —
// one tap on the "next step" button in the admin, or one tap on a link in the WhatsApp message.
export const ORDER_STATUSES = ["sent", "confirmed", "paid", "shipped", "completed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// What the customer sees in "Мои покупки".
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  sent: "Отправлен",
  confirmed: "Подтверждён",
  paid: "Оплачен",
  shipped: "Передан курьеру",
  completed: "Выполнен",
  cancelled: "Отменён",
};

// What the branch sees: "sent" is a NEW order there, not something that was "sent" to the customer.
export const ORDER_STATUS_ADMIN_LABELS: Record<OrderStatus, string> = { ...ORDER_STATUS_LABELS, sent: "Новый" };

/** A sale is counted once the order is paid: paid, handed to the courier, or completed. */
export const SALE_STATUSES: readonly string[] = ["paid", "shipped", "completed"];

/** The next step of the normal flow, for the one-tap button. */
export const NEXT_ORDER_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  sent: { status: "confirmed", label: "Подтвердить заказ" },
  confirmed: { status: "paid", label: "Отметить оплаченным" },
  paid: { status: "shipped", label: "Передан курьеру" },
  shipped: { status: "completed", label: "Заказ доставлен" },
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function getOrderStatusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status;
}

export function getOrderStatusAdminLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_ADMIN_LABELS[status] : status;
}
