import type { CartItem } from "@/types";

// Оптовые цены (docs/superpowers/specs/2026-09-29-wholesale-pricing-design.md). Чистые функции — одни и те же
// на сервере (корзина, заказ) и в клиенте (показ), чтобы сумма на экране совпадала с заказом.

export type WholesaleMode = "off" | "percent" | "per_product";
export type WholesaleSettings = { mode: WholesaleMode; percent: number | null; thresholdUsd: number; usdRate: number | null };
export type WholesaleSummary = { threshold: number | null; qualifies: boolean; retailTotal: number; savings: number; remaining: number };

const MODES: WholesaleMode[] = ["off", "percent", "per_product"];
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function mapWholesaleSettings(row: Record<string, unknown> | null | undefined): WholesaleSettings {
  const mode = MODES.includes(row?.wholesale_mode as WholesaleMode) ? (row!.wholesale_mode as WholesaleMode) : "off";
  return { mode, percent: num(row?.wholesale_percent), thresholdUsd: num(row?.wholesale_threshold_usd) ?? 1000, usdRate: num(row?.usd_rate) };
}

/** Порог в сомах; null — опт не действует (выключен, нет курса или для «%» не задан процент). */
export function thresholdSom(s: WholesaleSettings): number | null {
  if (s.mode === "off" || !s.usdRate || s.usdRate <= 0 || s.thresholdUsd <= 0) return null;
  if (s.mode === "percent" && !(s.percent && s.percent > 0 && s.percent < 100)) return null;
  return Math.round(s.thresholdUsd * s.usdRate);
}

/** Оптовая цена единицы (до сравнения с акцией); null — у товара опта нет. `basePrice` — каталожная цена до акции. */
export function wholesaleCandidate(basePrice: number, ownWholesale: number | null, s: WholesaleSettings): number | null {
  if (s.mode === "percent" && s.percent) return Math.round((basePrice * (100 - s.percent)) / 100);
  if (s.mode === "per_product") return ownWholesale && ownWholesale > 0 ? ownWholesale : null;
  return null;
}

/** Пересчёт корзины: от порога (по обычной цене отмеченных) отмеченные товары идут по min(обычная, оптовая). */
export function applyWholesale(items: CartItem[], threshold: number | null): { items: CartItem[]; summary: WholesaleSummary } {
  const retailTotal = items.filter((i) => i.selected).reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const qualifies = threshold !== null && retailTotal >= threshold;
  if (!qualifies) {
    return {
      items,
      summary: { threshold, qualifies: false, retailTotal, savings: 0, remaining: threshold === null ? 0 : Math.max(0, threshold - retailTotal) },
    };
  }
  let savings = 0;
  const priced = items.map((i) => {
    const w = i.product.wholesalePrice;
    if (!i.selected || w === null || w === undefined || w >= i.product.price) return i;
    savings += (i.product.price - w) * i.quantity;
    return { ...i, product: { ...i.product, retailPrice: i.product.price, price: w } };
  });
  return { items: priced, summary: { threshold, qualifies: true, retailTotal, savings, remaining: 0 } };
}
