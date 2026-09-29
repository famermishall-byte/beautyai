import type { CartItem, Product } from "@/types";

// Чистые функции корзины — без React и без сети, чтобы их можно было проверять тестами
// (src/lib/cart-logic.test.ts). Ими пользуются cart-context.tsx (оптимистичные изменения)
// и /api/orders (строки заказа из корзины).

export type OrderLine = {
  name: string;
  brand: string;
  price: number;
  quantity: number;
  orderedQuantity: number;
  productId: string;
  sku: string;
};

export function applyDelta(items: CartItem[], product: Product, delta: number): CartItem[] {
  const existing = items.find((i) => i.product.id === product.id);
  if (!existing) return delta > 0 ? [...items, { product, quantity: delta, selected: true }] : items;
  const quantity = existing.quantity + delta;
  if (quantity <= 0) return removeProduct(items, product.id);
  return items.map((i) => (i.product.id === product.id ? { ...i, quantity } : i));
}

export function quantityOf(items: CartItem[], productId: string): number {
  return items.find((i) => i.product.id === productId)?.quantity ?? 0;
}

export function removeProduct(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.product.id !== productId);
}

export function setSelected(items: CartItem[], productIds: string[] | "all", selected: boolean): CartItem[] {
  return items.map((i) => (productIds === "all" || productIds.includes(i.product.id) ? { ...i, selected } : i));
}

export function cartTotals(items: CartItem[]) {
  let totalCount = 0;
  let selectedCount = 0;
  let selectedTotal = 0;
  for (const i of items) {
    totalCount += i.quantity;
    if (!i.selected) continue;
    selectedCount += i.quantity;
    selectedTotal += i.quantity * i.product.price;
  }
  return { totalCount, selectedCount, selectedTotal };
}

/** Старая корзина жила в localStorage["beautyai-cart"] как CartItem[] без `selected` — переносим её в аккаунт. */
export function parseLegacyCart(raw: string | null): { productId: string; quantity: number }[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const byId = new Map<string, number>();
  for (const entry of parsed) {
    const id = (entry as { product?: { id?: unknown } })?.product?.id;
    const quantity = (entry as { quantity?: unknown })?.quantity;
    if (typeof id !== "string" || !id || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) continue;
    byId.set(id, (byId.get(id) ?? 0) + quantity);
  }
  return [...byId].map(([productId, quantity]) => ({ productId, quantity }));
}

export function orderLinesFromCart(items: CartItem[]): { lines: OrderLine[]; total: number } {
  const lines = items
    .filter((i) => i.selected)
    .map((i) => ({
      name: i.product.name,
      brand: i.product.brand,
      price: i.product.price,
      quantity: i.quantity,
      orderedQuantity: i.quantity,
      productId: i.product.id,
      sku: i.product.sku,
    }));
  return { lines, total: lines.reduce((sum, l) => sum + l.price * l.quantity, 0) };
}
