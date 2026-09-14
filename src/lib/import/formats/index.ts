import type { ImportFormat, RawTable } from "../types";
import { parseXlsxToRawTable } from "./xlsx";

/**
 * The extensibility point for new file formats. To support a new format
 * (CSV, a different program's export, …):
 *   1. Write `formats/<name>.ts` exporting `parse<Name>ToRawTable(buffer) => RawTable`.
 *   2. Register it below and add its extension(s) to `detectFormat`.
 * Nothing in autoMap.ts, validate.ts, or the import UI needs to change —
 * they only ever see the resulting RawTable.
 */
const FORMAT_PARSERS: Record<ImportFormat, (buffer: ArrayBuffer) => RawTable> = {
  xlsx: parseXlsxToRawTable,
};

const EXTENSION_TO_FORMAT: Record<string, ImportFormat> = {
  xlsx: "xlsx",
  xls: "xlsx",
};

export function detectFormat(filename: string): ImportFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_FORMAT[ext] ?? null;
}

export function parseFile(format: ImportFormat, buffer: ArrayBuffer): RawTable {
  return FORMAT_PARSERS[format](buffer);
}

export const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_TO_FORMAT).map((ext) => `.${ext}`);
