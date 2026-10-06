import { test } from "node:test";
import assert from "node:assert/strict";
import { NEW_ACCOUNT_MS, isNewAccount } from "./new-account";

const NOW = Date.parse("2026-10-07T12:00:00Z");

test("аккаунт, созданный сегодня и вчера, — новый", () => {
  assert.equal(isNewAccount("2026-10-07T11:00:00Z", NOW), true);
  assert.equal(isNewAccount("2026-10-06T12:30:00Z", NOW), true);
});

test("аккаунт старше двух суток — не новый (старых клиентов вопросы не трогают)", () => {
  assert.equal(isNewAccount("2026-10-03T12:00:00Z", NOW), false);
  assert.equal(isNewAccount(new Date(NOW - NEW_ACCOUNT_MS - 1000).toISOString(), NOW), false);
});

test("нет даты или мусор — не новый", () => {
  assert.equal(isNewAccount(null, NOW), false);
  assert.equal(isNewAccount(undefined, NOW), false);
  assert.equal(isNewAccount("не дата", NOW), false);
});

test("небольшая разница часов устройства допустима, большая — нет", () => {
  assert.equal(isNewAccount("2026-10-07T13:00:00Z", NOW), true);
  assert.equal(isNewAccount("2026-10-10T12:00:00Z", NOW), false);
});
