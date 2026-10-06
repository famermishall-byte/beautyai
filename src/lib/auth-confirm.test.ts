import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmTarget, parseConfirmType, parseTokenHash } from "./auth-confirm";

test("parseConfirmType: только email, signup и recovery", () => {
  assert.equal(parseConfirmType("email"), "email");
  assert.equal(parseConfirmType("signup"), "signup");
  assert.equal(parseConfirmType("recovery"), "recovery");
  assert.equal(parseConfirmType("invite"), null);
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

test("confirmTarget: восстановление пароля ведёт на страницу нового пароля, подтверждение почты — на вход", () => {
  assert.equal(confirmTarget("recovery"), "/reset-password");
  assert.equal(confirmTarget("email"), "/login");
  assert.equal(confirmTarget("signup"), "/login");
});
