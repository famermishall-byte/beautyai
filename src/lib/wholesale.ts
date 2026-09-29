import type { CartItem } from "@/types";

// Оптовые цены (docs/superpowers/specs/2026-09-29-wholesale-pricing-design.md). Чистые функции — одни и те же
// на сервере (корзина, заказ) и в клиенте (показ), чтобы сумма на экране совпадала с заказом.

export type WholesaleMode = "off" | "percent" | "per_product";
export type WholesaleSettings = { mode: WholesaleMode; percent: number | null; thresholdUsd: number; usdRate: number | null };
/**
 * qualifies — порог набран; applied — хоть одна цена реально снижена (только тогда заказ помечается оптовым);
 * wholesaleTotal — сколько отмеченные стоили бы по оптовым ценам (подсказка в корзине до порога).
 */
export type WholesaleSummary = {
  threshold: number | null;
  qualifies: boolean;
  applied: boolean;
  retailTotal: number;
  wholesaleTotal: number;
  savings: number;
  remaining: number;
};

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
  const unitAtWholesale = (i: CartItem) => {
    const w = i.product.wholesalePrice;
    return threshold !== null && w !== null && w !== undefined && w < i.product.price ? w : i.product.price;
  };
  const wholesaleTotal = items.filter((i) => i.selected).reduce((sum, i) => sum + unitAtWholesale(i) * i.quantity, 0);
  if (!qualifies) {
    return {
      items,
      summary: { threshold, qualifies: false, applied: false, retailTotal, wholesaleTotal, savings: 0, remaining: threshold === null ? 0 : Math.max(0, threshold - retailTotal) },
    };
  }
  let savings = 0;
  const priced = items.map((i) => {
    const w = i.product.wholesalePrice;
    if (!i.selected || w === null || w === undefined || w >= i.product.price) return i;
    savings += (i.product.price - w) * i.quantity;
    return { ...i, product: { ...i.product, retailPrice: i.product.price, price: w } };
  });
  return { items: priced, summary: { threshold, qualifies: true, applied: savings > 0, retailTotal, wholesaleTotal, savings, remaining: 0 } };
}

const positive = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Проверка формы «Оптовые цены» (PUT /api/admin/wholesale). Процент сохраняется в любом режиме, чтобы не
 * пропадал при переключении способа; порог и курс обязательны, только когда опт включён.
 */
export function parseWholesaleInput(body: Record<string, unknown>): { ok: true; settings: WholesaleSettings } | { ok: false; error: string } {
  const mode = body.mode as WholesaleMode;
  if (!MODES.includes(mode)) return { ok: false, error: "Неизвестный способ расчёта опта." };
  const percentRaw = positive(body.percent);
  const percent = percentRaw !== null && percentRaw >= 1 && percentRaw <= 99 ? percentRaw : null;
  const thresholdUsd = positive(body.thresholdUsd);
  const usdRate = positive(body.usdRate);
  if (mode !== "off") {
    if (!thresholdUsd) return { ok: false, error: "Укажите порог опта в долларах (больше нуля)." };
    if (!usdRate) return { ok: false, error: "Укажите курс доллара." };
    if (mode === "percent" && percent === null) return { ok: false, error: "Укажите процент скидки от 1 до 99." };
  }
  return { ok: true, settings: { mode, percent, thresholdUsd: thresholdUsd ?? 1000, usdRate } };
}
