import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestMapping } from "./autoMap";
import { SYNC_IMPORT_FIELDS } from "./syncFields";
import { parseOptionalPrice } from "./validate";

test("a wholesale column left of 'Цена, сом' is not taken as the price", () => {
  const m = suggestMapping(["Название", "Оптовая цена", "Цена, сом"]);
  assert.equal(m.price, 2);
  assert.equal(m.wholesalePrice, 1);
});

test("plain 'Цена' + 'Опт' headers map to price and wholesale", () => {
  const m = suggestMapping(["Товар", "Цена", "Опт"]);
  assert.equal(m.price, 1);
  assert.equal(m.wholesalePrice, 2);
});

test("the sync wizard knows the wholesale column too", () => {
  const m = suggestMapping(["Название", "Цена опт", "Розничная цена"], SYNC_IMPORT_FIELDS);
  assert.equal(m.price, 2);
  assert.equal(m.wholesalePrice, 1);
});

test("parseOptionalPrice: empty / junk / non-positive → null", () => {
  assert.equal(parseOptionalPrice("1 250,50"), 1250.5);
  assert.equal(parseOptionalPrice(""), null);
  assert.equal(parseOptionalPrice("нет"), null);
  assert.equal(parseOptionalPrice("0"), null);
});
