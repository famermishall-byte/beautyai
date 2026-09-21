import type { OrderItem } from "@/types";

// The seller (or an admin) can only REDUCE the quantity of a line — 0 means "not available".
// The same rules are enforced in SQL (supabase/order_edit.sql) for the WhatsApp link.

/** What was originally ordered for this line (before any reduction). */
export function orderedQty(item: OrderItem): number {
  return item.orderedQuantity ?? item.quantity;
}

export function orderTotal(items: OrderItem[], quantities?: number[]): number {
  return items.reduce((sum, it, i) => sum + it.price * (quantities ? quantities[i] : it.quantity), 0);
}

/** True when the order was changed after it was placed (something removed or reduced). */
export function isReduced(items: OrderItem[]): boolean {
  return items.some((it) => it.quantity < orderedQty(it));
}

export function validQuantities(items: OrderItem[], quantities: unknown): quantities is number[] {
  return (
    Array.isArray(quantities) &&
    quantities.length === items.length &&
    quantities.every((q, i) => Number.isInteger(q) && q >= 0 && q <= orderedQty(items[i]))
  );
}

/** Items after applying new quantities; keeps `orderedQuantity` so the change stays visible. */
export function applyQuantities(items: OrderItem[], quantities: number[]): OrderItem[] {
  return items.map((it, i) => ({ ...it, quantity: quantities[i], orderedQuantity: orderedQty(it) }));
}

/** Lines that were removed or reduced, as short text for the message to the customer. */
export function describeChanges(items: OrderItem[]): string[] {
  return items
    .filter((it) => it.quantity < orderedQty(it))
    .map((it) => (it.quantity === 0 ? `${it.name} — нет в наличии` : `${it.name} — осталось ${it.quantity} из ${orderedQty(it)}`));
}
