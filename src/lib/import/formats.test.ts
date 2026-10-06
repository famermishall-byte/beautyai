import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseXlsxToRawTable } from "./formats/xlsx";
import { parseCsvToRawTable } from "./formats/csv";

function toBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

test("xlsx: первый лист читается в заголовки и строки, пустые строки пропускаются", () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Артикул", "Название", "Цена"],
    ["A-1", "Крем для лица", 1200],
    ["", "", ""],
    ["A-2", "Тоник", 850],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Лист1");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  assert.deepEqual(parseXlsxToRawTable(out), {
    headers: ["Артикул", "Название", "Цена"],
    rows: [
      ["A-1", "Крем для лица", "1200"],
      ["A-2", "Тоник", "850"],
    ],
  });
});

test("csv: читается так же, значения — строки, лишние пробелы убираются", () => {
  const table = parseCsvToRawTable(toBuffer("Артикул,Название,Цена\nA-1, Крем ,1200\nA-2,Тоник,850\n"));
  assert.deepEqual(table, {
    headers: ["Артикул", "Название", "Цена"],
    rows: [
      ["A-1", "Крем", "1200"],
      ["A-2", "Тоник", "850"],
    ],
  });
});

test("пустой файл не падает: одна пустая колонка и ни одной строки (так же вела себя xlsx 0.18.5)", () => {
  assert.deepEqual(parseCsvToRawTable(toBuffer("")), { headers: [""], rows: [] });
});

test("заголовок __proto__ в файле не портит общий объект (prototype pollution)", () => {
  parseCsvToRawTable(toBuffer("__proto__,polluted\nx,y\n"));
  parseCsvToRawTable(toBuffer("a,b\n__proto__,polluted\n"));
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"), false);
});
