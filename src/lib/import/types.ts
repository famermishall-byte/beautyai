// Shared types for the catalog import pipeline. Kept format-agnostic on
// purpose: everything from `RawTable` onward (mapping, validation, preview)
// works the same no matter which file format produced the table, so adding
// a new source format only means writing one new function that returns a
// RawTable — nothing downstream needs to change.

/** A parsed spreadsheet, reduced to plain strings — no format-specific detail survives past this point. */
export type RawTable = {
  headers: string[];
  rows: string[][];
};

export type ImportFormat = "xlsx";

/** The canonical set of product fields Beauty understands, independent of what any given file calls them. */
export type FieldKey =
  | "name"
  | "price"
  | "sku"
  | "inStock"
  | "brand"
  | "category"
  | "description"
  | "characteristics"
  | "purpose"
  | "imageUrl";

/** Field → index of the column in RawTable.headers/rows that holds it (unmapped fields are simply absent). */
export type ColumnMapping = Partial<Record<FieldKey, number>>;

export type ParsedImportProduct = {
  name: string;
  price: number;
  sku: string;
  inStock: boolean;
  brand: string;
  category: string;
  description: string;
  characteristics: string;
  purpose: string;
  imageUrl: string;
};

export type ImportRowResult =
  | { status: "ok"; rowNumber: number; product: ParsedImportProduct }
  | { status: "error"; rowNumber: number; errors: string[]; preview: Record<string, string> };
