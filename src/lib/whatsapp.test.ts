import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappChatUrl } from "./whatsapp";

test("whatsappChatUrl adds Kyrgyzstan's code to local numbers", () => {
  assert.equal(whatsappChatUrl("0700 123 456"), "https://wa.me/996700123456");
  assert.equal(whatsappChatUrl("700123456"), "https://wa.me/996700123456");
});

test("whatsappChatUrl keeps a full international number", () => {
  assert.equal(whatsappChatUrl("+996 700 123-456"), "https://wa.me/996700123456");
});

test("whatsappChatUrl without a usable number just opens WhatsApp", () => {
  assert.equal(whatsappChatUrl(""), "https://wa.me/");
  assert.equal(whatsappChatUrl(null), "https://wa.me/");
});
