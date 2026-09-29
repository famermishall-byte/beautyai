# Оптовые цены — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** От порога суммы заказа (в $ по курсу) все отмеченные товары в корзине идут по оптовой цене; способ расчёта (выкл / % на всё / своя цена у товара) выбирает админ.

**Architecture:** Чистое ядро `src/lib/wholesale.ts` (порог в сомах, оптовая цена единицы, пересчёт корзины) — одно и то же на сервере (`loadCart` → `/api/cart`, `/api/orders`) и в клиенте (отображение). Настройки — колонки `stores`, своя оптовая цена — `products.wholesale_price` (из Excel), метка заказа — `orders.is_wholesale`. Оптовая цена в каталог НЕ отдаётся (`mapProduct` не трогаем) — только корзине и админке.

**Tech Stack:** Next.js 16, React 19, next-intl (ru + ky), Supabase (RLS), node:test через tsx.

**Spec:** `docs/superpowers/specs/2026-09-29-wholesale-pricing-design.md`

## Global Constraints

- Новых npm-зависимостей нет. Тесты — `npm test` (список файлов в `package.json` → `scripts.test`).
- Цена от клиента не принимается; всё считает сервер через те же функции `wholesale.ts`.
- Порог проверяется по сумме ОТМЕЧЕННЫХ товаров по обычной цене (с акцией); итог каждого товара в оптовом заказе = min(обычная с акцией, оптовая).
- Опт выключен по умолчанию; без курса доллара опт не действует.
- Новые строки — в `messages/ru.json` И `messages/ky.json` (правка точечная, не переформатировать файлы).
- Миграция к живой базе — только после «да» владельца. Настройки опта на живой базе после теста вернуть в «Выключено».
- Работа в ветке `wholesale-pricing`; в `main` — только по «пуш». Коммиты с `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Корзина ровно на пороге (сумма = порогу) → опт применяется (`>=`) — тест в Task 1.
2. Товар на акции дешевле оптовой цены → остаётся акционная цена, экономия не отрицательная — тест в Task 1.
3. Excel с заголовками «Оптовая цена» и «Цена, сом» (оптовая левее) → «Цена» берётся из «Цена, сом» — тест в Task 2.
4. Админ выбрал «Скидка %» без процента или любой способ без курса → сохранение отклоняется с понятной ошибкой, а при старых данных опт просто не действует — Task 1 (`thresholdSom` → null) + Task 4 (валидация PUT).
5. Продавец потом уменьшает оптовый заказ ниже порога в листе заказа → цены в заказе остаются оптовыми (решение продавца, не пересчитываем) — задокументировать в PROJECT_CONTEXT (Task 7).

---

### Task 1: Ядро `wholesale.ts` с тестами

**Files:** Create `src/lib/wholesale.ts`, `src/lib/wholesale.test.ts`; Modify `src/types.ts` (Product), `package.json` (test list).

**Interfaces — Produces:**
```ts
export type WholesaleMode = "off" | "percent" | "per_product";
export type WholesaleSettings = { mode: WholesaleMode; percent: number | null; thresholdUsd: number; usdRate: number | null };
export function mapWholesaleSettings(row: Record<string, unknown> | null | undefined): WholesaleSettings;
export function thresholdSom(s: WholesaleSettings): number | null;           // null = опт не действует
export function wholesaleCandidate(basePrice: number, ownWholesale: number | null, s: WholesaleSettings): number | null;
export type WholesaleSummary = { threshold: number | null; qualifies: boolean; retailTotal: number; savings: number; remaining: number };
export function applyWholesale(items: CartItem[], threshold: number | null): { items: CartItem[]; summary: WholesaleSummary };
```
`Product` получает `wholesalePrice?: number | null` (кандидат, ставит только сервер корзины) и `retailPrice?: number` (обычная цена, заполняется `applyWholesale`, когда цена заменена оптовой).

- [x] Step 1: тесты `src/lib/wholesale.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CartItem, Product } from "../types";
import { applyWholesale, mapWholesaleSettings, thresholdSom, wholesaleCandidate, type WholesaleSettings } from "./wholesale";

