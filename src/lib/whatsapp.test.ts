import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrderMessage, whatsappChatUrl } from "./whatsapp";

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

test("buildOrderMessage for delivery lists the address, time and courier phone", () => {
  const text = buildOrderMessage({ ...orderBase, delivery: { method: "delivery", address: "мкр Асанбай 12", time: "после 18:00", courierPhone: "0555123456" } });
  for (const part of ["Доставка", "Адрес доставки: мкр Асанбай 12", "Желательное время: после 18:00", "Телефон для курьера: 0555123456"]) {
    assert.ok(text.includes(part), `missing ${part}`);
  }
  const noExtras = buildOrderMessage({ ...orderBase, delivery: { method: "delivery", address: "мкр Асанбай 12", time: null, courierPhone: null } });
  assert.ok(!noExtras.includes("Желательное время") && !noExtras.includes("Телефон для курьера"));
});
