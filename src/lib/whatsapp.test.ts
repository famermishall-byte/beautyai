import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrderMessage, buildWhatsAppUrl, desktopWhatsAppUrls, isMobileUserAgent, whatsappChatUrl } from "./whatsapp";

test("desktopWhatsAppUrls opens the desktop app / WhatsApp Web directly, skipping the wa.me landing page", () => {
  const url = buildWhatsAppUrl("+996 700 123 456", "Заказ #5\nИтого: 100 сом & ok");
  const d = desktopWhatsAppUrls(url);
  assert.ok(d);
  assert.equal(d.app, `whatsapp://send?phone=996700123456&text=${encodeURIComponent("Заказ #5\nИтого: 100 сом & ok")}`);
  assert.equal(d.web, `https://web.whatsapp.com/send?phone=996700123456&text=${encodeURIComponent("Заказ #5\nИтого: 100 сом & ok")}`);
  assert.equal(desktopWhatsAppUrls("https://example.com/x"), null);
});

test("isMobileUserAgent tells phones/tablets from computers", () => {
  assert.equal(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"), true);
  assert.equal(isMobileUserAgent("Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/128 Mobile"), true);
  assert.equal(isMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36"), false);
  assert.equal(isMobileUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"), false);
});

test("whatsappChatUrl adds Kyrgyzstan's code to local numbers", () => {
  assert.equal(whatsappChatUrl("0700 123 456"), "https://wa.me/996700123456");
  assert.equal(whatsappChatUrl("700123456"), "https://wa.me/996700123456");
});

test("whatsappChatUrl keeps a full international number", () => {
  assert.equal(whatsappChatUrl("+996 700 123-456"), "https://wa.me/996700123456");
});

test("whatsappChatUrl without a usable number just opens WhatsApp", () => {
  assert.equal(whatsappChatUrl(""), "https://wa.me/");
  assert.equal(whatsappChatUrl(null), "https://wa.me/");
});

const orderBase = {
  orderNumber: "42",
  items: [],
  totalPrice: 1000,
  customerName: "Айгуль",
  customerPhone: "0700123456",
  branchName: "Филиал №1",
  branchAddress: "ул. Киевская 1",
  storeName: "Магазин",
  statusToken: "tok",
  origin: "https://x.app",
};

test("buildOrderMessage for pickup says the customer will pick the order up", () => {
  const text = buildOrderMessage({ ...orderBase, delivery: { method: "pickup", address: null, time: null, courierPhone: null } });
  assert.ok(text.includes("Самовывоз"));
  assert.ok(!text.includes("Адрес доставки"));
});

test("buildOrderMessage does not promise the seller a cancel option (owner/admin only since 29.09)", () => {
  const text = buildOrderMessage(orderBase);
  assert.ok(!/отмен/i.test(text), "seller message must not mention cancelling");
  assert.ok(text.includes("https://x.app/o/tok"));
});

test("buildOrderMessage for delivery lists the address, time and courier phone", () => {
  const text = buildOrderMessage({ ...orderBase, delivery: { method: "delivery", address: "мкр Асанбай 12", time: "после 18:00", courierPhone: "0555123456" } });
  for (const part of ["Доставка", "Адрес доставки: мкр Асанбай 12", "Желательное время: после 18:00", "Телефон для курьера: 0555123456"]) {
    assert.ok(text.includes(part), `missing ${part}`);
  }
  const noExtras = buildOrderMessage({ ...orderBase, delivery: { method: "delivery", address: "мкр Асанбай 12", time: null, courierPhone: null } });
  assert.ok(!noExtras.includes("Желательное время") && !noExtras.includes("Телефон для курьера"));
});
