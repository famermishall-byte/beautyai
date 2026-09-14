import * as XLSX from "xlsx";
import type { RawTable } from "../types";

/** Reads an .xlsx/.xls file's first sheet into a plain headers+rows table. */
export function parseXlsxToRawTable(buffer: ArrayBuffer): RawTable {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });

  if (raw.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = raw[0].map((cell) => String(cell ?? "").trim());
  const rows = raw
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => headers.map((_, i) => String(row[i] ?? "").trim()));

  return { headers, rows };
}
