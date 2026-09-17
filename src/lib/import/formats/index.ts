import type { ImportFormat, RawTable } from "../types";
import { parseXlsxToRawTable } from "./xlsx";
import { parseCsvToRawTable } from "./csv";
import { parseJsonToRawTable } from "./json";

/**
 * The extensibility point for new file formats. To support a new format
 * (XML, a different program's export, …):
 *   1. Write `formats/<name>.ts` exporting `parse<Name>ToRawTable(buffer) => RawTable`.
 *   2. Register it below and add its extension(s) to `detectFormat`.
 * Nothing in autoMap.ts, validate.ts, or the import UI needs to change —
 * they only ever see the resulting RawTable.
 */
const FORMAT_PARSERS: Record<ImportFormat, (buffer: ArrayBuffer) => RawTable> = {
  xlsx: parseXlsxToRawTable,
  csv: parseCsvToRawTable,
  json: parseJsonToRawTable,
};

const EXTENSION_TO_FORMAT: Record<string, ImportFormat> = {
  xlsx: "xlsx",
  xls: "xlsx",
  csv: "csv",
  json: "json",
};

export function detectFormat(filename: string): ImportFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_FORMAT[ext] ?? null;
}

/** For API sources, which have a Content-Type header instead of a filename. */
export function detectFormatFromContentType(contentType: string | null): ImportFormat | null {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("json")) return "json";
  if (type.includes("csv") || type.includes("text/plain")) return "csv";
  if (type.includes("spreadsheet") || type.includes("excel")) return "xlsx";
  return null;
}

export function parseFile(format: ImportFormat, buffer: ArrayBuffer): RawTable {
  return FORMAT_PARSERS[format](buffer);
}

export const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_TO_FORMAT).map((ext) => `.${ext}`);