const s = (over: Partial<WholesaleSettings> = {}): WholesaleSettings => ({ mode: "percent", percent: 20, thresholdUsd: 1000, usdRate: 87.5, ...over });
const product = (id: string, price: number, wholesalePrice: number | null): Product => ({
  id, sku: id, barcode: null, name: id, brand: "B", category: "C", price, description: null, characteristics: null,
  purpose: null, inStock: true, imageUrl: null, wholesalePrice,
});
const item = (id: string, price: number, wholesale: number | null, quantity = 1, selected = true): CartItem => ({ product: product(id, price, wholesale), quantity, selected });

test("thresholdSom converts dollars by the rate; off / no rate / percent without percent → no wholesale", () => {
  assert.equal(thresholdSom(s()), 87500);
  assert.equal(thresholdSom(s({ mode: "off" })), null);
  assert.equal(thresholdSom(s({ usdRate: null })), null);
  assert.equal(thresholdSom(s({ percent: null })), null);
  assert.equal(thresholdSom(s({ mode: "per_product", percent: null })), 87500);
});

test("wholesaleCandidate: percent rounds to whole som; per_product uses the product's own price", () => {
  assert.equal(wholesaleCandidate(999, null, s({ percent: 15 })), 849);
  assert.equal(wholesaleCandidate(1000, 700, s({ mode: "per_product" })), 700);
  assert.equal(wholesaleCandidate(1000, null, s({ mode: "per_product" })), null);
  assert.equal(wholesaleCandidate(1000, 700, s({ mode: "off" })), null);
});

test("below the threshold nothing changes and remaining is reported", () => {
  const { items, summary } = applyWholesale([item("a", 30000, 24000, 2)], 87500);
  assert.equal(items[0].product.price, 30000);
  assert.deepEqual(summary, { threshold: 87500, qualifies: false, retailTotal: 60000, savings: 0, remaining: 27500 });
});

test("exactly at the threshold wholesale applies to every selected item", () => {
  const { items, summary } = applyWholesale([item("a", 50000, 40000), item("b", 37500, 30000)], 87500);
  assert.equal(summary.qualifies, true);
  assert.deepEqual(items.map((i) => [i.product.price, i.product.retailPrice]), [[40000, 50000], [30000, 37500]]);
  assert.equal(summary.savings, 17500);
  assert.equal(summary.remaining, 0);
});

test("unselected items neither count toward the threshold nor get wholesale prices", () => {
  const { items, summary } = applyWholesale([item("a", 80000, 60000), item("b", 50000, 40000, 1, false)], 87500);
  assert.equal(summary.qualifies, false);
  assert.equal(items[1].product.price, 50000);
});

test("a promo price cheaper than wholesale is kept; savings never go negative", () => {
  const { items, summary } = applyWholesale([item("a", 90000, 95000)], 87500);
  assert.equal(items[0].product.price, 90000);
  assert.equal(summary.savings, 0);
});

test("no threshold (wholesale off) → untouched, qualifies false", () => {
  const { summary } = applyWholesale([item("a", 100000, 50000)], null);
  assert.deepEqual(summary, { threshold: null, qualifies: false, retailTotal: 100000, savings: 0, remaining: 0 });
});

test("mapWholesaleSettings reads DB numerics (strings) and defaults", () => {
  assert.deepEqual(mapWholesaleSettings({ wholesale_mode: "percent", wholesale_percent: "20", wholesale_threshold_usd: "1000", usd_rate: "87.5" }), s());
  assert.deepEqual(mapWholesaleSettings(null), { mode: "off", percent: null, thresholdUsd: 1000, usdRate: null });
  assert.equal(mapWholesaleSettings({ wholesale_mode: "junk" }).mode, "off");
});
```
- [x] Step 2: добавить файл в `scripts.test`; `npm test` → FAIL «Cannot find module './wholesale'».
- [x] Step 3: реализация `src/lib/wholesale.ts`:

```ts
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
    return { items, summary: { threshold, qualifies: false, retailTotal, savings: 0, remaining: threshold === null ? 0 : Math.max(0, threshold - retailTotal) } };
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
```
В `src/types.ts` → `Product`: 
```ts
  /** Cart only (server-computed): this product's wholesale unit price candidate; never sent by /api/products. */
  wholesalePrice?: number | null;
  /** Cart only: the regular price when `price` was replaced by the wholesale one (shown struck through). */
  retailPrice?: number;
