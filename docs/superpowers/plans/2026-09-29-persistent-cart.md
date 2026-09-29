# Корзина за аккаунтом + частичное оформление — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Корзина хранится в Supabase за аккаунтом, у товаров есть галочки «в заказ», заказ оформляется прямо в выезжающей корзине, и после заказа в корзине остаются неотмеченные товары.

**Architecture:** Новая таблица `cart_items` (RLS «только своё») + REST-ручки `/api/cart` по образцу `/api/mybag`. `cart-context.tsx` становится тонким клиентом сервера (оптимистичные изменения + очередь запросов). `POST /api/orders` перестаёт принимать товары от клиента — берёт отмеченные строки корзины и цены из каталога (с акциями) через общую `loadCart()`, затем удаляет заказанные строки. `CartDrawer` разбивается на строку товара, форму оформления и экран «Заказ отправлен»; страница `/checkout` становится редиректом.

**Tech Stack:** Next.js 16 (App Router, `src/app/[locale]`), React 19, next-intl (ru + ky), Supabase (Postgres/RLS, `@supabase/ssr`), Tailwind 4, lucide-react. Тесты чистой логики — встроенный `node:test` через уже установленный `tsx` (новых зависимостей нет).

**Spec:** `docs/superpowers/specs/2026-09-29-persistent-cart-design.md`

## Global Constraints

- Никаких новых npm-зависимостей.
- Каждая API-ручка: `getSessionProfile()`; `store_id`/`user_id` берутся ТОЛЬКО из профиля, никогда из тела запроса.
- Цена в заказе = цена из `products` с учётом активной акции (`applyActivePromotion`), никогда не из запроса клиента.
- Все новые строки интерфейса — в ОБОИХ файлах `messages/ru.json` и `messages/ky.json`.
- Внешний вид — существующие токены/компоненты (`Button`, `EmptyState`, `bg-accent`, `border-border`, `rounded-[var(--radius-card)]` …), без редизайна; иконки только lucide-react.
- Правило линтера `react-hooks/set-state-in-effect`: setState внутри эффекта — только в колбэках промисов (как в существующем коде) либо с тем же `eslint-disable-next-line` и комментарием-обоснованием, что уже приняты в проекте.
- Миграция к живой базе (Supabase MCP `apply_migration`, project `nufmsvwkixnfjvzdabmz`) — ТОЛЬКО после явного «да» владельца.
- Коммиты заканчиваются строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Работа в worktree `.claude/worktrees/persistent-cart`, ветка `worktree-persistent-cart`; в `main` — только по «пуш» владельца.

## Review Focus

1. Два быстрых нажатия «+» подряд → на сервере итоговое количество = то, что на экране (PUT абсолютного количества + последовательная очередь запросов) — Task 4, шаг проверки.
2. Клиент снял галочку и сразу нажал «Отправить» → в заказ НЕ попадает снятый товар (форма ждёт `flush()` очереди перед POST) — Task 5, шаг проверки в браузере.
3. Товар на акции → сумма в заказе/WhatsApp равна акционной цене, которую клиент видел в корзине (`loadCart` для обоих) — Task 3 тест `orderLinesFromCart` + Task 6 проверка.
4. Выход из аккаунта и вход другим на том же телефоне → корзина первого не видна второму (нет localStorage-кэша, состояние сбрасывается по смене сессии) — Task 6 проверка.
5. Ни одного отмеченного товара → кнопка отправки неактивна, а сервер всё равно отвечает 400, если запрос пришёл — Task 3 и Task 5.

---

### Task 1: Worktree + чистая логика корзины с тестами

**Files:**
- Create: `src/lib/cart-logic.ts`
- Create: `src/lib/cart-logic.test.ts`
- Modify: `src/types.ts:43-46` (CartItem + `selected`)
- Modify: `package.json` (script `test`)

**Interfaces:**
- Produces (`src/lib/cart-logic.ts`):
  - `applyDelta(items: CartItem[], product: Product, delta: number): CartItem[]`
  - `quantityOf(items: CartItem[], productId: string): number`
  - `removeProduct(items: CartItem[], productId: string): CartItem[]`
  - `setSelected(items: CartItem[], productIds: string[] | "all", selected: boolean): CartItem[]`
  - `cartTotals(items: CartItem[]): { totalCount: number; selectedCount: number; selectedTotal: number }`
  - `parseLegacyCart(raw: string | null): { productId: string; quantity: number }[]`
  - `orderLinesFromCart(items: CartItem[]): { lines: OrderLine[]; total: number }` где
    `OrderLine = { name: string; brand: string; price: number; quantity: number; orderedQuantity: number; productId: string; sku: string }`
  - `type CartItem = { product: Product; quantity: number; selected: boolean }` (в `src/types.ts`)

- [ ] **Step 1: Создать worktree**

```powershell
cd C:\Users\Admin\Desktop\BeautyAI
git worktree add .claude/worktrees/persistent-cart -b worktree-persistent-cart main
Copy-Item .env.local .claude/worktrees/persistent-cart/.env.local
cd .claude/worktrees/persistent-cart; npm install
```

Все дальнейшие пути — внутри worktree.

- [ ] **Step 2: Добавить `selected` в `CartItem`** (`src/types.ts`)

```ts
export type CartItem = {
  product: Product;
  quantity: number;
  /** Галочка «в заказ» в корзине; снятые товары остаются в корзине после оформления. */
  selected: boolean;
};
```

