import { test } from "node:test";
import assert from "node:assert/strict";
import { ADD_ON_MAX_PRICE, pickAddOns } from "./add-ons";

const p = (id: string, price: number, inStock = true) => ({ id, price, inStock });

test("pickAddOns keeps the given (popularity) order, only cheap in-stock products that are not in the cart", () => {
  const list = [p("a", 300), p("b", 900), p("c", 499), p("d", 200, false), p("e", 500), p("f", 120)];
  assert.deepEqual(pickAddOns(list, new Set(["c"])).map((x) => x.id), ["a", "e", "f"]);
});

test("pickAddOns returns at most the limit", () => {
  const list = Array.from({ length: 12 }, (_, i) => p(String(i), 100));
  assert.equal(pickAddOns(list, new Set()).length, 8);
  assert.equal(pickAddOns(list, new Set(), 3).length, 3);
});

test("the cheap limit is 500 som", () => {
  assert.equal(ADD_ON_MAX_PRICE, 500);
});
