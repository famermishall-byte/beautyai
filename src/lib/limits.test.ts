import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMITS, asText, feedbackRateError, orderRateError, quantityError, textLimitError } from "./limits";

test("asText: обрезает пробелы, не строка → пусто", () => {
  assert.equal(asText("  Анна  "), "Анна");
  assert.equal(asText(undefined), "");
  assert.equal(asText(123), "");
  assert.equal(asText({}), "");
});

test("textLimitError: ровно по границе можно, на один символ больше — нельзя", () => {
  assert.equal(textLimitError("Имя", "а".repeat(LIMITS.customerName), LIMITS.customerName), null);
  assert.match(textLimitError("Имя", "а".repeat(LIMITS.customerName + 1), LIMITS.customerName) ?? "", /не длиннее 100 символов/);
});

test("textLimitError: эмодзи считается одним символом", () => {
  assert.equal(textLimitError("Сообщение", "😀".repeat(10), 10), null);
  assert.notEqual(textLimitError("Сообщение", "😀".repeat(11), 10), null);
});

test("orderRateError: ниже лимитов можно; 5-й заказ в час — последний; 6-й — нельзя", () => {
  assert.equal(orderRateError({ lastHour: 0, open: 0 }), null);
  assert.equal(orderRateError({ lastHour: LIMITS.ordersPerHour - 1, open: 3 }), null);
  assert.match(orderRateError({ lastHour: LIMITS.ordersPerHour, open: 0 }) ?? "", /за короткое время/);
});

test("orderRateError: 10 незавершённых — нельзя, 9 — можно", () => {
  assert.equal(orderRateError({ lastHour: 1, open: LIMITS.openOrders - 1 }), null);
  assert.match(orderRateError({ lastHour: 1, open: LIMITS.openOrders }) ?? "", /неоформленных/);
});

test("feedbackRateError", () => {
  assert.equal(feedbackRateError(LIMITS.feedbackPerHour - 1), null);
  assert.notEqual(feedbackRateError(LIMITS.feedbackPerHour), null);
});

test("quantityError: 1..9999; крупная оптовая позиция проходит", () => {
  assert.equal(quantityError(1), null);
  assert.equal(quantityError(1000), null);
  assert.equal(quantityError(LIMITS.maxQuantity), null);
  assert.notEqual(quantityError(LIMITS.maxQuantity + 1), null);
  assert.notEqual(quantityError(0), null);
  assert.notEqual(quantityError(1.5), null);
});