```
- [x] Step 4: `npm test` → PASS (все).
- [x] Step 5: commit `feat(wholesale): pricing core with tests`.

### Task 2: Колонка «Оптовая цена» в загрузке Excel и синхронизации

**Files:** Modify `src/lib/import/types.ts`, `fields.ts`, `syncFields.ts`, `autoMap.ts`, `validate.ts`, `sync.ts`, `executeSync.ts`, `src/app/api/admin/import/route.ts`; Create `src/lib/import/autoMap.test.ts`.

**Interfaces — Produces:** `FieldKey` += `"wholesalePrice"`; поле списка полей может иметь `exclude?: string[]`; `ParsedImportProduct.wholesalePrice: number | null`; `parseOptionalPrice(value: string): number | null` (в `validate.ts`).

- [x] Step 1: тест `src/lib/import/autoMap.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestMapping } from "./autoMap";
import { SYNC_IMPORT_FIELDS } from "./syncFields";
import { parseOptionalPrice } from "./validate";

test("a wholesale column left of 'Цена, сом' is not taken as the price", () => {
  const m = suggestMapping(["Название", "Оптовая цена", "Цена, сом"]);
  assert.equal(m.price, 2);
  assert.equal(m.wholesalePrice, 1);
});

test("plain 'Цена' + 'Опт' headers map to price and wholesale", () => {
  const m = suggestMapping(["Товар", "Цена", "Опт"]);
  assert.equal(m.price, 1);
  assert.equal(m.wholesalePrice, 2);
});

test("the sync wizard knows the wholesale column too", () => {
  const m = suggestMapping(["Название", "Цена опт", "Розничная цена"], SYNC_IMPORT_FIELDS);
  assert.equal(m.price, 2);
  assert.equal(m.wholesalePrice, 1);
});

