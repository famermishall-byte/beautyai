import { test } from "node:test";
import assert from "node:assert/strict";
import type { CartItem, Product } from "../types";
import { applyDelta, quantityOf, removeProduct, setSelected, cartTotals, parseLegacyCart, orderLinesFromCart } from "./cart-logic";

const product = (id: string, price = 100): Product => ({
  id, sku: `SKU-${id}`, barcode: null, name: `Товар ${id}`, brand: "B", category: "C", price,
  description: null, characteristics: null, purpose: null, inStock: true, imageUrl: null,
});
const item = (id: string, quantity: number, selected = true, price = 100): CartItem => ({ product: product(id, price), quantity, selected });

test("applyDelta adds a new product selected with the delta as quantity", () => {
  assert.deepEqual(applyDelta([], product("a"), 1), [{ product: product("a"), quantity: 1, selected: true }]);
});

test("applyDelta increments an existing product and keeps its checkbox", () => {
  const next = applyDelta([item("a", 2, false)], product("a"), 1);
  assert.equal(next[0].quantity, 3);
  assert.equal(next[0].selected, false);
});

test("applyDelta to zero removes the product; negative delta on a missing product is a no-op", () => {
  assert.deepEqual(applyDelta([item("a", 1)], product("a"), -1), []);
  assert.deepEqual(applyDelta([], product("a"), -1), []);
});

test("quantityOf returns 0 for a product not in the cart", () => {
  assert.equal(quantityOf([item("a", 2)], "a"), 2);
  assert.equal(quantityOf([item("a", 2)], "b"), 0);
});

test("removeProduct drops only that product", () => {
  assert.deepEqual(removeProduct([item("a", 1), item("b", 1)], "a").map((i) => i.product.id), ["b"]);
});

test("setSelected toggles listed ids or all", () => {
  const items = [item("a", 1), item("b", 1)];
  assert.deepEqual(setSelected(items, ["a"], false).map((i) => i.selected), [false, true]);
  assert.deepEqual(setSelected(items, "all", false).map((i) => i.selected), [false, false]);
});

test("cartTotals counts everything but prices only selected items", () => {
  const totals = cartTotals([item("a", 2, true, 100), item("b", 3, false, 50)]);
  assert.deepEqual(totals, { totalCount: 5, selectedCount: 2, selectedTotal: 200 });
});

test("parseLegacyCart reads the old localStorage shape, sums duplicates, drops junk", () => {
  const raw = JSON.stringify([
    { product: { id: "a" }, quantity: 2 },
    { product: { id: "a" }, quantity: 1 },
    { product: { id: "b" }, quantity: 0 },
    { product: {}, quantity: 3 },
    "junk",
  ]);
  assert.deepEqual(parseLegacyCart(raw), [{ productId: "a", quantity: 3 }]);
  assert.deepEqual(parseLegacyCart(null), []);
  assert.deepEqual(parseLegacyCart("{not json"), []);
});

test("orderLinesFromCart uses only selected items and the (server-side) product price", () => {
  const { lines, total } = orderLinesFromCart([item("a", 2, true, 80), item("b", 1, false, 999)]);
  assert.equal(total, 160);
  assert.deepEqual(lines, [{ name: "Товар a", brand: "B", price: 80, quantity: 2, orderedQuantity: 2, productId: "a", sku: "SKU-a" }]);
});
