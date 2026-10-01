// Бронь остатков заказами (docs/superpowers/specs/2026-10-01-stock-reserve-design.md). Само списание/возврат делает
// база (supabase/stock_reserve.sql); здесь — расчёты для загрузки остатков и подсказок в админке.

/** Заказы, товар которых ещё лежит в филиале (не выдан и не отменён). */
export const OPEN_ORDER_STATUSES: readonly string[] = ["sent", "confirmed", "paid", "shipped"];

export type ReservingOrder = { status: string; branchId: string | null; items: { productId?: string; quantity: number }[] };

/** Сколько штук отложено открытыми заказами: "productId|branchId" → количество. */
export function reservedByProductBranch(orders: ReservingOrder[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of orders) {
    if (!o.branchId || !OPEN_ORDER_STATUSES.includes(o.status)) continue;
    for (const it of o.items) {
      if (!it.productId || !(it.quantity > 0)) continue;
      const key = `${it.productId}|${o.branchId}`;
      out.set(key, (out.get(key) ?? 0) + it.quantity);
    }
  }
  return out;
}

/** Остаток из файла минус отложенное под невыданные заказы (программа магазина о них не знает). */
export function netStock(fileQty: number, reserved: number): number {
  return Math.max(0, fileQty - reserved);
}

/** Сколько есть для этого заказа: если заказ уже забронировал товар, его штуки в остатке не видны — прибавляем. */
export function availableForOrder(current: number | null, itemQty: number, stockReserved: boolean): number | null {
  if (current === null) return null;
  return stockReserved ? current + itemQty : current;
}
