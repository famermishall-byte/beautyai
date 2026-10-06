import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDER_COLUMNS, ORDER_SELECT } from "./supabase";

test("колонки заказа для сессии пользователя не содержат секретных ссылок", () => {
  const cols = ORDER_COLUMNS.split(",").map((c) => c.trim());
  assert.ok(!cols.includes("status_token"));
  assert.ok(!cols.includes("courier_token"));
  assert.ok(!ORDER_SELECT.includes("*, "), "select(*) по orders вернул бы закрытые колонки");
});

test("ORDER_SELECT = колонки заказа + филиал", () => {
  assert.equal(ORDER_SELECT, `${ORDER_COLUMNS}, branches(*)`);
});

test("в GRANT из supabase/order_tokens_private.sql те же колонки, что в ORDER_COLUMNS", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync("supabase/order_tokens_private.sql", "utf8");
  const grant = sql.match(/^grant select \(([\s\S]*?)\)\s*on public\.orders/m)?.[1] ?? "";
  const fromSql = grant.split(",").map((c) => c.trim()).filter(Boolean).sort();
  const fromCode = ORDER_COLUMNS.split(",").map((c) => c.trim()).sort();
  assert.deepEqual(fromSql, fromCode);
});