- [ ] **Step 3: Написать падающие тесты** — `src/lib/cart-logic.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CartItem, Product } from "../types";
import { applyDelta, quantityOf, removeProduct, setSelected, cartTotals, parseLegacyCart, orderLinesFromCart } from "./cart-logic";

const product = (id: string, price = 100): Product => ({
  id, sku: `SKU-${id}`, barcode: null, name: `Товар ${id}`, brand: "B", category: "C", price,
  description: null, characteristics: null, purpose: null, inStock: true, imageUrl: null,
});
const item = (id: string, quantity: number, selected = true, price = 100): CartItem => ({ product: product(id, price), quantity, selected });

test("applyDelta adds a new product selected with the delta as quantity", () => {
  assert.deepEqual(applyDelta([], product("a"), 1), [{ product: product("a"), quantity: 1, selected: true }]);
});

test("applyDelta increments an existing product and keeps its checkbox", () => {
  const next = applyDelta([item("a", 2, false)], product("a"), 1);
  assert.equal(next[0].quantity, 3);
  assert.equal(next[0].selected, false);
});

test("applyDelta to zero removes the product; negative delta on a missing product is a no-op", () => {
  assert.deepEqual(applyDelta([item("a", 1)], product("a"), -1), []);
  assert.deepEqual(applyDelta([], product("a"), -1), []);
});

test("quantityOf returns 0 for a product not in the cart", () => {
  assert.equal(quantityOf([item("a", 2)], "a"), 2);
  assert.equal(quantityOf([item("a", 2)], "b"), 0);
});

test("removeProduct drops only that product", () => {
  assert.deepEqual(removeProduct([item("a", 1), item("b", 1)], "a").map((i) => i.product.id), ["b"]);
});

test("setSelected toggles listed ids or all", () => {
  const items = [item("a", 1), item("b", 1)];
  assert.deepEqual(setSelected(items, ["a"], false).map((i) => i.selected), [false, true]);
  assert.deepEqual(setSelected(items, "all", false).map((i) => i.selected), [false, false]);
});

test("cartTotals counts everything but prices only selected items", () => {
  const totals = cartTotals([item("a", 2, true, 100), item("b", 3, false, 50)]);
  assert.deepEqual(totals, { totalCount: 5, selectedCount: 2, selectedTotal: 200 });
});

test("parseLegacyCart reads the old localStorage shape, sums duplicates, drops junk", () => {
  const raw = JSON.stringify([
    { product: { id: "a" }, quantity: 2 },
    { product: { id: "a" }, quantity: 1 },
    { product: { id: "b" }, quantity: 0 },
    { product: {}, quantity: 3 },
    "junk",
  ]);
  assert.deepEqual(parseLegacyCart(raw), [{ productId: "a", quantity: 3 }]);
  assert.deepEqual(parseLegacyCart(null), []);
  assert.deepEqual(parseLegacyCart("{not json"), []);
});

test("orderLinesFromCart uses only selected items and the (server-side) product price", () => {
  const { lines, total } = orderLinesFromCart([item("a", 2, true, 80), item("b", 1, false, 999)]);
  assert.equal(total, 160);
  assert.deepEqual(lines, [{ name: "Товар a", brand: "B", price: 80, quantity: 2, orderedQuantity: 2, productId: "a", sku: "SKU-a" }]);
});
```

- [ ] **Step 4: Добавить скрипт и убедиться, что тесты падают**

В `package.json` → `"scripts"` добавить: `"test": "tsx --test src/lib/cart-logic.test.ts"`.

Run: `npm test`
Expected: FAIL — `Cannot find module './cart-logic'`.

- [ ] **Step 5: Реализовать** — `src/lib/cart-logic.ts`

```ts
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
```

- [ ] **Step 6: Тесты проходят**

Run: `npm test`
Expected: PASS, 9 tests, 0 fail. (Если `tsx` не разрешает `@/types` — импорт в `cart-logic.ts` только `import type`, он стирается; ошибки быть не должно.)

- [ ] **Step 7: Commit**

```powershell
git add src/lib/cart-logic.ts src/lib/cart-logic.test.ts src/types.ts package.json
git commit -m "feat(cart): pure cart logic with tests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(tsc на этом шаге ещё падает в `cart-context.tsx`/`checkout` из-за нового обязательного `selected` — это чинят Task 4–5; не запускать build до них.)

---

### Task 2: Таблица `cart_items` (миграция)

**Files:**
- Create: `supabase/cart_items.sql`

**Interfaces:**
- Produces: таблица `public.cart_items(user_id uuid, product_id uuid, quantity int > 0, selected bool default true, created_at, updated_at)`, PK `(user_id, product_id)`, RLS «только свои строки».

- [ ] **Step 1: Написать миграцию** — `supabase/cart_items.sql`

```sql
-- Корзина за аккаунтом (см. docs/superpowers/specs/2026-09-29-persistent-cart-design.md).
-- Живёт, пока клиент сам не удалит товар или не закажет его; каскадно удаляется вместе с аккаунтом
-- и вместе с товаром, удалённым из каталога.
create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Каскад при удалении товара ищет строки по product_id.
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);

alter table public.cart_items enable row level security;

create policy cart_items_select_own on public.cart_items
  for select using (user_id = auth.uid());
create policy cart_items_insert_own on public.cart_items
  for insert with check (user_id = auth.uid());
create policy cart_items_update_own on public.cart_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_delete_own on public.cart_items
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.cart_items to authenticated;
```

- [ ] **Step 2: СПРОСИТЬ владельца** «Создаю таблицу корзины в живой базе?» — дальше только после «да».

- [ ] **Step 3: Применить** через Supabase MCP `apply_migration` (project `nufmsvwkixnfjvzdabmz`, name `cart_items`, query = содержимое файла).

- [ ] **Step 4: Проверить**

`list_tables` (schemas `["public"]`) → есть `cart_items`, `rls_enabled: true`.
`execute_sql`: `select policyname from pg_policies where tablename = 'cart_items' order by 1;`
Expected: 4 строки `cart_items_delete_own`, `cart_items_insert_own`, `cart_items_select_own`, `cart_items_update_own`.
`get_advisors` (type `security`) — нет новых предупреждений про `cart_items`.

- [ ] **Step 5: Commit**

```powershell
git add supabase/cart_items.sql
git commit -m "feat(db): cart_items table with own-rows RLS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Серверная часть — `loadCart`, `/api/cart`, `/api/cart/merge`, новый `POST /api/orders`

