import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfirmType, parseTokenHash } from "./auth-confirm";

test("parseConfirmType: только email и signup", () => {
  assert.equal(parseConfirmType("email"), "email");
  assert.equal(parseConfirmType("signup"), "signup");
  assert.equal(parseConfirmType("recovery"), null);
  assert.equal(parseConfirmType("magiclink"), null);
  assert.equal(parseConfirmType(""), null);
  assert.equal(parseConfirmType(null), null);
});

test("parseTokenHash: отсекает пустое, с пробелами и слишком длинное", () => {
  assert.equal(parseTokenHash("abc123def"), "abc123def");
  assert.equal(parseTokenHash(null), null);
  assert.equal(parseTokenHash(""), null);
  assert.equal(parseTokenHash("a b"), null);
  assert.equal(parseTokenHash("x".repeat(201)), null);
  assert.equal(parseTokenHash("x".repeat(200)), "x".repeat(200));
});
