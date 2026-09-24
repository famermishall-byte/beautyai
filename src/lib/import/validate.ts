import { IMPORT_FIELDS } from "./fields";
import type { ColumnMapping, FieldKey, ImportRowResult, RawTable } from "./types";

export function parsePrice(value: string): number {
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseInStock(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return true; // not specified — assume in stock, matches prior importer behavior
  const asNumber = Number(text.replace(",", "."));
  if (Number.isFinite(asNumber)) return asNumber > 0;
  return !["нет", "нет в наличии", "закончился", "false", "no", "0"].includes(text);
}

function randomSku(): string {
  return `AUTO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

/** Fields that must have a column assigned before we can even attempt to build rows. */
export function missingRequiredColumns(
  mapping: ColumnMapping,
  fields: { key: FieldKey; required: boolean; label: string }[] = IMPORT_FIELDS
): string[] {
  return fields.filter((f) => f.required && mapping[f.key] === undefined).map((f) => f.label);
}

/**
 * Turns each raw row into either a ready-to-import product or a list of
 * human-readable problems with it. Rows with errors are never silently
 * dropped — callers show them separately and let the user import only the
 * clean rows.
 */
export function buildImportRows(
  table: RawTable,
  mapping: ColumnMapping,
  existingSkus: Set<string>
): ImportRowResult[] {
  const get = (fieldRow: string[], field: keyof ColumnMapping): string => {
    const index = mapping[field];
    return index !== undefined ? (fieldRow[index] ?? "").trim() : "";
  };

  const seenInFile = new Set<string>();
  const results: ImportRowResult[] = [];

  table.rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const errors: string[] = [];

    const name = get(row, "name");
    if (!name) errors.push("Отсутствует название товара.");

    const priceRaw = get(row, "price");
    const price = parsePrice(priceRaw);
    if (!priceRaw) errors.push("Не указана цена.");
    else if (Number.isNaN(price)) errors.push(`Некорректная цена «${priceRaw}».`);

    let sku = get(row, "sku");
    if (sku) {
      if (existingSkus.has(sku) || seenInFile.has(sku)) {
        errors.push(`Дублирующийся товар — артикул «${sku}» уже встречается.`);
      }
      seenInFile.add(sku);
    } else {
      sku = randomSku();
    }

    const preview = {
      Название: name,
      Цена: priceRaw,
      Артикул: get(row, "sku") || "—",
      Остаток: get(row, "inStock") || "—",
      Бренд: get(row, "brand") || "—",
    };

    if (errors.length > 0) {
      results.push({ status: "error", rowNumber, errors, preview });
      return;
    }

    results.push({
      status: "ok",
      rowNumber,
      product: {
        name,
        price,
        sku,
        inStock: parseInStock(get(row, "inStock")),
        brand: get(row, "brand") || "Без бренда",
        category: get(row, "category") || "Без категории",
        description: get(row, "description"),
        characteristics: get(row, "characteristics"),
        purpose: get(row, "purpose"),
        imageUrl: get(row, "imageUrl"),
      },
    });
  });

  return results;
}