**Files:**
- Create: `src/lib/cart-server.ts`
- Create: `src/app/api/cart/route.ts`
- Create: `src/app/api/cart/merge/route.ts`
- Modify: `src/app/api/orders/route.ts:8-113` (POST)

**Interfaces:**
- Consumes: `orderLinesFromCart`, `CartItem` (Task 1); таблица `cart_items` (Task 2).
- Produces:
  - `loadCart(supabase: ServerSupabase, userId: string, storeId: string, opts?: { selectedOnly?: boolean }): Promise<CartItem[]>`
  - `GET /api/cart` → `200 { items: CartItem[] }`
  - `PUT /api/cart` body `{ productId: string; quantity: number }` → `200 { ok: true }` (quantity ≤ 0 удаляет)
  - `PATCH /api/cart` body `{ productIds: string[] | "all"; selected: boolean }` → `200 { ok: true }`
  - `DELETE /api/cart?productId=…` → `200 { ok: true }`
  - `POST /api/cart/merge` body `{ items: { productId: string; quantity: number }[] }` → `200 { ok: true }`
  - `POST /api/orders` body `{ branchId, customerName, customerPhone }` → `200 { ok, orderId, orderNumber, whatsappUrl }` | `400` пусто/нет данных | `404` филиал | `409` остатки

- [ ] **Step 1: `src/lib/cart-server.ts`**

```ts
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProduct, mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import type { CartItem, Product } from "@/types";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Корзина пользователя с актуальными ценами из каталога (включая активные акции). Одна функция и для
 * показа корзины (GET /api/cart), и для оформления (POST /api/orders) — сумма в заказе всегда совпадает
 * с тем, что клиент видел, и никогда не берётся из запроса клиента.
 */
export async function loadCart(
  supabase: ServerSupabase,
  userId: string,
  storeId: string,
  opts: { selectedOnly?: boolean } = {}
): Promise<CartItem[]> {
  let query = supabase
    .from("cart_items")
    .select("quantity, selected, products(*)")
    .eq("user_id", userId)
    .order("created_at");
  if (opts.selectedOnly) query = query.eq("selected", true);
  const { data, error } = await query;
  if (error) throw error;

  const { data: promoRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "active")
    .not("product_id", "is", null);
  const promotions = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));

  return (data ?? []).flatMap((row) => {
    const p = row.products as unknown as Record<string, unknown> | null;
    if (!p || p.store_id !== storeId) return [];
    return [
      {
        product: applyActivePromotion(mapProduct(p) as Product, promotions),
        quantity: row.quantity as number,
        selected: row.selected as boolean,
      },
    ];
  });
}
```

- [ ] **Step 2: `src/app/api/cart/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { loadCart } from "@/lib/cart-server";

// Корзина за аккаунтом — тот же подход, что /api/mybag: RLS пускает только к своим строкам,
// user_id всегда из сессии.

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  try {
    const supabase = await createServerSupabaseClient();
    return NextResponse.json({ items: await loadCart(supabase, profile.userId, profile.storeId) });
  } catch {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const productId = body.productId;
  const quantity = body.quantity;
  if (typeof productId !== "string" || !productId || typeof quantity !== "number" || !Number.isInteger(quantity)) {
    return NextResponse.json({ error: "Неверные данные корзины." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (quantity <= 0) {
    const { error } = await supabase.from("cart_items").delete().eq("user_id", profile.userId).eq("product_id", productId);
    if (error) return NextResponse.json({ error: "Не удалось обновить корзину." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: product } = await supabase.from("products").select("id").eq("id", productId).eq("store_id", profile.storeId).maybeSingle();
  if (!product) return NextResponse.json({ error: "Товар не найден." }, { status: 404 });

  // upsert пишет только quantity/updated_at: у нового товара selected возьмёт default true,
  // у уже лежащего галочка не меняется.
  const { error } = await supabase
    .from("cart_items")
    .upsert(
      { user_id: profile.userId, product_id: productId, quantity, updated_at: new Date().toISOString() },
      { onConflict: "user_id,product_id" }
    );
  if (error) return NextResponse.json({ error: "Не удалось обновить корзину." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const productIds = body.productIds;
  const selected = body.selected;
  const validIds = productIds === "all" || (Array.isArray(productIds) && productIds.every((id: unknown) => typeof id === "string"));
  if (!validIds || typeof selected !== "boolean") {
    return NextResponse.json({ error: "Неверные данные корзины." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("cart_items").update({ selected, updated_at: new Date().toISOString() }).eq("user_id", profile.userId);
  if (productIds !== "all") query = query.in("product_id", productIds);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Не удалось обновить корзину." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Не указан товар." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("cart_items").delete().eq("user_id", profile.userId).eq("product_id", productId);
  if (error) return NextResponse.json({ error: "Не удалось удалить товар." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `src/app/api/cart/merge/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

