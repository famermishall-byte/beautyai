import { createHash } from "crypto";
import type { ColumnMapping, RawTable } from "./types";
import { parsePrice } from "./validate";

export type ExistingProductRef = {
  id: string;
  sku: string;
  barcode: string | null;
  externalId: string | null;
};

export type SyncBranch = { id: string; name: string };

type NewProductInput = {
  name: string;
  price: number;
  sku: string;
  barcode: string | null;
  externalId: string | null;
  brand: string;
  category: string;
  description: string;
  characteristics: string;
  purpose: string;
  imageUrl: string;
};

/** Only fields the source row actually had a value for — never blank out an existing field. */
type ProductUpdateInput = Partial<Omit<NewProductInput, "sku" | "name">>;

type BranchQuantity = { branchId: string; quantity: number };

export type SyncRowOutcome =
  | { kind: "error"; rowNumber: number; errors: string[] }
  | { kind: "review"; rowNumber: number; reason: string; rawRow: Record<string, string> }
  | {
      kind: "create";
      /** Usually one row — several when the same new product appears once per branch in the file (see below). */
      rowNumbers: number[];
      product: NewProductInput;
      stocks: BranchQuantity[];
    }
  | {
      kind: "update";
      rowNumber: number;
      productId: string;
      changes: ProductUpdateInput;
      branchId: string | null;
      quantity: number | null;
    };

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseQuantity(value: string): number | null {
  if (!value.trim()) return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

/**
 * A stable stand-in identifier for rows with no SKU/barcode/external id at
 * all — deterministic (same name+brand always hashes the same way), so a
 * product created this way is still confidently re-matched on the next
 * sync, instead of guessing by fuzzy name similarity.
 */
function syntheticSku(name: string, brand: string): string {
  const hash = createHash("sha1").update(`${normalize(name)}|${normalize(brand)}`).digest("hex").slice(0, 10);
  return `GEN-${hash.toUpperCase()}`;
}

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  return Object.fromEntries(headers.map((h, i) => [h || `col_${i}`, row[i] ?? ""]));
}

/**
 * Plans what to do with each row of a source file/API response — pure
 * function, no DB access, so it's easy to reason about and test. The caller
 * (an API route) executes the actual inserts/updates/branch-stock writes and
 * review-queue rows based on this plan.
 *
 * Matching priority: external id -> barcode -> sku (including a previously
 * generated synthetic sku) — the first confident hit wins. No match at all
 * means a genuinely new product, never a guessed merge.
 *
 * A real store's export very often lists the SAME product once per branch
 * (one row for "ЦУМ", one for "Азия Молл", …) — when that product is brand
 * new, those rows must become ONE product with several branch-stock entries,
 * not several products fighting over the same sku. Rows matching an
 * already-existing DB product don't need this: each just becomes its own
 * "update" outcome (one per branch), which is safe to apply independently.
 */
