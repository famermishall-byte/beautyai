import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldShowSplash } from "./splash-cookie";

test("первое открытие или приложение было закрыто (метки активности нет) — заставка показывается", () => {
  assert.equal(shouldShowSplash({ hasActiveMark: false, forced: false }), true);
});

test("приложение открыто (метка есть): обновление страницы, переходы, вход — без заставки", () => {
  assert.equal(shouldShowSplash({ hasActiveMark: true, forced: false }), false);
});

test("переход из админки в магазин показывает заставку всегда, даже при живой метке", () => {
  assert.equal(shouldShowSplash({ hasActiveMark: true, forced: true }), true);
  assert.equal(shouldShowSplash({ hasActiveMark: false, forced: true }), true);
});
