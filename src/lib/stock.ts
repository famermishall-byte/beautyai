// How stock quantities are presented. Customers see a status, never an exact number: the
// numbers come from the shop's own accounting/cash system and can lag behind real sales.

/** Up to and including this many pieces a product is shown as "low" ("Мало"). */
export const LOW_STOCK_MAX = 3;

export type StockStatus = "out" | "low" | "ok" | "unknown";

export function stockStatus(quantity: number | null | undefined): StockStatus {
  if (quantity === null || quantity === undefined) return "unknown";
  if (quantity <= 0) return "out";
  return quantity <= LOW_STOCK_MAX ? "low" : "ok";
}

// Display text lives in messages: stock.status.out / low / ok / unknown.