export function planSyncRows(
  table: RawTable,
  mapping: ColumnMapping,
  ctx: {
    existingProducts: ExistingProductRef[];
    branches: SyncBranch[];
    /** Branch stock applies to when the file has no per-row branch column. */
    defaultBranchId: string | null;
  }
): SyncRowOutcome[] {
  const byExternalId = new Map(
    ctx.existingProducts.filter((p) => p.externalId).map((p) => [p.externalId as string, p])
  );
  const byBarcode = new Map(ctx.existingProducts.filter((p) => p.barcode).map((p) => [p.barcode as string, p]));
  const bySku = new Map(ctx.existingProducts.map((p) => [p.sku, p]));
  const branchByName = new Map(ctx.branches.map((b) => [normalize(b.name), b]));

  const get = (row: string[], field: keyof ColumnMapping): string => {
    const index = mapping[field];
    return index !== undefined ? (row[index] ?? "").trim() : "";
  };

  const outcomes: SyncRowOutcome[] = [];
  const pendingCreates = new Map<
    string,
    { rowNumbers: number[]; product: NewProductInput; stocks: BranchQuantity[] }
  >();

  table.rows.forEach((row, i) => {
    const rowNumber = i + 2;

    const name = get(row, "name");
    const priceRaw = get(row, "price");
    const price = parsePrice(priceRaw);
    const errors: string[] = [];
    if (!name) errors.push("Отсутствует название товара.");
    if (!priceRaw) errors.push("Не указана цена.");
    else if (Number.isNaN(price)) errors.push(`Некорректная цена «${priceRaw}».`);
    if (errors.length > 0) {
      outcomes.push({ kind: "error", rowNumber, errors });
      return;
    }

    const externalId = get(row, "externalId") || null;
    const barcode = get(row, "barcode") || null;
    let sku = get(row, "sku") || null;
    const brandRaw = get(row, "brand");
    const categoryRaw = get(row, "category");
    const description = get(row, "description");
    const characteristics = get(row, "characteristics");
    const purpose = get(row, "purpose");
    const imageUrl = get(row, "imageUrl");
    const quantity = parseQuantity(get(row, "quantity"));

    if (!externalId && !barcode && !sku) {
      sku = syntheticSku(name, brandRaw || "Без бренда");
    }

    const branchNameRaw = get(row, "branchName");
    let branchId = ctx.defaultBranchId;
    if (branchNameRaw) {
      const found = branchByName.get(normalize(branchNameRaw));
      if (!found) {
        outcomes.push({
          kind: "review",
          rowNumber,
          reason: `Филиал «${branchNameRaw}» не найден среди филиалов магазина — добавьте такой филиал или исправьте название в источнике.`,
          rawRow: rowToRecord(table.headers, row),
        });
        return;
      }
      branchId = found.id;
    }
    if (branchId === null && quantity !== null) {
      outcomes.push({
        kind: "review",
        rowNumber,
        reason:
          "В файле нет колонки с филиалом, и для этого источника не выбран филиал по умолчанию — непонятно, куда записать остаток.",
        rawRow: rowToRecord(table.headers, row),
      });
      return;
    }

    const match =
      (externalId && byExternalId.get(externalId)) ||
      (barcode && byBarcode.get(barcode)) ||
      (sku && bySku.get(sku)) ||
      null;

    if (match) {
      const changes: ProductUpdateInput = { price };
      if (brandRaw) changes.brand = brandRaw;
      if (categoryRaw) changes.category = categoryRaw;
      if (description) changes.description = description;
      if (characteristics) changes.characteristics = characteristics;
      if (purpose) changes.purpose = purpose;
      if (imageUrl) changes.imageUrl = imageUrl;
      if (barcode) changes.barcode = barcode;
      if (externalId) changes.externalId = externalId;
      outcomes.push({ kind: "update", rowNumber, productId: match.id, changes, branchId, quantity });
      return;
    }

    // Genuinely new — group by sku (real or synthetic) so the same product
    // listed once per branch becomes one product with several stock rows.
    const groupKey = sku as string;
    const stockEntry: BranchQuantity[] = branchId && quantity !== null ? [{ branchId, quantity }] : [];
    const existingGroup = pendingCreates.get(groupKey);
    if (existingGroup) {
      existingGroup.rowNumbers.push(rowNumber);
      existingGroup.stocks.push(...stockEntry);
    } else {
      pendingCreates.set(groupKey, {
        rowNumbers: [rowNumber],
        product: {
          name,
          price,
          sku: groupKey,
          barcode,
          externalId,
          brand: brandRaw || "Без бренда",
          category: categoryRaw || "Без категории",
          description,
          characteristics,
          purpose,
          imageUrl,
        },
        stocks: stockEntry,
      });
    }
  });

  for (const group of pendingCreates.values()) {
    outcomes.push({ kind: "create", rowNumbers: group.rowNumbers, product: group.product, stocks: group.stocks });
  }

  return outcomes;
}

export type SyncSummary = {
  processed: number;
  created: number;
  updated: number;
  needsReview: number;
  errors: number;
};

export function summarizeSyncPlan(outcomes: SyncRowOutcome[]): SyncSummary {
  const summary: SyncSummary = { processed: 0, created: 0, updated: 0, needsReview: 0, errors: 0 };
  for (const outcome of outcomes) {
    if (outcome.kind === "create") {
      summary.processed += outcome.rowNumbers.length;
      summary.created++;
    } else {
      summary.processed++;
      if (outcome.kind === "update") summary.updated++;
      else if (outcome.kind === "review") summary.needsReview++;
      else summary.errors++;
    }
  }
  return summary;
}
