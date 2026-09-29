import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeContactPhone } from "./feedback";

test("normalizeContactPhone keeps what the customer typed, trimmed and with single spaces", () => {
  assert.equal(normalizeContactPhone("  0700 123  456 "), "0700 123 456");
  assert.equal(normalizeContactPhone("+996 (700) 12-34-56"), "+996 (700) 12-34-56");
  assert.equal(normalizeContactPhone("700123456"), "700123456");
});

test("normalizeContactPhone rejects empty, too short, too long and non-phone input", () => {
  assert.equal(normalizeContactPhone(""), null);
  assert.equal(normalizeContactPhone(undefined), null);
  assert.equal(normalizeContactPhone(12345), null);
  assert.equal(normalizeContactPhone("12345678"), null);
  assert.equal(normalizeContactPhone("1234567890123456"), null);
  assert.equal(normalizeContactPhone("0700abc123456"), null);
});