test("parseOptionalPrice: empty / junk / non-positive → null", () => {
  assert.equal(parseOptionalPrice("1 250,50"), 1250.5);
  assert.equal(parseOptionalPrice(""), null);
  assert.equal(parseOptionalPrice("нет"), null);
  assert.equal(parseOptionalPrice("0"), null);
});
```
Добавить в `scripts.test`. `npm test` → FAIL (нет поля / функции).
- [x] Step 2: реализация:
  - `types.ts`: `| "wholesalePrice"`; в `ParsedImportProduct` — `wholesalePrice: number | null;`.
  - `fields.ts` и `syncFields.ts`: тип элемента + `exclude?: string[]`; у `price` — `exclude: ["опт", "wholesale"]`; новое поле после `price`: `{ key: "wholesalePrice", label: "Оптовая цена", required: false, aliases: ["оптовая цена", "опт", "цена опт", "оптом", "оптовая", "wholesale", "wholesale price"] }`.
  - `autoMap.ts`: `type ImportField = { key; required; aliases; exclude?: string[] }`; в обоих `findIndex` добавить условие `!(field.exclude ?? []).some((x) => h.includes(x))`.
  - `validate.ts`: `export function parseOptionalPrice(value: string): number | null { if (!value.trim()) return null; const p = parsePrice(value); return Number.isFinite(p) && p > 0 ? p : null; }`; в `buildImportRows` у продукта `wholesalePrice: parseOptionalPrice(get(row, "wholesalePrice"))`.
  - `import/route.ts` insert: `wholesale_price: product.wholesalePrice ?? null`.
  - `sync.ts`: `NewProductInput.wholesalePrice: number | null`; `const wholesalePrice = parseOptionalPrice(get(row, "wholesalePrice"));` — в update `if (wholesalePrice !== null) changes.wholesalePrice = wholesalePrice;`, в create `wholesalePrice`.
  - `executeSync.ts`: insert `wholesale_price: c.product.wholesalePrice`; update `if (u.changes.wholesalePrice !== undefined) changes.wholesale_price = u.changes.wholesalePrice;`.
- [x] Step 3: `npm test` → PASS; `npx tsc --noEmit` — ошибок в import-файлах нет.
- [x] Step 4: commit `feat(import): optional wholesale price column; price never grabs the wholesale column`.

### Task 3: Миграция `supabase/wholesale.sql`

- [x] Step 1: файл:
```sql
-- Оптовые цены (docs/superpowers/specs/2026-09-29-wholesale-pricing-design.md). Выключено по умолчанию.
alter table public.stores add column if not exists wholesale_mode text not null default 'off';
alter table public.stores add column if not exists wholesale_percent numeric;
alter table public.stores add column if not exists wholesale_threshold_usd numeric not null default 1000;
alter table public.stores add column if not exists usd_rate numeric;
alter table public.stores drop constraint if exists stores_wholesale_mode_check;
alter table public.stores add constraint stores_wholesale_mode_check check (wholesale_mode in ('off', 'percent', 'per_product'));
alter table public.stores drop constraint if exists stores_wholesale_percent_check;
alter table public.stores add constraint stores_wholesale_percent_check check (wholesale_percent is null or (wholesale_percent > 0 and wholesale_percent < 100));
alter table public.stores drop constraint if exists stores_wholesale_threshold_check;
alter table public.stores add constraint stores_wholesale_threshold_check check (wholesale_threshold_usd > 0);
alter table public.stores drop constraint if exists stores_usd_rate_check;
alter table public.stores add constraint stores_usd_rate_check check (usd_rate is null or usd_rate > 0);

alter table public.products add column if not exists wholesale_price numeric;
alter table public.products drop constraint if exists products_wholesale_price_check;
alter table public.products add constraint products_wholesale_price_check check (wholesale_price is null or wholesale_price > 0);

