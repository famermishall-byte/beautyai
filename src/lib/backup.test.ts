import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKUP_TABLES, backupFileName, fetchAllRows } from "./backup";

test("backupFileName: дата по Бишкеку (UTC+6)", () => {
  assert.equal(backupFileName(new Date("2026-10-03T12:00:00Z")), "beauty-backup-2026-10-03.json");
  // 20:00 UTC уже следующий день в Бишкеке
  assert.equal(backupFileName(new Date("2026-10-03T20:00:00Z")), "beauty-backup-2026-10-04.json");
});

test("fetchAllRows: собирает все страницы, включая неполную последнюю", async () => {
  const all = Array.from({ length: 25 }, (_, i) => i);
  const calls: [number, number][] = [];
  const rows = await fetchAllRows(async (from, to) => {
    calls.push([from, to]);
    return all.slice(from, to + 1);
  }, 10);
  assert.deepEqual(rows, all);
  assert.deepEqual(calls, [[0, 9], [10, 19], [20, 29]]);
});

test("fetchAllRows: ровно целое число страниц — читает ещё одну пустую и останавливается", async () => {
  const all = Array.from({ length: 20 }, (_, i) => i);
  let calls = 0;
  const rows = await fetchAllRows(async (from, to) => {
    calls++;
    return all.slice(from, to + 1);
  }, 10);
  assert.equal(rows.length, 20);
  assert.equal(calls, 3);
});

test("fetchAllRows: пустая таблица", async () => {
  assert.deepEqual(await fetchAllRows(async () => [], 10), []);
});

test("BACKUP_TABLES: без повторов, без ключей устройств, у каждой есть столбцы сортировки", () => {
  const names = BACKUP_TABLES.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(!names.includes("push_subscriptions"));
  assert.ok(BACKUP_TABLES.every((t) => t.orderBy.length > 0));
});
