import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_CATEGORIES, categoryOptions, filterByCategory } from "./category-filter";

const items = [
  { id: "1", category: "Уход за лицом" },
  { id: "2", category: "Шампуни" },
  { id: "3", category: " Уход за лицом " },
  { id: "4", category: "" },
  { id: "5", category: null },
  { id: "6", category: "Кремы" },
];

test("categoryOptions lists every category found in the products, alphabetically, with counts; blank ones go last", () => {
  assert.deepEqual(categoryOptions(items), [
    { name: "Кремы", count: 1 },
    { name: "Уход за лицом", count: 2 },
    { name: "Шампуни", count: 1 },
    { name: "", count: 2 },
  ]);
  assert.deepEqual(categoryOptions([]), []);
});

test("filterByCategory keeps only that category; 'all' keeps everything; '' picks products without a category", () => {
  assert.deepEqual(filterByCategory(items, "Уход за лицом").map((i) => i.id), ["1", "3"]);
  assert.equal(filterByCategory(items, ALL_CATEGORIES).length, 6);
  assert.deepEqual(filterByCategory(items, "").map((i) => i.id), ["4", "5"]);
  assert.deepEqual(filterByCategory(items, "Нет такой"), []);
});
