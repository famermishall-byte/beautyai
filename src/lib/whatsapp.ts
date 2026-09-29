import type { CartItem } from "@/types";

function sanitizePhoneForWhatsApp(phone: string): string {
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

// Kyrgyz numbers are often typed as 0700123456 or 700123456 — wa.me needs the country code.
export function whatsappDigits(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 9) return `996${d}`;
  if (d.length === 10 && d.startsWith("0")) return `996${d.slice(1)}`;
  return d;
}

/** Чат с этим номером в WhatsApp (на телефоне открывает приложение); без номера — просто WhatsApp. */
export function whatsappChatUrl(phone: string | null): string {
  return `https://wa.me/${phone ? whatsappDigits(phone) : ""}`;
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const phone = sanitizePhoneForWhatsApp(whatsappNumber);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
