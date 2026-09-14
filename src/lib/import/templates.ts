import type { ColumnMapping, FieldKey } from "./types";

/**
 * Saved templates store the mapping by header TEXT, not column index —
 * index would break the moment a store's export adds/reorders a column.
 * These convert between that portable form and the index-based
 * ColumnMapping the rest of the import pipeline works with.
 */
export type HeaderMapping = Partial<Record<FieldKey, string>>;

export function mappingToHeaderNames(mapping: ColumnMapping, headers: string[]): HeaderMapping {
  const result: HeaderMapping = {};
  for (const [field, index] of Object.entries(mapping) as [FieldKey, number][]) {
    if (headers[index] !== undefined) result[field] = headers[index];
  }
  return result;
}

export function mappingFromHeaderNames(headerMapping: HeaderMapping, headers: string[]): ColumnMapping {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const result: ColumnMapping = {};
  for (const [field, headerText] of Object.entries(headerMapping) as [FieldKey, string][]) {
    const index = normalized.indexOf(headerText.trim().toLowerCase());
    if (index !== -1) result[field] = index;
  }
  return result;
}
