import { test } from "node:test";
import assert from "node:assert/strict";
import type { CartItem, Product } from "../types";
import { applyWholesale, mapWholesaleSettings, parseWholesaleInput, thresholdSom, wholesaleCandidate, type WholesaleSettings } from "./wholesale";

const s = (over: Partial<WholesaleSettings> = {}): WholesaleSettings => ({ mode: "percent", percent: 20, thresholdUsd: 1000, usdRate: 87.5, ...over });
const product = (id: string, price: number, wholesalePrice: number | null): Product => ({
  id, sku: id, barcode: null, name: id, brand: "B", category: "C", price, description: null, characteristics: null,
  purpose: null, inStock: true, imageUrl: null, wholesalePrice,
});
const item = (id: string, price: number, wholesale: number | null, quantity = 1, selected = true): CartItem => ({ product: product(id, price, wholesale), quantity, selected });

test("thresholdSom converts dollars by the rate; off / no rate / percent without percent → no wholesale", () => {
  assert.equal(thresholdSom(s()), 87500);
  assert.equal(thresholdSom(s({ mode: "off" })), null);
  assert.equal(thresholdSom(s({ usdRate: null })), null);
  assert.equal(thresholdSom(s({ percent: null })), null);
  assert.equal(thresholdSom(s({ mode: "per_product", percent: null })), 87500);
});

test("wholesaleCandidate: percent rounds to whole som; per_product uses the product's own price", () => {
  assert.equal(wholesaleCandidate(999, null, s({ percent: 15 })), 849);
  assert.equal(wholesaleCandidate(1000, 700, s({ mode: "per_product" })), 700);
  assert.equal(wholesaleCandidate(1000, null, s({ mode: "per_product" })), null);
  assert.equal(wholesaleCandidate(1000, 700, s({ mode: "off" })), null);
});

test("below the threshold nothing changes and remaining is reported", () => {
  const { items, summary } = applyWholesale([item("a", 30000, 24000, 2)], 87500);
  assert.equal(items[0].product.price, 30000);
  assert.deepEqual(summary, { threshold: 87500, qualifies: false, applied: false, retailTotal: 60000, wholesaleTotal: 48000, savings: 0, remaining: 27500 });
});

test("exactly at the threshold wholesale applies to every selected item", () => {
  const { items, summary } = applyWholesale([item("a", 50000, 40000), item("b", 37500, 30000)], 87500);
  assert.equal(summary.qualifies, true);
  assert.deepEqual(items.map((i) => [i.product.price, i.product.retailPrice]), [[40000, 50000], [30000, 37500]]);
  assert.equal(summary.savings, 17500);
  assert.equal(summary.remaining, 0);
});

test("unselected items neither count toward the threshold nor get wholesale prices", () => {
  const { items, summary } = applyWholesale([item("a", 80000, 60000), item("b", 50000, 40000, 1, false)], 87500);
  assert.equal(summary.qualifies, false);
  assert.equal(items[1].product.price, 50000);
});

test("a promo price cheaper than wholesale is kept; savings never go negative", () => {
  const { items, summary } = applyWholesale([item("a", 90000, 95000)], 87500);
  assert.equal(items[0].product.price, 90000);
  assert.equal(summary.savings, 0);
});

test("no threshold (wholesale off) → untouched, qualifies false", () => {
  const { summary } = applyWholesale([item("a", 100000, 50000)], null);
  assert.deepEqual(summary, { threshold: null, qualifies: false, applied: false, retailTotal: 100000, wholesaleTotal: 100000, savings: 0, remaining: 0 });
});

test("mapWholesaleSettings reads DB numerics (strings) and defaults", () => {
  assert.deepEqual(mapWholesaleSettings({ wholesale_mode: "percent", wholesale_percent: "20", wholesale_threshold_usd: "1000", usd_rate: "87.5" }), s());
  assert.deepEqual(mapWholesaleSettings(null), { mode: "off", percent: null, thresholdUsd: 1000, usdRate: null });
  assert.equal(mapWholesaleSettings({ wholesale_mode: "junk" }).mode, "off");
});

test("applied is true only when some price actually dropped (the order is then marked wholesale)", () => {
  assert.equal(applyWholesale([item("a", 90000, 60000)], 87500).summary.applied, true);
  assert.equal(applyWholesale([item("a", 90000, null)], 87500).summary.applied, false);
  assert.equal(applyWholesale([item("a", 90000, 95000)], 87500).summary.applied, false);
});

test("parseWholesaleInput keeps the percent in any mode and only requires threshold/rate when wholesale is on", () => {
  assert.deepEqual(parseWholesaleInput({ mode: "per_product", percent: 20, thresholdUsd: 1000, usdRate: "87,5" }), { ok: true, settings: s({ mode: "per_product" }) });
  assert.deepEqual(parseWholesaleInput({ mode: "off", percent: 20, thresholdUsd: "", usdRate: "" }), { ok: true, settings: s({ mode: "off", usdRate: null }) });
  assert.deepEqual(parseWholesaleInput({ mode: "percent", percent: "20", thresholdUsd: "1 000", usdRate: "87.5" }), { ok: true, settings: s() });
});

test("parseWholesaleInput rejects what the form says it rejects", () => {
  assert.equal(parseWholesaleInput({ mode: "percent", percent: 0.5, thresholdUsd: 1000, usdRate: 87.5 }).ok, false);
  assert.equal(parseWholesaleInput({ mode: "percent", percent: 100, thresholdUsd: 1000, usdRate: 87.5 }).ok, false);
  assert.equal(parseWholesaleInput({ mode: "percent", percent: 20, thresholdUsd: 1000, usdRate: "" }).ok, false);
  assert.equal(parseWholesaleInput({ mode: "per_product", percent: null, thresholdUsd: 0, usdRate: 87.5 }).ok, false);
  assert.equal(parseWholesaleInput({ mode: "junk" }).ok, false);
});

test("wholesaleTotal previews the selected items at wholesale prices before the threshold is reached", () => {
  const { summary } = applyWholesale([item("a", 1000, 800, 2), item("b", 500, null), item("c", 900, 950), item("d", 700, 500, 1, false)], 87500);
  assert.equal(summary.retailTotal, 3400);
  assert.equal(summary.wholesaleTotal, 1600 + 500 + 900);
});
