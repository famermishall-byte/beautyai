import type { CartItem } from "@/types";

export function formatOrderNumber(sequence: number): string {
  return `BA-${String(sequence).padStart(5, "0")}`;
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

type OrderMessageInput = {
  orderNumber: string;
  items: CartItem[];
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  branchName: string;
  branchAddress: string;
  storeName: string;
  statusToken: string;
  origin: string;
};

export function buildOrderMessage(order: OrderMessageInput): string {
  const itemLines = order.items
    .map(
      (item) =>
        `• ${item.product.name} — ${item.quantity} шт. — ${(item.product.price * item.quantity).toLocaleString("ru-RU")} сом`
    )
    .join("\n");

  return [
    `Новый заказ из ${order.storeName} 💄`,
    "",
    `Заказ: #${order.orderNumber}`,
    "",
    "Товары:",
    itemLines,
    "",
    `Итого: ${order.totalPrice.toLocaleString("ru-RU")} сом`,
    "",
    "Клиент:",
    `Имя: ${order.customerName}`,
    `Телефон: ${order.customerPhone}`,
    "",
    "Выбранный филиал:",
    order.branchName,
    `Адрес: ${order.branchAddress}`,
    "",
    "Клиент хочет оформить доставку.",
    "",
    "Пожалуйста, свяжитесь с клиентом для подтверждения заказа и оформления доставки.",
    "",
    "Когда обработаете заказ — откройте ссылку (входить в приложение не нужно). Там можно убрать то, чего нет в наличии, отметить оплату или отменить заказ. Всё сразу отобразится в приложении:",
    `👉 ${order.origin}/o/${order.statusToken}`,
  ].join("\n");
}

type FeedbackMessageInput = {
  message: string;
  customerName: string;
  storeName: string;
};

export function buildFeedbackMessage(input: FeedbackMessageInput): string {
  return [
    `Обратная связь из ${input.storeName} 💬`,
    "",
    input.message,
    "",
    `От: ${input.customerName}`,
  ].join("\n");
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const phone = sanitizePhoneForWhatsApp(whatsappNumber);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
