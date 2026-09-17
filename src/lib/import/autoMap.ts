import { IMPORT_FIELDS } from "./fields";
import type { ColumnMapping, FieldKey } from "./types";

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

type ImportField = { key: FieldKey; required: boolean; aliases: string[] };

/**
 * Guesses which file column holds each Beauty field, by matching header
 * text against each field's known aliases. Required fields are matched
 * first so they win any ambiguity; a column already claimed by one field
 * won't also be suggested for another.
 *
 * `fields` defaults to the catalog-upload wizard's field list; the
 * stock-sync wizard passes its own superset (see syncFields.ts) without
 * touching this function's default behavior.
 */
export function suggestMapping(headers: string[], fields: ImportField[] = IMPORT_FIELDS): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {};
  const claimed = new Set<number>();

  const orderedFields = [...fields].sort((a, b) => Number(b.required) - Number(a.required));

  for (const field of orderedFields) {
    // Exact match first ("цена" === "цена"), then substring containment
    // ("розничная цена" contains "цена") as a fallback.
    let matchIndex = normalized.findIndex((h, i) => !claimed.has(i) && field.aliases.includes(h));
    if (matchIndex === -1) {
      matchIndex = normalized.findIndex(
        (h, i) => !claimed.has(i) && h.length > 0 && field.aliases.some((alias) => h.includes(alias))
      );
    }
    if (matchIndex !== -1) {
      mapping[field.key] = matchIndex;
      claimed.add(matchIndex);
    }
  }

  return mapping;
}
