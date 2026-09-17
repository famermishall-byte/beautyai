export const ORDER_STATUSES = ["sent", "confirmed", "completed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  sent: "Отправлен",
  confirmed: "Подтверждён",
  completed: "Выполнен",
  cancelled: "Отменён",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function getOrderStatusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status;
}
