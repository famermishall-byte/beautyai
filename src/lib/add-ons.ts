/**
 * «Добавить к заказу» над оформлением в корзине (просьба владельца 29.09): недорогие товары в один клик.
 * Решение владельца: до 500 сом, сначала популярные (порядок даёт /api/products/bestsellers), только в наличии
 * и то, чего ещё нет в корзине.
 */
export const ADD_ON_MAX_PRICE = 500;
export const ADD_ON_LIMIT = 8;

export function pickAddOns<T extends { id: string; price: number; inStock: boolean }>(products: T[], inCart: Set<string>, limit = ADD_ON_LIMIT): T[] {
  return products.filter((p) => p.inStock && p.price <= ADD_ON_MAX_PRICE && !inCart.has(p.id)).slice(0, limit);
}
