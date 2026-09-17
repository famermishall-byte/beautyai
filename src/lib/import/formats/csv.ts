import * as XLSX from "xlsx";
import type { RawTable } from "../types";
import { rawTableFromSheet } from "./xlsx";

/** Reads a CSV (or semicolon/tab-separated) export into a plain headers+rows table. */
export function parseCsvToRawTable(buffer: ArrayBuffer): RawTable {
  const text = new TextDecoder("utf-8").decode(buffer);
  const workbook = XLSX.read(text, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return rawTableFromSheet(sheet);
}
