import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// sessionStorage в Node нет — подставляем простую заглушку до загрузки модуля
const store = new Map<string, string>();
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

import { markSkipBuyAgain, consumeSkipBuyAgain } from "./session-flags";

beforeEach(() => store.clear());

test("пометка «не показывать окно купить снова» одноразовая и только для своего товара", () => {
  assert.equal(consumeSkipBuyAgain("a"), false);
  markSkipBuyAgain("a");
  assert.equal(consumeSkipBuyAgain("b"), false);
  assert.equal(consumeSkipBuyAgain("a"), true);
  assert.equal(consumeSkipBuyAgain("a"), false);
});

test("несколько товаров не мешают друг другу", () => {
  markSkipBuyAgain("a");
  markSkipBuyAgain("b");
  assert.equal(consumeSkipBuyAgain("b"), true);
  assert.equal(consumeSkipBuyAgain("a"), true);
});
