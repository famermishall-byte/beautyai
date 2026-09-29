import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDateInput, formatTimeInput, inDateRange, parseDateInput, parseTimeInput, presetRange, toDateInput } from "./date-range";

test("formatDateInput keeps only digits and puts the dots in as you type", () => {
  assert.equal(formatDateInput("0"), "0");
  assert.equal(formatDateInput("01"), "01");
  assert.equal(formatDateInput("010"), "01.0");
  assert.equal(formatDateInput("0109"), "01.09");
  assert.equal(formatDateInput("01092026"), "01.09.2026");
  assert.equal(formatDateInput("01.09.2026"), "01.09.2026");
  assert.equal(formatDateInput("01/09/2026999"), "01.09.2026");
  assert.equal(formatDateInput("ab"), "");
});

test("parseDateInput accepts only real dates in ДД.ММ.ГГГГ", () => {
  const d = parseDateInput("01.09.2026")!;
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 8, 1, 0]);
  assert.equal(parseDateInput("29.02.2028")?.getDate(), 29);
  assert.equal(parseDateInput("29.02.2027"), null);
  assert.equal(parseDateInput("31.04.2026"), null);
  assert.equal(parseDateInput("00.01.2026"), null);
  assert.equal(parseDateInput("01.13.2026"), null);
  assert.equal(parseDateInput("01.09.26"), null);
  assert.equal(parseDateInput("01.09.1999"), null);
  assert.equal(parseDateInput(""), null);
});

test("toDateInput formats a date back as ДД.ММ.ГГГГ", () => {
  assert.equal(toDateInput(new Date(2026, 0, 5)), "05.01.2026");
});

test("presetRange fills the fields for the quick buttons, counting today in", () => {
  const now = new Date(2026, 8, 29, 15, 30);
  assert.deepEqual(presetRange("today", now), { from: "29.09.2026", to: "29.09.2026" });
  assert.deepEqual(presetRange("7", now), { from: "23.09.2026", to: "29.09.2026" });
  assert.deepEqual(presetRange("30", now), { from: "31.08.2026", to: "29.09.2026" });
  assert.deepEqual(presetRange("all", now), { from: "", to: "" });
});

test("inDateRange includes both whole days; an empty side means no limit", () => {
  const from = parseDateInput("01.09.2026");
  const to = parseDateInput("30.09.2026");
  assert.equal(inDateRange(new Date(2026, 8, 1, 0, 0).toISOString(), from, to), true);
  assert.equal(inDateRange(new Date(2026, 8, 30, 23, 59).toISOString(), from, to), true);
  assert.equal(inDateRange(new Date(2026, 9, 1, 0, 0).toISOString(), from, to), false);
  assert.equal(inDateRange(new Date(2026, 7, 31, 23, 59).toISOString(), from, to), false);
  assert.equal(inDateRange(new Date(2020, 0, 1).toISOString(), null, to), true);
  assert.equal(inDateRange(new Date(2030, 0, 1).toISOString(), from, null), true);
});

test("formatTimeInput keeps digits and puts the colon in: 1030 → 10:30", () => {
  assert.equal(formatTimeInput("1"), "1");
  assert.equal(formatTimeInput("10"), "10");
  assert.equal(formatTimeInput("103"), "10:3");
  assert.equal(formatTimeInput("1030"), "10:30");
  assert.equal(formatTimeInput("10:30"), "10:30");
  assert.equal(formatTimeInput("10305"), "10:30");
});

test("parseTimeInput accepts only real times ЧЧ:ММ", () => {
  assert.deepEqual(parseTimeInput("09:05"), { hours: 9, minutes: 5 });
  assert.deepEqual(parseTimeInput("23:59"), { hours: 23, minutes: 59 });
  assert.equal(parseTimeInput("24:00"), null);
  assert.equal(parseTimeInput("12:60"), null);
  assert.equal(parseTimeInput("9:05"), null);
  assert.equal(parseTimeInput(""), null);
});
