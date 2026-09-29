import { test } from "node:test";
import assert from "node:assert/strict";
import { broadcastMessage, broadcastTtl, customerOrderMessage, newOrderMessage, staffRecipient } from "./messages.ts";

test("newOrderMessage: number, total, delivery method and a link to the orders", () => {
  assert.deepEqual(newOrderMessage({ number: "48", total_price: 2010, delivery_method: "delivery", customer_name: "Айгуль" }), {
    title: "Новый заказ №48",
    body: "2 010 сом · Доставка · Айгуль",
    url: "/admin/orders",
    tag: "order-48",
  });
  assert.equal(newOrderMessage({ number: "7", total_price: 500, delivery_method: "pickup", customer_name: "Б" }).body, "500 сом · Самовывоз · Б");
});

test("customerOrderMessage: one text per status; delivered vs handed over; edited", () => {
  const o = (status: string, delivery_method = "delivery") => ({ number: "48", status, delivery_method });
  assert.equal(customerOrderMessage("order_status", o("paid"))?.body, "Оплата получена — спасибо!");
  assert.equal(customerOrderMessage("order_status", o("shipped"))?.body, "Заказ в пути 🚚");
  assert.equal(customerOrderMessage("order_status", o("completed"))?.body, "Заказ доставлен. Спасибо за покупку!");
  assert.equal(customerOrderMessage("order_status", o("completed", "pickup"))?.body, "Заказ выдан. Спасибо за покупку!");
  assert.equal(customerOrderMessage("order_status", o("cancelled"))?.body, "Заказ отменён.");
  assert.equal(customerOrderMessage("order_edited", o("sent"))?.body, "Продавец изменил заказ — проверьте состав и сумму.");
  assert.equal(customerOrderMessage("order_status", o("sent")), null);
  const m = customerOrderMessage("order_status", o("paid"))!;
  assert.equal(m.title, "Заказ №48");
  assert.equal(m.url, "/orders");
});

test("staffRecipient: owner/admin get every order of the store, a branch manager only their branch", () => {
  const order = { store_id: "s1", branch_id: "b1" };
  assert.equal(staffRecipient({ role: "owner", store_id: "s1", branch_id: null }, order), true);
  assert.equal(staffRecipient({ role: "admin", store_id: "s1", branch_id: null }, order), true);
  assert.equal(staffRecipient({ role: "branch_manager", store_id: "s1", branch_id: "b1" }, order), true);
  assert.equal(staffRecipient({ role: "branch_manager", store_id: "s1", branch_id: "b2" }, order), false);
  assert.equal(staffRecipient({ role: "owner", store_id: "s2", branch_id: null }, order), false);
  assert.equal(staffRecipient({ role: "user", store_id: "s1", branch_id: null }, order), false);
});

test("broadcastMessage adds «До 05.10» when there is an end date; default link is home", () => {
  const b = { id: "b1", title: "Скидка −20%", body: "На все кремы", url: null as string | null, valid_until: "2026-10-05" as string | null };
  assert.deepEqual(broadcastMessage(b), { title: "Скидка −20%", body: "На все кремы · До 05.10", url: "/", tag: "broadcast-b1" });
  assert.equal(broadcastMessage({ ...b, valid_until: null, url: "/catalog" }).body, "На все кремы");
  assert.equal(broadcastMessage({ ...b, valid_until: null, url: "/catalog" }).url, "/catalog");
});

test("broadcastTtl: until the end of the «до» day in Bishkek (UTC+6), at most 28 days; no end date → 24 h; past → 0", () => {
  const now = new Date("2026-09-29T08:00:00Z"); // 14:00 in Bishkek
  // end of 30.09 in Bishkek = 2026-09-30T18:00Z → 34 h
  assert.equal(broadcastTtl("2026-09-30", now), 34 * 3600);
  assert.equal(broadcastTtl(null, now), 24 * 3600);
  assert.equal(broadcastTtl("2026-12-31", now), 28 * 24 * 3600);
  assert.equal(broadcastTtl("2026-09-28", now), 0);
});
