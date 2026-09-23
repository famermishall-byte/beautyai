import type { Product, Promotion } from "@/types";
import { isVisibleToCustomers } from "@/lib/promo-status";

/**
 * Если у товара есть активная акция — подставляет её цену вместо базовой, и (если show_old_price)
 * добавляет зачёркнутую старую цену через attributes.oldPrice — тот же путь, что ProductCard уже
 * умеет рисовать. Используется в /api/products, /api/products/[id] и /api/products/bestsellers,
 * так что скидка видна одинаково везде, не только в отдельном блоке «Акции».
 */
export function applyActivePromotion(
  product: Product,
  promotionsByProductId: Map<string, Promotion>
): Product {
  const promotion = promotionsByProductId.get(product.id);
  if (!promotion || !isVisibleToCustomers(promotion)) {
    return product;
  }
  return {
    ...product,
    price: promotion.newPrice,
    attributes: {
      ...product.attributes,
      ...(promotion.showOldPrice ? { oldPrice: promotion.oldPrice } : {}),
    },
  };
}

/** Map productId -> активная(ые) акция(и) этого магазина, для applyActivePromotion. Берёт первую
 * попавшуюся эффективно-активную акцию на товар (на товар не должно быть двух одновременных акций —
 * это не проверяется в базе, ответственность за это на администраторе при создании). */
export function indexPromotionsByProduct(promotions: Promotion[]): Map<string, Promotion> {
  const map = new Map<string, Promotion>();
  for (const promotion of promotions) {
    if (!promotion.productId) continue;
    if (!isVisibleToCustomers(promotion)) continue;
    if (!map.has(promotion.productId)) map.set(promotion.productId, promotion);
  }
  return map;
}
