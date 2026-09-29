import { test } from "node:test";
import assert from "node:assert/strict";
import { addressComplete, buildCourierMessage, formatDeliveryAddress, isSale, mapsUrl, parseDeliveryInput, sellerActions } from "./delivery";

test("formatDeliveryAddress joins city, street, house and flat; the flat is optional", () => {
  assert.equal(formatDeliveryAddress({ city: " Бишкек ", street: "Токтогула", house: "100", flat: "5" }), "г. Бишкек, ул. Токтогула, д. 100, кв. 5");
  assert.equal(formatDeliveryAddress({ city: "Ош", street: "мкр Анар", house: "12/3", flat: "" }), "г. Ош, мкр Анар, д. 12/3");
  // what the customer already typed is not doubled
  assert.equal(formatDeliveryAddress({ city: "г. Бишкек", street: "ул. Киевская", house: "д. 69", flat: "кв. 2" }), "г. Бишкек, ул. Киевская, д. 69, кв. 2");
});

test("addressComplete needs city, street and house", () => {
  assert.equal(addressComplete({ city: "Бишкек", street: "Токтогула", house: "1", flat: "" }), true);
  assert.equal(addressComplete({ city: "Бишкек", street: "Токтогула", house: " ", flat: "5" }), false);
  assert.equal(addressComplete({ city: "", street: "Токтогула", house: "1", flat: "" }), false);
});

test("parseDeliveryInput: pickup needs nothing and drops stray delivery fields", () => {
  assert.deepEqual(parseDeliveryInput({ deliveryMethod: "pickup", deliveryAddress: "ул. Токтогула 1" }), {
    ok: true,
    delivery: { method: "pickup", address: null, time: null, courierPhone: null },
  });
  assert.deepEqual(parseDeliveryInput({}), { ok: true, delivery: { method: "pickup", address: null, time: null, courierPhone: null } });
});

test("parseDeliveryInput: delivery requires an address; time and courier phone are optional", () => {
  assert.deepEqual(parseDeliveryInput({ deliveryMethod: "delivery", deliveryAddress: "  ул. Токтогула 1, кв 5 ", deliveryTime: " после 18:00 ", courierPhone: "0555 12 34 56" }), {
    ok: true,
    delivery: { method: "delivery", address: "ул. Токтогула 1, кв 5", time: "после 18:00", courierPhone: "0555 12 34 56" },
  });
  assert.deepEqual(parseDeliveryInput({ deliveryMethod: "delivery", deliveryAddress: "мкр Асанбай 12", deliveryTime: "", courierPhone: "" }), {
    ok: true,
    delivery: { method: "delivery", address: "мкр Асанбай 12", time: null, courierPhone: null },
  });
  assert.equal(parseDeliveryInput({ deliveryMethod: "delivery", deliveryAddress: "" }).ok, false);
  assert.equal(parseDeliveryInput({ deliveryMethod: "delivery", deliveryAddress: "ул" }).ok, false);
  assert.equal(parseDeliveryInput({ deliveryMethod: "delivery", deliveryAddress: "x".repeat(301) }).ok, false);
  assert.equal(parseDeliveryInput({ deliveryMethod: "delivery", deliveryAddress: "ул. Токтогула 1", deliveryTime: "x".repeat(101) }).ok, false);
  assert.equal(parseDeliveryInput({ deliveryMethod: "delivery", deliveryAddress: "ул. Токтогула 1", courierPhone: "12" }).ok, false);
  assert.equal(parseDeliveryInput({ deliveryMethod: "courier" }).ok, false);
});

const o = (status: string, deliveryMethod: "pickup" | "delivery", paidAt: string | null = null) => ({ status, deliveryMethod, paidAt });

test("sellerActions for pickup: pay → hand over", () => {
  assert.deepEqual(sellerActions(o("sent", "pickup")), ["paid"]);
  assert.deepEqual(sellerActions(o("confirmed", "pickup")), ["paid"]);
  assert.deepEqual(sellerActions(o("paid", "pickup", "t")), ["handedOver"]);
  assert.deepEqual(sellerActions(o("completed", "pickup", "t")), []);
  assert.deepEqual(sellerActions(o("cancelled", "pickup")), []);
});

test("sellerActions for delivery: can ship before or after payment, then delivered", () => {
  assert.deepEqual(sellerActions(o("sent", "delivery")), ["paid", "ship"]);
  assert.deepEqual(sellerActions(o("paid", "delivery", "t")), ["ship"]);
  assert.deepEqual(sellerActions(o("shipped", "delivery")), ["delivered"]);
  assert.deepEqual(sellerActions(o("shipped", "delivery", "t")), ["delivered"]);
  assert.deepEqual(sellerActions(o("completed", "delivery", "t")), []);
});

test("isSale: paid and completed count; shipped only once paid", () => {
  assert.equal(isSale(o("paid", "pickup", "t")), true);
  assert.equal(isSale(o("completed", "delivery", "t")), true);
  assert.equal(isSale(o("shipped", "delivery", "t")), true);
  assert.equal(isSale(o("shipped", "delivery")), false);
  assert.equal(isSale(o("sent", "delivery")), false);
  assert.equal(isSale(o("cancelled", "delivery", "t")), false);
});

test("mapsUrl searches the address on the map", () => {
  assert.equal(mapsUrl("ул. Токтогула 1, Бишкек"), "https://www.google.com/maps/search/?api=1&query=%D1%83%D0%BB.%20%D0%A2%D0%BE%D0%BA%D1%82%D0%BE%D0%B3%D1%83%D0%BB%D0%B0%201%2C%20%D0%91%D0%B8%D1%88%D0%BA%D0%B5%D0%BA");
});

test("buildCourierMessage has the address, time, phones, amount to collect and the courier link", () => {
  const text = buildCourierMessage({
    number: "42",
    customerName: "Айгуль",
    customerPhone: "0700123456",
    courierPhone: "0555123456",
    address: "ул. Токтогула 1",
    time: "после 18:00",
    totalPrice: 5400,
    paid: false,
    link: "https://x.app/c/abc",
  });
  for (const part of ["#42", "ул. Токтогула 1", "после 18:00", "Айгуль", "0700123456", "0555123456", "https://x.app/c/abc"]) {
    assert.ok(text.includes(part), `missing ${part}`);
  }
  assert.match(text, /5\s400 сом/);
  const paid = buildCourierMessage({ number: "7", customerName: "А", customerPhone: "1", courierPhone: null, address: "a", time: null, totalPrice: 100, paid: true, link: "l" });
  assert.ok(paid.includes("оплачен"));
  assert.ok(!paid.includes("Время"));
});