// Одноразовый перенос старой корзины из localStorage телефона в аккаунт: количества складываются
// с тем, что уже лежит в корзине аккаунта; товары чужого магазина / удалённые — пропускаются.
export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const incoming: { productId: string; quantity: number }[] = (Array.isArray(body.items) ? body.items : []).filter(
    (i: { productId?: unknown; quantity?: unknown }) =>
      typeof i?.productId === "string" && typeof i?.quantity === "number" && Number.isInteger(i.quantity) && i.quantity > 0
  );
  if (incoming.length === 0) return NextResponse.json({ ok: true });

  const supabase = await createServerSupabaseClient();
  const ids = incoming.map((i) => i.productId);
  const { data: known } = await supabase.from("products").select("id").eq("store_id", profile.storeId).in("id", ids);
  const knownIds = new Set((known ?? []).map((p) => p.id as string));

  const { data: existing } = await supabase.from("cart_items").select("product_id, quantity").eq("user_id", profile.userId).in("product_id", ids);
  const existingQty = new Map((existing ?? []).map((r) => [r.product_id as string, r.quantity as number]));

  const rows = incoming
    .filter((i) => knownIds.has(i.productId))
    .map((i) => ({
      user_id: profile.userId,
      product_id: i.productId,
      quantity: (existingQty.get(i.productId) ?? 0) + i.quantity,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("cart_items").upsert(rows, { onConflict: "user_id,product_id" });
  if (error) return NextResponse.json({ error: "Не удалось перенести корзину." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Переписать `POST` в `src/app/api/orders/route.ts`** (GET не трогать)

Заменить строки 1–113 на:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { formatOrderNumber, buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { loadCart } from "@/lib/cart-server";
import { orderLinesFromCart } from "@/lib/cart-logic";

// Товары заказа берутся НЕ из запроса, а из корзины аккаунта (только отмеченные галочкой), с ценами
// из каталога и акциями — см. loadCart(). Заказанные строки потом удаляются из корзины; неотмеченные
// остаются там, пока клиент сам их не удалит.
export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const branchId: string = body.branchId;
  const customerName: string = (body.customerName ?? "").trim();
  const customerPhone: string = (body.customerPhone ?? "").trim();

  if (!branchId || !customerName || !customerPhone) {
    return NextResponse.json({ error: "Не хватает данных для оформления заказа." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    const items = await loadCart(supabase, profile.userId, profile.storeId, { selectedOnly: true });
    if (items.length === 0) {
      return NextResponse.json({ error: "Отметьте в корзине хотя бы один товар." }, { status: 400 });
    }

    const { data: branch } = await supabase
      .from("branches")
      .select("*")
      .eq("id", branchId)
      .eq("store_id", profile.storeId)
      .maybeSingle();
    if (!branch) {
      return NextResponse.json({ error: "Филиал не найден." }, { status: 404 });
    }

    const { lines, total: totalPrice } = orderLinesFromCart(items);

    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", profile.storeId);
    const orderNumber = formatOrderNumber((orderCount ?? 0) + 1);

    // Stock check in the chosen branch. Only what is certainly not there stops the order — a missing stock row
    // ("no data") is allowed, and the seller still has the last word.
    const productIds = lines.map((l) => l.productId);
    const { data: stockRows } = await supabase
      .from("product_branch_stock")
      .select("product_id, quantity")
      .eq("branch_id", branch.id)
      .in("product_id", productIds);
    const stockOf = new Map((stockRows ?? []).map((r) => [r.product_id as string, r.quantity as number]));
    const problems = lines
      .filter((l) => stockOf.has(l.productId) && stockOf.get(l.productId)! < l.quantity)
      .map((l) => {
        const left = stockOf.get(l.productId)!;
        return left <= 0 ? `«${l.name}» — нет в этом филиале` : `«${l.name}» — осталось только ${left} шт.`;
      });
    if (problems.length > 0) {
      return NextResponse.json(
        { error: `В выбранном филиале не хватает: ${problems.join("; ")}. Выберите другой филиал или уменьшите количество.` },
        { status: 409 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        store_id: profile.storeId,
        user_id: profile.userId,
        branch_id: branch.id,
        number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_price: totalPrice,
        status: "sent",
        items_json: lines,
      })
      .select("id, status_token")
      .single();

    if (orderError) throw orderError;

    // Заказ уже в базе — если убрать строки из корзины не получилось, заказ всё равно оформлен:
    // клиент просто увидит эти товары в корзине и удалит их сам. Ошибку не возвращаем.
    await supabase.from("cart_items").delete().eq("user_id", profile.userId).in("product_id", productIds);

    const message = buildOrderMessage({
      orderNumber,
      items,
      totalPrice,
      customerName,
      customerPhone,
      branchName: branch.name,
      branchAddress: branch.address,
      storeName: profile.storeName,
      statusToken: order.status_token,
      origin: request.nextUrl.origin,
    });
    const whatsappUrl = buildWhatsAppUrl(branch.whatsapp, message);

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber, whatsappUrl });
  } catch {
    return NextResponse.json({ error: "Не удалось оформить заказ — база данных недоступна." }, { status: 500 });
  }
}
```

(`items_json` получает те же поля, что и раньше — `name, brand, price, quantity, orderedQuantity, productId, sku` — админка и `/o/<token>` читают его без изменений.)

- [ ] **Step 5: Проверка типов по серверным файлам**

Run: `npx tsc --noEmit 2>&1 | Select-String "api/cart|api/orders|cart-server|cart-logic"`
Expected: пусто (оставшиеся ошибки — только в `cart-context.tsx`/`checkout`/`CartDrawer`, их чинят Task 4–5).
Run: `npm test` → PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/cart-server.ts src/app/api/cart src/app/api/orders/route.ts
git commit -m "feat(cart): account cart API; orders take selected cart rows with catalog prices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `cart-context.tsx` — клиент серверной корзины

**Files:**
- Modify (полная замена): `src/lib/cart-context.tsx`

**Interfaces:**
- Consumes: функции Task 1; ручки Task 3; `useSession()` (`session`, `loading`) из `src/lib/session-context.tsx`.
- Produces — `useCart()` возвращает:
  ```ts
  {
    items: CartItem[]; hydrated: boolean; saveFailed: boolean;
    addItem(product: Product): void;
    removeItem(productId: string): void;
    changeQuantity(productId: string, delta: number): void;
    toggleSelected(productId: string): void;
    setAllSelected(selected: boolean): void;
    reload(): Promise<void>;
    flush(): Promise<void>;       // дождаться всех отправленных изменений
    totalCount: number; selectedCount: number; selectedTotal: number;
  }
  ```
  (`totalPrice` и `clearCart` удаляются — ими пользовалась только старая `/checkout`.)

- [ ] **Step 1: Заменить файл**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { CartItem, Product } from "@/types";
import { useSession } from "@/lib/session-context";
import { applyDelta, cartTotals, parseLegacyCart, quantityOf, removeProduct, setSelected } from "@/lib/cart-logic";

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  /** Последнее изменение не сохранилось на сервере (корзина уже перезагружена с сервера). */
  saveFailed: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  changeQuantity: (productId: string, delta: number) => void;
  toggleSelected: (productId: string) => void;
  setAllSelected: (selected: boolean) => void;
  reload: () => Promise<void>;
  /** Resolves when every change sent so far has reached the server — call before placing an order. */
  flush: () => Promise<void>;
  totalCount: number;
  selectedCount: number;
  selectedTotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

// До 29.09 корзина жила только в localStorage — при первом входе её содержимое переносится в аккаунт.
const LEGACY_STORAGE_KEY = "beautyai-cart";
const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Корзина хранится в аккаунте (таблица cart_items, /api/cart) — одна и та же на любом устройстве,
 * пока клиент сам не удалит товар или не закажет его. Изменения видны сразу (оптимистично), а запросы
 * уходят строго по очереди, чтобы быстрые нажатия не перегоняли друг друга. Локального кэша корзины
 * нет намеренно: на общем телефоне корзина одного аккаунта не должна мелькать у другого.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  // Смена аккаунта (выход / вход другим) — перезагрузка корзины с нуля.
  const accountKey = session ? `${session.storeId}:${session.email ?? ""}` : null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const reload = useCallback(async () => {
    const res = await fetch("/api/cart");
    if (!res.ok) throw new Error("cart load failed");
    const data: { items?: CartItem[] } = await res.json();
    setItems(data.items ?? []);
    setSaveFailed(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    // Loading the account's cart from the server when the session appears / changes — a genuine
    // "synchronize with an external system" effect; state is only set in promise callbacks.
    (async () => {
      if (!accountKey) {
        if (!cancelled) {
          setItems([]);
          setHydrated(true);
        }
        return;
      }
      let legacyRaw: string | null = null;
      try {
        legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      } catch {
        // недоступно — переносить нечего
      }
      const legacy = parseLegacyCart(legacyRaw);
      if (legacyRaw !== null && legacy.length === 0) {
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {}
      }
      if (legacy.length > 0) {
        const res = await fetch("/api/cart/merge", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ items: legacy }) }).catch(() => null);
        if (res?.ok) {
          try {
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {}
        }
      }
      const res = await fetch("/api/cart").catch(() => null);
      const data: { items?: CartItem[] } = res?.ok ? await res.json() : { items: [] };
      if (!cancelled) {
        setItems(data.items ?? []);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, accountKey]);

  const send = useCallback(
    (request: () => Promise<Response>) => {
      queue.current = queue.current.then(async () => {
        try {
          const res = await request();
          if (!res.ok) throw new Error("cart save failed");
        } catch {
          await reload().catch(() => {});
          setSaveFailed(true);
        }
      });
    },
    [reload]
  );

  const putQuantity = (productId: string, quantity: number) =>
    send(() => fetch("/api/cart", { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ productId, quantity }) }));

  const addItem = (product: Product) => {
    const next = applyDelta(items, product, 1);
    setItems(next);
    putQuantity(product.id, quantityOf(next, product.id));
  };

  const changeQuantity = (productId: string, delta: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    const next = applyDelta(items, item.product, delta);
    setItems(next);
    putQuantity(productId, quantityOf(next, productId));
  };

  const removeItem = (productId: string) => {
    setItems(removeProduct(items, productId));
    send(() => fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, { method: "DELETE" }));
  };

  const toggleSelected = (productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    setItems(setSelected(items, [productId], !item.selected));
    send(() => fetch("/api/cart", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ productIds: [productId], selected: !item.selected }) }));
  };

  const setAllSelected = (selected: boolean) => {
    setItems(setSelected(items, "all", selected));
    send(() => fetch("/api/cart", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ productIds: "all", selected }) }));
  };

  const flush = () => queue.current;

  const totals = useMemo(() => cartTotals(items), [items]);

  return (
    <CartContext.Provider
      value={{ items, hydrated, saveFailed, addItem, removeItem, changeQuantity, toggleSelected, setAllSelected, reload, flush, ...totals }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart должен использоваться внутри CartProvider");
  return context;
}
```

- [ ] **Step 2: Линтер по файлу**

Run: `npx eslint src/lib/cart-context.tsx`
Expected: 0 errors. Если сработает `react-hooks/set-state-in-effect` на `setItems([])` в ветке `!accountKey` — обернуть в `Promise.resolve().then(() => { … })`, как сделано в проекте для той же ситуации (см. PROJECT_CONTEXT.md, гидратационный баг 20.09).

- [ ] **Step 3: Commit**

```powershell
git add src/lib/cart-context.tsx
git commit -m "feat(cart): cart context backed by the account cart API" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Корзина с галочками и оформлением внутри + редирект `/checkout` + переводы

**Files:**
- Create: `src/components/cart/CartItemRow.tsx`
- Create: `src/components/cart/CartCheckoutForm.tsx`
- Create: `src/components/cart/CartOrderSent.tsx`
- Modify (полная замена): `src/components/CartDrawer.tsx`
- Modify (полная замена): `src/app/[locale]/(app)/checkout/page.tsx`
- Modify: `messages/ru.json` (`cart`, `checkout`), `messages/ky.json` (`cart`, `checkout`)

**Interfaces:**
- Consumes: `useCart()` (Task 4), `POST /api/orders` (Task 3), `GET /api/orders` → `{ orders: Order[] }` (`Order.customerName`, `Order.customerPhone`), `GET /api/branches` → `{ branches: Branch[] }`, `BannerGate` из `src/components/BannerInterstitial.tsx`, `unmarkAdded` из `src/lib/session-flags.ts`.
- Produces: `type SentOrder = { orderNumber: string; whatsappUrl: string }` (экспорт из `CartOrderSent.tsx`).

- [ ] **Step 1: Переводы.** В `messages/ru.json` → `"cart"` добавить:

```json
    "select": "Отметить для заказа: {name}",
    "selectAll": "Выбрать все",
    "selectedSummary": "Отмечено {selected} из {total}",
    "unselectedStay": "Неотмеченные товары останутся в корзине.",
    "saveFailed": "Не удалось сохранить изменение — проверьте интернет."
```

В `"checkout"` добавить:

```json
    "branchPlaceholder": "Выберите филиал",
    "totalSelected": "Итого ({count} шт.)",
    "nothingSelected": "Отметьте хотя бы один товар",
    "done": "Готово"
```

И удалить из `"checkout"` ключи, которые больше нигде не используются: `steps`, `loadingCart`, `title`, `chooseBranch`, `next`, `back`, `yourContacts`, `reviewTitle`, `products`, `total`, `contacts`, `change`, `backToCatalog` (перед удалением проверить `Grep` по `src` на `t("<ключ>")` в неймспейсе `checkout` — должен остаться только новый код).

В `messages/ky.json` те же ключи:

`"cart"`:
```json
    "select": "Буйрутмага белгилөө: {name}",
    "selectAll": "Баарын тандоо",
    "selectedSummary": "{total} ичинен {selected} белгиленди",
    "unselectedStay": "Белгиленбеген товарлар себетте калат.",
    "saveFailed": "Өзгөртүүнү сактоо мүмкүн болбоду — интернетти текшериңиз."
```
`"checkout"`:
```json
    "branchPlaceholder": "Филиалды тандаңыз",
    "totalSelected": "Жыйынтыгы ({count} даана)",
    "nothingSelected": "Жок дегенде бир товарды белгилеңиз",
    "done": "Даяр"
```
и удалить тот же список ключей.

- [ ] **Step 2: `src/components/cart/CartItemRow.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { useCart } from "@/lib/cart-context";
import { unmarkAdded } from "@/lib/session-flags";
import type { CartItem } from "@/types";

/** Строка корзины: галочка «в заказ», количество, удаление. Снятая галочка — товар остаётся в корзине. */
export function CartItemRow({ item }: { item: CartItem }) {
  const t = useTranslations("cart");
  const price = usePrice();
  const text = useProductText();
  const { changeQuantity, removeItem, toggleSelected } = useCart();
  const name = text(item.product).name;

  return (
    <div className="flex gap-3 items-start border-b border-border pb-4 last:border-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.selected}
        aria-label={t("select", { name })}
        onClick={() => toggleSelected(item.product.id)}
        className={[
          "mt-0.5 size-6 shrink-0 rounded-md border flex items-center justify-center transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          item.selected ? "bg-accent border-accent text-white" : "bg-card border-border",
        ].join(" ")}
      >
        {item.selected && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
      </button>

      <div className={["flex-1 min-w-0 transition-opacity", item.selected ? "" : "opacity-55"].join(" ")}>
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted mb-2">{item.product.brand}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-accent-soft rounded-full px-1 py-1">
            <button
              type="button"
              onClick={() => changeQuantity(item.product.id, -1)}
              aria-label={t("decrease", { name })}
              className="w-6 h-6 rounded-full bg-white flex items-center justify-center transition active:scale-90"
            >
              <Minus className="size-3" strokeWidth={2.5} aria-hidden />
            </button>
            <span className="text-xs font-medium w-5 text-center tabular-nums">{item.quantity}</span>
            <button
              type="button"
              onClick={() => changeQuantity(item.product.id, 1)}
              aria-label={t("increase", { name })}
              className="w-6 h-6 rounded-full bg-white flex items-center justify-center transition active:scale-90"
            >
              <Plus className="size-3" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              removeItem(item.product.id);
              unmarkAdded(item.product.id);
            }}
            aria-label={t("remove", { name })}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted transition hover:text-error hover:bg-error-soft"
          >
            <Trash2 className="size-3.5" strokeWidth={1.85} aria-hidden />
          </button>
        </div>
      </div>

      <div className={["text-sm font-display tabular-nums shrink-0", item.selected ? "" : "text-muted"].join(" ")}>
        {price(item.product.price * item.quantity)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/components/cart/CartOrderSent.tsx`** (перенос экрана успеха со старой `/checkout`)

```tsx
"use client";

import { useTranslations } from "next-intl";
import { MessageCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type SentOrder = { orderNumber: string; whatsappUrl: string };

/**
 * «Заказ отправлен» внутри шторки корзины. wa.me только ОТКРЫВАЕТ чат с готовым текстом — отправить
 * должен сам клиент, поэтому предупреждение и кнопка «Открыть WhatsApp снова» (жалоба владельца 24.09).
 */
export function CartOrderSent({ order, onDone }: { order: SentOrder; onDone: () => void }) {
  const t = useTranslations("checkout");
  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col items-center text-center">
      <div className="text-5xl mb-4">💚</div>
      <h3 className="font-display text-2xl mb-3">{t("sentTitle")}</h3>
      <p className="text-muted mb-2">
        {t.rich("sentText", { number: order.orderNumber, b: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })}
      </p>
      <p className="text-muted mb-6">{t("sentHint")}</p>

      <div className="w-full rounded-[var(--radius-card)] bg-warning-soft text-warning px-4 py-3.5 mb-4 text-left flex gap-3">
        <TriangleAlert className="size-5 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
        <p className="text-sm font-medium leading-snug">{t("sentWhatsappWarning")}</p>
      </div>

      <button
        type="button"
        onClick={() => window.open(order.whatsappUrl, "_blank")?.focus()}
        className="w-full rounded-full bg-[#25D366] text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 flex items-center justify-center gap-2 mb-3"
      >
        <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />
        {t("reopenWhatsapp")}
      </button>

      <Button variant="primary" size="lg" fullWidth onClick={onDone}>
        {t("done")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: `src/components/cart/CartCheckoutForm.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { useCart } from "@/lib/cart-context";
import { useSession } from "@/lib/session-context";
import type { SentOrder } from "@/components/cart/CartOrderSent";
import type { Branch, Order } from "@/types";

// Тот же ключ, что в каталоге и на странице товара, — филиал, выбранный там, подставляется сюда.
const BRANCH_STORAGE_KEY = "beautyai-branch";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent";

/** Филиал + имя + телефон + «Отправить в WhatsApp» — в заказ уходят только отмеченные товары. */
export function CartCheckoutForm({ onSent }: { onSent: (order: SentOrder) => void }) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const price = usePrice();
  const { selectedCount, selectedTotal, flush, reload } = useCart();
  const { session } = useSession();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState(session?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches?: Branch[] }) => {
        if (cancelled) return;
        const list = data.branches ?? [];
        setBranches(list);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(BRANCH_STORAGE_KEY);
        } catch {
          // недоступно — клиент выберет сам
        }
        const preset = stored && list.some((b) => b.id === stored) ? stored : list.length === 1 ? list[0].id : "";
        setBranchId((current) => current || preset);
      })
      .catch(() => {});
    // Контакты из последнего заказа — клиенту не нужно вводить телефон каждый раз.
    fetch("/api/orders")
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data: { orders?: Order[] }) => {
        if (cancelled) return;
        const last = data.orders?.[0];
        if (!last) return;
        setName((current) => current || last.customerName);
        setPhone((current) => current || last.customerPhone);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = selectedCount > 0 && !!branchId && !!name.trim() && !!phone.trim() && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Галочки/количества, изменённые секунду назад, должны дойти до сервера раньше заказа.
      await flush();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, customerName: name, customerPhone: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("failed"));
        return;
      }
      window.open(data.whatsappUrl, "_blank")?.focus();
      // Сервер уже убрал заказанные строки — подтягиваем корзину, в ней остаются неотмеченные.
      await reload().catch(() => {});
      onSent({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl });
    } catch {
      setError(t("somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <label className="block">
        <span className="block text-xs font-medium text-muted mb-1.5">{t("branch")}</span>
        {branches.length === 0 ? (
          <p className="text-sm text-muted">{t("noBranches")}</p>
        ) : (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
            <option value="" disabled>
              {t("branchPlaceholder")}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address}
              </option>
            ))}
          </select>
        )}
      </label>
      <input className={inputClass} placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <input className={inputClass} placeholder={t("phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" />

      <div className="flex justify-between font-display text-xl mt-1">
        <span>{t("totalSelected", { count: selectedCount })}</span>
        <span className="tabular-nums">{price(selectedTotal)}</span>
      </div>
      <p className="text-xs text-muted -mt-1">{tCart("unselectedStay")}</p>

      {error && <p className="rounded-xl bg-error-soft text-error text-sm px-4 py-3">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-full bg-[#25D366] text-white px-6 py-3.5 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 flex items-center justify-center gap-2"
      >
        <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />
        {submitting ? t("sending") : selectedCount === 0 ? t("nothingSelected") : t("sendWhatsApp")}
      </button>
    </div>
  );
}
```

(Проверить, что `Order` экспортируется из `src/types.ts` с полями `customerName`/`customerPhone` — да, `src/types.ts:85`; ключи `checkout.branch`, `noBranches`, `namePlaceholder`, `phonePlaceholder`, `sending`, `sendWhatsApp`, `failed`, `somethingWrong` остаются в messages.)

- [ ] **Step 5: `src/components/CartDrawer.tsx`** — полная замена

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useSession } from "@/lib/session-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerGate } from "@/components/BannerInterstitial";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartCheckoutForm } from "@/components/cart/CartCheckoutForm";
import { CartOrderSent, type SentOrder } from "@/components/cart/CartOrderSent";
import { usePathname } from "@/i18n/navigation";

export function CartDrawer() {
  const t = useTranslations("cart");
  const { items, totalCount, selectedCount, setAllSelected, reload, saveFailed } = useCart();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<SentOrder | null>(null);
  const pathname = usePathname();
  const { isAdmin } = useSession();

  // Admins/owners don't shop through their own account — see proxy.ts.
  if (isAdmin) return null;
  // A product page has its own sticky "add to cart" bar above the bottom nav — float the cart above that bar.
  const onProduct = pathname.startsWith("/product/");
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  function openDrawer() {
    setOpen(true);
    // Корзина могла измениться на другом устройстве.
    reload().catch(() => {});
  }

  function close() {
    setOpen(false);
    setSent(null);
  }

  return (
    <>
      <button
        onClick={openDrawer}
        aria-label={t("open")}
        style={onProduct ? { bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 5.5rem)" } : undefined}
        className={["fixed right-4 z-40", onProduct ? "" : "bottom-24"].join(" ") + " rounded-full bg-accent text-white shadow-[var(--shadow-float)] pl-4 pr-3.5 py-3.5 flex items-center gap-2 transition hover:bg-accent-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"}
      >
        <ShoppingBag className="size-4.5" strokeWidth={2} aria-hidden />
        <span className="text-sm font-medium">{t("title")}</span>
        {totalCount > 0 && (
          <span className="bg-white text-accent rounded-full text-xs font-semibold min-w-[20px] h-5 px-1 flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <BannerGate page="checkout" />
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={close} />
          <div className="relative w-full max-w-sm bg-background h-full shadow-xl flex flex-col animate-sheet-in">
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border">
              <h2 className="font-display text-2xl">{t("title")}</h2>
              <button
                onClick={close}
                aria-label={t("close")}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border transition hover:bg-black/5 active:scale-90"
              >
                <X className="size-4.5" strokeWidth={2} aria-hidden />
              </button>
            </div>

            {sent ? (
              <CartOrderSent order={sent} onDone={close} />
            ) : items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState icon={ShoppingBag} title={t("empty")} description={t("emptyHint")} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setAllSelected(!allSelected)}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {t("selectAll")}
                  </button>
                  <span className="text-muted tabular-nums">{t("selectedSummary", { selected: selectedCount, total: totalCount })}</span>
                </div>

                {saveFailed && <p className="rounded-xl bg-error-soft text-error text-sm px-4 py-3">{t("saveFailed")}</p>}

                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <CartItemRow key={item.product.id} item={item} />
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <CartCheckoutForm onSent={setSent} />
                </div>
              </div>
            )}

            {!sent && (
              <div className="px-5 pt-3 pb-5 border-t border-border bg-card/60">
                <p className="text-xs text-muted text-center leading-relaxed">{t("paymentNote")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

(«Выбрать все» при всех отмеченных снимает все галочки — это переключатель. Ключ `cart.total`/`cart.checkout` становятся неиспользуемыми — удалить их из обоих messages-файлов.)

- [ ] **Step 6: `src/app/[locale]/(app)/checkout/page.tsx`** — полная замена

```tsx
import { redirect } from "next/navigation";

// Заказ теперь оформляется прямо в корзине (CartDrawer); старые ссылки/закладки на /checkout
// ведут на главную, где корзина под рукой.
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
```

- [ ] **Step 7: Полная проверка сборки**

Run: `npx tsc --noEmit` → 0 ошибок.
Run: `npx eslint src` → 0 errors (допускаются только 2 предсуществующих `react-hooks/exhaustive-deps` warning, упомянутых в PROJECT_CONTEXT.md).
Run: `npm test` → PASS.
Run: `npm run build` → успешно.
Run: `Grep` по `src` на `clearCart|totalPrice.*useCart|"/checkout"` → нет обращений к удалённому API (кроме комментария в `BannerInterstitial.tsx` — обновить его текст на «на /, /catalog и при открытии корзины»).

- [ ] **Step 8: Commit**

```powershell
git add src/components/cart src/components/CartDrawer.tsx "src/app/[locale]/(app)/checkout/page.tsx" src/components/BannerInterstitial.tsx messages/ru.json messages/ky.json
git commit -m "feat(cart): checkboxes and in-drawer checkout; unselected items stay in the cart" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Проверка в браузере, журнал, передача владельцу

**Files:**
- Modify: `PROJECT_CONTEXT.md` (новая запись в конце + дата в шапке)
- Modify: `docs/superpowers/plans/2026-09-29-persistent-cart.md` (галочки `[x]`)

- [ ] **Step 1: Запустить dev-сервер в worktree** — `npm run dev` (фоном), открыть `http://localhost:3000` в Playwright, окно 390×844.

- [ ] **Step 2: Тестовый аккаунт** — зарегистрировать `cart-test-<время>@example.com` через `/login`, пройти/пропустить первые экраны.

- [ ] **Step 3: Сценарии** (каждый — снимок экрана/проверка):
  1. Добавить 3 разных товара (один — с акцией, если есть в `promotions` активная; иначе любой). Открыть корзину: 3 строки, все с галочкой, «Отмечено 3 из 3».
  2. Два быстрых «+» на первом товаре → закрыть/открыть корзину (reload с сервера) → количество совпадает.
  3. Снять галочку со второго товара и СРАЗУ нажать «Отправить» (филиал, имя, телефон заполнить заранее) → экран «Заказ отправлен»; «Готово» → в корзине ровно 1 товар (снятый). В Supabase `execute_sql`: `select items_json, total_price from orders where customer_phone = '<тестовый>'` → 2 позиции, цены = каталожные/акционные, итог совпадает с показанным.
  4. Снять все галочки → кнопка показывает «Отметьте хотя бы один товар» и неактивна.
  5. Выйти из аккаунта, войти снова → оставшийся товар на месте.
  6. В DevTools (Playwright `browser_evaluate`) положить `localStorage.setItem("beautyai-cart", JSON.stringify([{product:{id:"<id товара>"},quantity:2}]))`, перезагрузить → товар добавился в корзину аккаунта, ключ `beautyai-cart` удалён.
  7. Открыть `/ru/checkout` → редирект на главную.

- [ ] **Step 4: Уборка тестовых данных** — через Supabase MCP удалить тестовые заказы (`delete from orders where user_id = '<id>'`) и сам аккаунт (`delete from auth.users where email = '<тестовый>'` — `cart_items` уйдут каскадом). Проверить: `select count(*) from cart_items where user_id = '<id>'` → 0. (Удаление — после согласия владельца, если система разрешений спросит.)

- [ ] **Step 5: Журнал** — добавить в конец `PROJECT_CONTEXT.md` запись «Корзина за аккаунтом + частичное оформление — 29.09»: что изменилось для клиента, таблица `cart_items`, новый `/api/cart`, что `/api/orders` больше не верит ценам клиента, `/checkout` → редирект, что проверено и что нет. Обновить строку «обновлено:» в шапке. Проставить `[x]` в этом плане.

- [ ] **Step 6: Commit** и доклад владельцу, вопрос «пуш?»

```powershell
git add PROJECT_CONTEXT.md docs/superpowers/plans/2026-09-29-persistent-cart.md
git commit -m "docs: log persistent cart in PROJECT_CONTEXT.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

После «пуш»: `git checkout main; git merge --no-ff worktree-persistent-cart; git push origin main` (из основной папки проекта), проверить, что Vercel собрал.