alter table public.orders add column if not exists is_wholesale boolean not null default false;
```
- [x] Step 2: СПРОСИТЬ владельца; применить `apply_migration` (name `wholesale`); проверить `information_schema.columns` и `get_advisors`.
- [x] Step 3: commit `feat(db): wholesale settings, product wholesale price, order flag`.

### Task 4: Сервер — корзина, заказ, настройки

**Files:** Modify `src/lib/cart-server.ts`, `src/app/api/cart/route.ts`, `src/app/api/orders/route.ts`, `src/lib/whatsapp.ts`, `src/lib/supabase.ts` (mapOrder), `src/types.ts` (Order), `src/app/api/admin/catalog/route.ts`; Create `src/app/api/wholesale/route.ts`, `src/app/api/admin/wholesale/route.ts`.

**Interfaces — Produces:** `loadCart(...)` → `Promise<{ items: CartItem[]; threshold: number | null }>`; `GET /api/cart` → `{ items, wholesaleThreshold }`; `GET /api/wholesale` → `{ settings: WholesaleSettings, thresholdSom: number | null }`; `PUT /api/admin/wholesale` body `WholesaleSettings` → `{ ok, settings, thresholdSom }` | 400 с текстом; `Order.isWholesale: boolean`; админский каталог отдаёт у товаров `wholesalePrice`.

- [x] `cart-server.ts`: прочитать `stores` (`wholesale_mode, wholesale_percent, wholesale_threshold_usd, usd_rate`) по `storeId` → `mapWholesaleSettings`; у каждого товара до акции `base = Number(p.price)`, `own = p.wholesale_price` → `wholesalePrice: wholesaleCandidate(base, own, settings)`; вернуть `{ items, threshold: thresholdSom(settings) }`.
- [x] `GET /api/cart`: `const { items, threshold } = await loadCart(...)`; ответ `{ items, wholesaleThreshold: threshold }`.
- [x] `POST /api/orders`: `const { items: raw, threshold } = await loadCart(..., { selectedOnly: true })`; `const { items, summary } = applyWholesale(raw, threshold)`; строки/итог из `items`; insert `is_wholesale: summary.qualifies`; `buildOrderMessage({... wholesaleThreshold: summary.qualifies ? threshold : null })`.
- [x] `whatsapp.ts` `OrderMessageInput.wholesaleThreshold?: number | null` → после строки «Заказ: #…» при значении: `Оптовый заказ (от ${threshold.toLocaleString("ru-RU")} сом)`. `items` в сообщении уже с оптовыми ценами.
- [x] `mapOrder`: `isWholesale: row.is_wholesale === true`; `Order.isWholesale: boolean`.
- [x] `GET /api/wholesale` (любая сессия): `stores` → настройки + `thresholdSom`.
- [x] `PUT /api/admin/wholesale` (`isStoreManager`): валидация — `mode` ∈ режимы; `thresholdUsd > 0`; для `mode !== "off"` нужен `usdRate > 0` («Укажите курс доллара»); для `percent` — `0 < percent < 100` («Укажите процент скидки от 1 до 99»); update `stores` (все 4 колонки) по `profile.storeId`.
- [x] `admin/catalog` route: к каждому товару `wholesalePrice: p.wholesale_price != null ? Number(p.wholesale_price) : null` (через `select("*")` уже есть).
- [x] `npx tsc --noEmit` и `npm test` чисто; commit `feat(wholesale): server pricing in cart and orders; settings API`.

### Task 5: Корзина покупателя

**Files:** Modify `src/lib/cart-store.ts` (+ тест), `src/lib/cart-context.tsx`, `src/components/cart/CartItemRow.tsx`, `src/components/cart/CartCheckoutForm.tsx`; Create `src/components/cart/WholesaleProgress.tsx`; messages.

**Interfaces:** `CartState.wholesaleThreshold: number | null` (из ответа GET /api/cart); `useCart()` дополнительно отдаёт `wholesale: WholesaleSummary`, а `items`/`selectedTotal` — уже пересчитанные `applyWholesale`.

- [x] Тест в `cart-store.test.ts`: fake GET возвращает `wholesaleThreshold: 5000` → после `load()` `getState().wholesaleThreshold === 5000`; FAIL → в `fetchItems` сохранять `wholesaleThreshold: data.wholesaleThreshold ?? null` (+ в начальное состояние и `switchAccount` → null) → PASS.
- [x] `cart-context.tsx`: `const priced = useMemo(() => applyWholesale(state.items, state.wholesaleThreshold), [...])`; `items: priced.items`, totals из `priced.items`, `wholesale: priced.summary`.
- [x] `CartItemRow`: если `item.product.retailPrice` — над ценой строки зачёркнутая `price(retailPrice * quantity)` мелким `text-muted line-through`.
- [x] `WholesaleProgress` (в `CartCheckoutForm` над строкой «Итого», только если `wholesale.threshold !== null`): ниже порога — текст `wholesale.progress` + полоска (`h-2 rounded-full bg-accent-soft`, заполнение `bg-accent` шириной `retailTotal/threshold`); от порога — `bg-success-soft text-success` текст `wholesale.applied` (экономия).
- [x] messages ru/ky, неймспейс `wholesale`: `progress` «До оптовых цен осталось {amount}» / «Дүң бааларга чейин {amount} калды»; `applied` «Оптовые цены применены — вы экономите {amount}» / «Дүң баалар колдонулду — {amount} үнөмдөйсүз»; `homeBanner` «Опт от {usd} $ (≈ {som}) — цены ниже» / «{usd} $ баштап дүңүнөн (≈ {som}) — баалар арзаныраак»; `badge` «Опт» / «Дүң».
- [x] tsc/eslint/test; commit `feat(wholesale): cart progress bar and wholesale prices`.

### Task 6: Админка и главная

**Files:** Create `src/components/admin/WholesaleSettings.tsx`, `src/components/WholesaleBanner.tsx`; Modify `admin/profile/page.tsx`, `admin/catalog/page.tsx`, `OrderManager.tsx`, `(app)/page.tsx`; messages.

- [x] `WholesaleSettings` (под формой названия в «Магазине»): GET `/api/wholesale`; радио из 3 способов; поле «Скидка, %» (только для percent); «Порог, $»; «Курс доллара, сом»; живой текст `= {thresholdSom}`; для `per_product` — «У {n} товаров оптовая цена не заполнена — они продаются по обычной цене.» (n из `/api/admin/catalog`: товары без `wholesalePrice`); «Сохранить» → PUT, ошибки сервера показываются как есть.
- [x] `admin/catalog`: колонка «Опт» — `price(p.wholesalePrice)` или «—».
- [x] `OrderManager` карточка: рядом с `#{order.number}` метка `wholesale.badge` (`text-[11px] font-semibold rounded-full bg-accent-soft text-accent px-2 py-0.5`) при `order.isWholesale`.
- [x] `WholesaleBanner` на главной сразу после слайдера: GET `/api/wholesale`; если `thresholdSom` — плашка `rounded-[var(--radius-card)] bg-accent-soft px-4 py-3 text-sm` с `wholesale.homeBanner` (usd — порог $, som — `price(thresholdSom)`).
- [x] messages ru/ky, неймспейс `adminWholesale`: title «Оптовые цены»/«Дүң баалар»; hint «Когда сумма заказа достигает порога, на все отмеченные товары действует оптовая цена.»/«Буйрутманын суммасы босогого жеткенде, бардык белгиленген товарларга дүң баа колдонулат.»; modeOff «Выключено»/«Өчүрүлгөн»; modePercent «Скидка % на все товары»/«Бардык товарларга % арзандатуу»; modePerProduct «Своя оптовая цена у товара (колонка «Оптовая цена» в Excel)»/«Ар бир товардын өз дүң баасы (Excel'деги «Оптовая цена» тилкеси)»; percent «Скидка, %»/«Арзандатуу, %»; thresholdUsd «Порог, $»/«Босого, $»; usdRate «Курс доллара, сом»/«Доллардын курсу, сом»; equals «= {amount}»; missing «У {n} товаров оптовая цена не заполнена — они продаются по обычной цене.»/«{n} товардын дүң баасы толтурулган эмес — алар кадимки баада сатылат.»; save «Сохранить»/«Сактоо»; saved «Сохранено»/«Сакталды»; saveFailed «Не удалось сохранить»/«Сактоо мүмкүн болбоду»; и в `adminCatalog` (или его неймспейсе) `wholesale` «Опт»/«Дүң».
- [x] tsc/eslint/test/build; commit `feat(wholesale): admin settings, catalog column, order badge, home banner`.

### Task 7: Проверка и журнал

- [x] Браузер 390×844, временный аккаунт: включить на живой базе `percent 20 %, 1000 $, курс 87.5` (владелец знает); ниже порога — полоска и остаток; выше — оптовые цены, зачёркнутые обычные, экономия; оформить заказ → `items_json` оптовые, `is_wholesale = true`, в тексте WhatsApp «Оптовый заказ»; главная — плашка. Затем `per_product` без оптовых цен → опт не меняет цены. Вернуть `wholesale_mode = 'off'`, `usd_rate = null`; удалить аккаунт и его заказы; `cart_items` аккаунта уходят каскадом.
- [x] Админка (временная роль admin тому же аккаунту — снять после): блок «Оптовые цены», валидация без курса.
- [x] `PROJECT_CONTEXT.md`: запись; отметить Review Focus 5 (уменьшение заказа продавцом не пересчитывает опт). `[x]` в плане. commit, доклад, «пуш?».
