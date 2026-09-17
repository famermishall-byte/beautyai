import type { RawTable } from "../types";

/** Common wrapper keys APIs use around the actual list, e.g. `{ "data": [...] }`. */
const LIST_WRAPPER_KEYS = ["data", "items", "products", "rows", "results", "list"];

function findItemArray(parsed: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;
  for (const key of LIST_WRAPPER_KEYS) {
    if (Array.isArray(obj[key])) {
      return (obj[key] as unknown[]).filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      );
    }
  }
  // Fall back to the first array-valued property, whatever it's called.
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
  }
  return null;
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Reads a JSON export — an array of objects, or an object wrapping one under
 * a common key like "data"/"items"/"products" — into a plain headers+rows
 * table. Column order follows first-appearance across all items so no field
 * present only on later rows gets dropped.
 */
export function parseJsonToRawTable(buffer: ArrayBuffer): RawTable {
  const text = new TextDecoder("utf-8").decode(buffer);
  const parsed = JSON.parse(text);
  const items = findItemArray(parsed);
  if (!items || items.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  const rows = items.map((item) => headers.map((key) => stringifyCell(item[key])));

  return { headers, rows };
}
