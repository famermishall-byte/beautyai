# Баннеры и акции (План А) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Дать владельцу/админу создавать рекламные баннеры и акции на товары через админку, без правки кода; показывать их клиенту (всплывающий баннер + блок «Акции» на главной); заодно показать граммаж и штрихкод в списке товаров админки.

**Architecture:** Две новые Supabase-таблицы (`banners`, `promotions`), RLS-ограничение записи до `owner`/`admin`. Цена акции подмешивается в уже существующие `/api/products`, `/api/products/[id]`, `/api/products/bestsellers`, так что скидка видна везде одинаково без изменений в `ProductCard`. Баннер — не карусель на главной (она не трогается), а модальное окно, показывается один раз за сессию при входе в `/catalog` и один раз при входе в `/checkout`.

**Tech Stack:** Next.js 16 (App Router) + Supabase (Postgres + Storage) + next-intl. Никакого тестового фреймворка в проекте нет — вместо `pytest`/`jest` каждый шаг «Run test» в этом плане означает: `npx tsc --noEmit`, `npx eslint <файлы>`, `npm run build`, и там, где отмечено — ручная проверка в браузере (Playwright MCP или обычный браузер). Это осознанное решение, согласованное с владельцем в этой же сессии.

**Spec:** `docs/superpowers/specs/2026-09-23-marketing-and-catalog-admin-design.md` (разделы 1, 2, 3 — этот план их не переписывает, а реализует; читайте оба документа вместе).

## Global Constraints

- Только `owner`/`admin` создают/редактируют/удаляют баннеры и акции (`isStoreManager` из `src/lib/auth.ts`); управляющий филиала эти разделы не видит (не добавляется в `BRANCH_MANAGER_PATHS` в `src/proxy.ts`).
- Любая новая SQL-миграция — аддитивная (`create table if not exists`/`add column if not exists`/`drop policy if exists` + `create policy`), можно запускать повторно, ничего не удаляет и не переименовывает существующее. Владелец запускает файл сам в Supabase → SQL Editor — агент/исполнитель это НЕ делает (нет доступа к Supabase в этой среде).
- Каждый новый видимый пользователю текст добавляется сразу в ОБА файла: `messages/ru.json` и `messages/ky.json` — черновой перевод на кыргызский, без вычитки (уже согласованная практика в этом проекте).
- После каждой задачи: `git add` → `git commit` → `git push` в `main` (по договорённости с владельцем — прод обновляется сам из `main` на Vercel). Не пушить задачу, если проверка (tsc/eslint/build) не прошла чисто.
- Цвета/отступы/радиусы — только уже существующие Tailwind-утилиты и CSS-переменные проекта (`bg-accent`, `text-muted`, `rounded-[var(--radius-card)]`, `shadow-[var(--shadow-card)]` и т.п.) — новых не вводить.
- Не переписывать существующие файлы целиком там, где нужна точечная правка — только необходимые изменения (см. `Modify` с точным местом в каждой задаче).

---

## Task 1: Миграция базы данных — таблицы `banners`, `promotions`, bucket `banners`

**Files:**
- Create: `supabase/marketing.sql`

**Interfaces:**
- Produces: таблицы `public.banners`, `public.promotions` с колонками ровно как в спеке (раздел 1 и 2); RLS-политики `banners_select`, `banners_write_staff`, `promotions_select`, `promotions_write_staff`; Storage bucket `banners` (public) с политиками `banners_bucket_insert`, `banners_bucket_update`, `banners_bucket_delete`, `banners_bucket_select`.

- [x] **Step 1: Написать файл миграции**

```sql
-- БАННЕРЫ И АКЦИИ: реклама товаров в приложении, управляется владельцем/админом из /admin/promo.
-- Безопасно: только ДОБАВЛЯЕТ таблицы, политики и bucket; ничего существующего не меняет и не удаляет.
-- Можно запускать повторно. Запустить в Supabase → SQL Editor (страницу не переводить переводчиком браузера!).

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  subtitle text,
  image_url text,
  button_text text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'disabled')),
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists banners_store_id_idx on public.banners(store_id);
create index if not exists banners_product_id_idx on public.banners(product_id);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed', 'special_price')),
  discount_value numeric,
  old_price numeric not null,
  new_price numeric not null,
  show_old_price boolean not null default true,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists promotions_store_id_idx on public.promotions(store_id);
create index if not exists promotions_product_id_idx on public.promotions(product_id);

alter table public.banners enable row level security;
alter table public.promotions enable row level security;

-- Читают все, кто вошёл и принадлежит этому магазину (баннеры/акции видит и клиент, и персонал).
drop policy if exists banners_select on public.banners;
create policy banners_select on public.banners
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = banners.store_id));

drop policy if exists promotions_select on public.promotions;
create policy promotions_select on public.promotions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = promotions.store_id));

-- Пишут (создают/меняют/удаляют) только владелец и администратор своего магазина.
drop policy if exists banners_write_staff on public.banners;
create policy banners_write_staff on public.banners
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.store_id = banners.store_id and p.role::text in ('admin', 'owner')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.store_id = banners.store_id and p.role::text in ('admin', 'owner')
  ));

drop policy if exists promotions_write_staff on public.promotions;
create policy promotions_write_staff on public.promotions
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.store_id = promotions.store_id and p.role::text in ('admin', 'owner')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.store_id = promotions.store_id and p.role::text in ('admin', 'owner')
  ));

-- Storage bucket для картинок баннера. Путь файла: {store_id}/{имя файла}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists banners_bucket_insert on storage.objects;
create policy banners_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'banners'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text in ('admin', 'owner')
        and p.store_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists banners_bucket_update on storage.objects;
create policy banners_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'banners'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text in ('admin', 'owner')
        and p.store_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists banners_bucket_delete on storage.objects;
create policy banners_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'banners'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text in ('admin', 'owner')
        and p.store_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists banners_bucket_select on storage.objects;
create policy banners_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'banners');
```

- [x] **Step 2: Проверить, что файл — валидный SQL (без запуска в Supabase — просто визуальная сверка со спекой)**

Сверить каждую колонку `banners`/`promotions` с разделами 1 и 2 `docs/superpowers/specs/2026-09-23-marketing-and-catalog-admin-design.md`. Файл НЕ запускается агентом — только владельцем в Supabase SQL Editor, позже, перед проверкой Task 6+ (без этой миграции API из следующих задач будут возвращать «база данных недоступна», это ожидаемо, как было с `feedback_branch.sql`).

- [x] **Step 3: Commit**

```bash
git add supabase/marketing.sql
git commit -m "db: add banners and promotions tables, RLS, banners storage bucket"
git push origin main
```

---

## Task 2: Типы и мапперы — `Banner`, `Promotion`, `Product.barcode`

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: ничего (первая задача с кодом).
- Produces: `Banner`, `Promotion` типы; `mapBanner(row)`, `mapPromotion(row)` функции; `Product.barcode: string | null` (новое поле в уже существующем типе `Product`); `mapProduct` включает `barcode`.

- [x] **Step 1: Открыть `src/types.ts`, найти тип `Product`, добавить поле `barcode`**

Существующий фрагмент (не менять остальное в типе):
```ts
export type Product = {
  id: string;
  sku: string;
  ...
  imageUrl: string | null;
  ...
};
```

Добавить строку `barcode: string | null;` сразу после `sku: string;` в определении `Product`.

- [x] **Step 2: В конец `src/types.ts` добавить типы `Banner` и `Promotion`**

```ts
export type Banner = {
  id: string;
  productId: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
  priority: number;
  createdAt: string;
  updatedAt: string;
  product: Pick<Product, "id" | "name" | "brand" | "imageUrl" | "price"> | null;
};

export type Promotion = {
  id: string;
  productId: string | null;
  title: string;
  discountType: "percent" | "fixed" | "special_price";
  discountValue: number | null;
  oldPrice: number;
  newPrice: number;
  showOldPrice: boolean;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  product: Pick<Product, "id" | "name" | "brand" | "imageUrl" | "price"> | null;
};
```

- [x] **Step 3: В `src/lib/supabase.ts` добавить `barcode` в `mapProduct` и написать `mapBanner`/`mapPromotion`**

В `mapProduct` (существующая функция) добавить строку `barcode: (row.barcode as string | null) ?? null,` сразу после `sku: row.sku as string,`.

В конец файла добавить:

```ts
export function mapBanner(
  row: Record<string, unknown> & { products?: Record<string, unknown> | null }
) {
  const product = row.products as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    productId: (row.product_id as string | null) ?? null,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    buttonText: (row.button_text as string | null) ?? null,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    status: row.status as "draft" | "active" | "disabled",
    priority: row.priority as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    product: product
      ? {
          id: product.id as string,
          name: product.name as string,
          brand: product.brand as string,
          imageUrl: (product.image_url as string | null) ?? null,
          price: product.price as number,
        }
      : null,
  };
}

export function mapPromotion(
  row: Record<string, unknown> & { products?: Record<string, unknown> | null }
) {
  const product = row.products as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    productId: (row.product_id as string | null) ?? null,
    title: row.title as string,
    discountType: row.discount_type as "percent" | "fixed" | "special_price",
    discountValue: (row.discount_value as number | null) ?? null,
    oldPrice: row.old_price as number,
    newPrice: row.new_price as number,
    showOldPrice: row.show_old_price as boolean,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    status: row.status as "draft" | "active" | "disabled",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    product: product
      ? {
          id: product.id as string,
          name: product.name as string,
          brand: product.brand as string,
          imageUrl: (product.image_url as string | null) ?? null,
          price: product.price as number,
        }
      : null,
  };
}
```

- [x] **Step 4: Проверить типы и линтер**

```bash
npx tsc --noEmit
npx eslint src/types.ts src/lib/supabase.ts
```
Ожидается: чисто (пока эти функции ещё нигде не вызываются — предупреждений о неиспользуемом экспорте линтер для экспортов не даёт, это нормально).

- [x] **Step 5: Commit**

```bash
git add src/types.ts src/lib/supabase.ts
git commit -m "types: add Banner, Promotion types and mappers; Product.barcode"
git push origin main
```

---

## Task 3: Общие хелперы — `promo-status.ts`, `apply-promotion.ts`

**Files:**
- Create: `src/lib/promo-status.ts`
- Create: `src/lib/apply-promotion.ts`

**Interfaces:**
- Consumes: `Banner`, `Promotion` типы из Task 2.
- Produces: `effectiveState(row, now?)`, `isVisibleToCustomers(row, now?)` из `promo-status.ts`; `applyActivePromotion(product, promotionsByProductId)` из `apply-promotion.ts` — используются в Task 6 и 7.

- [x] **Step 1: `src/lib/promo-status.ts`**

```ts
// camelCase, как в Banner/Promotion (src/types.ts) — effectiveState/isVisibleToCustomers принимают
// сами объекты Banner/Promotion напрямую (в BannerManager.tsx/PromotionManager.tsx), а apply-promotion.ts
// передаёт то же самое, только явно перечисленными полями. Один и тот же регистр везде, без конверсий.
type StatusRow = { status: "draft" | "active" | "disabled"; startAt: string; endAt: string };

export type EffectiveState = "draft" | "scheduled" | "active" | "expired" | "disabled";

/**
 * «Активен» в базе — не значит видим клиенту прямо сейчас: период может ещё не начаться или уже
 * закончиться. Одна функция считает реальное состояние — используется и в API (что видит клиент),
 * и в админке (какой бейдж показать), чтобы эти два места никогда не разошлись.
 */
export function effectiveState(row: StatusRow, now: Date = new Date()): EffectiveState {
  if (row.status === "disabled") return "disabled";
  if (row.status === "draft") return "draft";
  // status === "active" отсюда и ниже
  const start = new Date(row.startAt);
  const end = new Date(row.endAt);
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "active";
}

export function isVisibleToCustomers(row: StatusRow, now: Date = new Date()): boolean {
  return effectiveState(row, now) === "active";
}
```

- [x] **Step 2: `src/lib/apply-promotion.ts`**

```ts
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
```

- [x] **Step 3: Проверить типы и линтер**

```bash
npx tsc --noEmit
npx eslint src/lib/promo-status.ts src/lib/apply-promotion.ts
```

- [x] **Step 4: Commit**

```bash
git add src/lib/promo-status.ts src/lib/apply-promotion.ts
git commit -m "lib: promo effective-state and price-merge helpers"
git push origin main
```

---

## Task 4: Admin API для баннеров — `/api/admin/banners`

**Files:**
- Create: `src/app/api/admin/banners/route.ts`
- Create: `src/app/api/admin/banners/[id]/route.ts`

**Interfaces:**
- Consumes: `mapBanner` (Task 2), `isStoreManager`, `getSessionProfile` (существующие, `src/lib/auth.ts`).
- Produces: `GET/POST /api/admin/banners`, `PUT/DELETE /api/admin/banners/[id]` — JSON `{ banners: Banner[] }` / `{ ok: true, banner: Banner }`.

- [x] **Step 1: `src/app/api/admin/banners/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBanner } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("banners")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ banners: rows.map(mapBanner) });
  } catch {
    return NextResponse.json({ banners: [], error: "База данных недоступна." });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json();
  const { title, subtitle, imageUrl, productId, buttonText, startAt, endAt, status, priority } = body;

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "Заполните название и даты показа." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: banner, error } = await supabase
      .from("banners")
      .insert({
        store_id: profile.storeId,
        product_id: productId || null,
        title,
        subtitle: subtitle || null,
        image_url: imageUrl || null,
        button_text: buttonText || null,
        start_at: startAt,
        end_at: endAt,
        status: status || "draft",
        priority: typeof priority === "number" ? priority : 0,
      })
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, banner: mapBanner(banner) });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить баннер." }, { status: 500 });
  }
}
```

- [x] **Step 2: `src/app/api/admin/banners/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBanner } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { title, subtitle, imageUrl, productId, buttonText, startAt, endAt, status, priority } = body;

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "Заполните название и даты показа." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: banner, error } = await supabase
      .from("banners")
      .update({
        product_id: productId || null,
        title,
        subtitle: subtitle || null,
        image_url: imageUrl || null,
        button_text: buttonText || null,
        start_at: startAt,
        end_at: endAt,
        status,
        priority: typeof priority === "number" ? priority : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("store_id", profile.storeId)
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, banner: mapBanner(banner) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить баннер." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("banners").delete().eq("id", id).eq("store_id", profile.storeId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить баннер." }, { status: 500 });
  }
}
```

- [x] **Step 3: Проверить типы и линтер**

```bash
npx tsc --noEmit
npx eslint src/app/api/admin/banners/route.ts src/app/api/admin/banners/[id]/route.ts
```

- [x] **Step 4: Commit**

```bash
git add src/app/api/admin/banners
git commit -m "api: admin CRUD for banners"
git push origin main
```

---

## Task 5: Admin API для акций — `/api/admin/promotions`

**Files:**
- Create: `src/app/api/admin/promotions/route.ts`
- Create: `src/app/api/admin/promotions/[id]/route.ts`

**Interfaces:**
- Consumes: `mapPromotion` (Task 2), `isStoreManager`, `getSessionProfile`.
- Produces: `GET/POST /api/admin/promotions`, `PUT/DELETE /api/admin/promotions/[id]`.

- [x] **Step 1: `src/app/api/admin/promotions/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapPromotion } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

function computePrices(basePrice: number, discountType: string, discountValue: number): number {
  if (discountType === "percent") return Math.round(basePrice * (1 - discountValue / 100));
  if (discountType === "fixed") return Math.max(0, basePrice - discountValue);
  return discountValue; // special_price — discountValue сам является новой ценой
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("promotions")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ promotions: rows.map(mapPromotion) });
  } catch {
    return NextResponse.json({ promotions: [], error: "База данных недоступна." });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json();
  const { title, productId, discountType, discountValue, showOldPrice, startAt, endAt, status } = body;

  if (!title || !productId || !discountType || !startAt || !endAt) {
    return NextResponse.json({ error: "Заполните название, товар, тип скидки и даты." }, { status: 400 });
  }
  if (!["percent", "fixed", "special_price"].includes(discountType)) {
    return NextResponse.json({ error: "Некорректный тип скидки." }, { status: 400 });
  }
  const value = Number(discountValue);
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Некорректная скидка/цена." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: product } = await supabase
      .from("products")
      .select("price")
      .eq("id", productId)
      .eq("store_id", profile.storeId)
      .maybeSingle();
    if (!product) return NextResponse.json({ error: "Товар не найден." }, { status: 404 });

    const oldPrice = product.price as number;
    const newPrice = computePrices(oldPrice, discountType, value);
    if (newPrice < 0) return NextResponse.json({ error: "Новая цена не может быть отрицательной." }, { status: 400 });

    const { data: promotion, error } = await supabase
      .from("promotions")
      .insert({
        store_id: profile.storeId,
        product_id: productId,
        title,
        discount_type: discountType,
        discount_value: value,
        old_price: oldPrice,
        new_price: newPrice,
        show_old_price: showOldPrice !== false,
        start_at: startAt,
        end_at: endAt,
        status: status || "draft",
      })
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, promotion: mapPromotion(promotion) });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить акцию." }, { status: 500 });
  }
}
```

- [x] **Step 2: `src/app/api/admin/promotions/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapPromotion } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

function computePrices(basePrice: number, discountType: string, discountValue: number): number {
  if (discountType === "percent") return Math.round(basePrice * (1 - discountValue / 100));
  if (discountType === "fixed") return Math.max(0, basePrice - discountValue);
  return discountValue;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { title, productId, discountType, discountValue, showOldPrice, startAt, endAt, status } = body;

  if (!title || !productId || !discountType || !startAt || !endAt) {
    return NextResponse.json({ error: "Заполните название, товар, тип скидки и даты." }, { status: 400 });
  }
  const value = Number(discountValue);
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Некорректная скидка/цена." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: product } = await supabase
      .from("products")
      .select("price")
      .eq("id", productId)
      .eq("store_id", profile.storeId)
      .maybeSingle();
    if (!product) return NextResponse.json({ error: "Товар не найден." }, { status: 404 });

    const oldPrice = product.price as number;
    const newPrice = computePrices(oldPrice, discountType, value);
    if (newPrice < 0) return NextResponse.json({ error: "Новая цена не может быть отрицательной." }, { status: 400 });

    const { data: promotion, error } = await supabase
      .from("promotions")
      .update({
        product_id: productId,
        title,
        discount_type: discountType,
        discount_value: value,
        old_price: oldPrice,
        new_price: newPrice,
        show_old_price: showOldPrice !== false,
        start_at: startAt,
        end_at: endAt,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("store_id", profile.storeId)
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, promotion: mapPromotion(promotion) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить акцию." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("promotions").delete().eq("id", id).eq("store_id", profile.storeId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить акцию." }, { status: 500 });
  }
}
```

- [x] **Step 3: Проверить типы и линтер**

```bash
npx tsc --noEmit
npx eslint src/app/api/admin/promotions/route.ts src/app/api/admin/promotions/[id]/route.ts
```

- [x] **Step 4: Commit**

```bash
git add src/app/api/admin/promotions
git commit -m "api: admin CRUD for promotions"
git push origin main
```

---

## Task 6: Публичные API — `/api/banners`, `/api/promotions`

**Files:**
- Create: `src/app/api/banners/route.ts`
- Create: `src/app/api/promotions/route.ts`

**Interfaces:**
- Consumes: `mapBanner`, `mapPromotion` (Task 2), `isVisibleToCustomers` (Task 3), `applyActivePromotion`/`indexPromotionsByProduct` (Task 3), `mapProduct` (existing).
- Produces: `GET /api/banners` → `{ banners: Banner[] }` (только видимые клиенту, отсортированы по priority); `GET /api/promotions` → `{ products: Product[] }` (товары с уже применённой акционной ценой, отсортированы по `endAt` возрастанию).

- [x] **Step 1: `src/app/api/banners/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBanner } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { isVisibleToCustomers } from "@/lib/promo-status";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("banners")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .eq("status", "active")
      .order("priority", { ascending: true });
    if (error) throw error;

    const banners = rows
      .map(mapBanner)
      .filter((b) => b.productId !== null && isVisibleToCustomers(b));

    return NextResponse.json({ banners });
  } catch {
    return NextResponse.json({ banners: [], error: "База данных недоступна." });
  }
}
```

- [x] **Step 2: `src/app/api/promotions/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapPromotion, mapProduct } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("promotions")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .eq("status", "active")
      .not("product_id", "is", null)
      .order("end_at", { ascending: true });
    if (error) throw error;

    const promotions = rows.map(mapPromotion);
    const byProduct = indexPromotionsByProduct(promotions);
    const productIds = [...byProduct.keys()];
    if (productIds.length === 0) return NextResponse.json({ products: [] });

    const { data: productRows } = await supabase.from("products").select("*").in("id", productIds).eq("in_stock", true);
    const productsById = new Map((productRows ?? []).map((p) => [p.id as string, mapProduct(p)]));

    // Порядок — как у акций (по дате окончания), не как вернула таблица products.
    const products = promotions
      .filter((p) => p.productId && productsById.has(p.productId))
      .map((p) => applyActivePromotion(productsById.get(p.productId as string)!, byProduct));

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [], error: "База данных недоступна." });
  }
}
```

- [x] **Step 3: Проверить типы и линтер**

```bash
npx tsc --noEmit
npx eslint src/app/api/banners/route.ts src/app/api/promotions/route.ts
```

- [x] **Step 4: Commit**

```bash
git add src/app/api/banners src/app/api/promotions
git commit -m "api: public active banners and promotions endpoints"
git push origin main
```

---

## Task 7: Подмешать акционную цену и штрихкод в существующие эндпоинты товаров

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`
- Modify: `src/app/api/products/bestsellers/route.ts`
- Modify: `src/app/api/admin/catalog/route.ts` (уже отдаёт `barcode` через `mapProduct` после Task 2 — здесь только проверка, без правок кода)

**Interfaces:**
- Consumes: `applyActivePromotion`, `indexPromotionsByProduct` (Task 3), `mapPromotion` (Task 2).
- Produces: цена товара в каталоге/поиске/детали/хитах — уже с учётом активной акции; поиск по `q` теперь matches и `sku`.

- [x] **Step 1: `src/app/api/products/route.ts` — добавить поиск по артикулу, барcode в `toProduct`, подмешать акции**

Найти локальную функцию `toProduct` (в начале файла) и заменить целиком:

```ts
function toProduct(
  p: Record<string, unknown>,
  branchInfo: { quantity: number | null; availableAtOtherBranch: boolean } | null
) {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode ?? null,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    description: p.description,
    characteristics: p.characteristics,
    purpose: p.purpose,
    nameKy: p.name_ky ?? null,
    descriptionKy: p.description_ky ?? null,
    characteristicsKy: p.characteristics_ky ?? null,
    purposeKy: p.purpose_ky ?? null,
    inStock: p.in_stock,
    imageUrl: p.image_url,
    createdAt: p.created_at,
    attributes: p.attributes ?? undefined,
    ...(branchInfo ? { branchQuantity: branchInfo.quantity, availableAtOtherBranch: branchInfo.availableAtOtherBranch } : {}),
  };
}
```

Найти блок поиска (`if (q) { ... haystack ... }`) и заменить строку `haystack`:

```ts
  if (q) {
    products = products.filter((p) => {
      const haystack = [p.name, p.name_ky, p.brand, p.sku, p.category, p.description, p.description_ky, p.characteristics, p.purpose, p.purpose_ky]
        .filter((field): field is string => typeof field === "string")
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }
```

В начало файла добавить импорты:
```ts
import { mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import type { Product } from "@/types";
```

Найти место непосредственно перед `if (!branchId) { return NextResponse.json({ products: products.map((p) => toProduct(p, null)) }); }` и вставить загрузку активных акций магазина, применяя их к обеим веткам ответа (с филиалом и без). Заменить весь блок от `if (!branchId) {` до конца функции на:

```ts
  const { data: promoRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("store_id", profile.storeId)
    .eq("status", "active")
    .not("product_id", "is", null);
  const promotionsByProduct = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));
  const withPromo = (list: Product[]) => list.map((p) => applyActivePromotion(p, promotionsByProduct));

  if (!branchId) {
    return NextResponse.json({ products: withPromo(products.map((p) => toProduct(p, null)) as Product[]) });
  }

  const productIds = products.map((p) => p.id as string);
  const { data: stockRows } = await supabase
    .from("product_branch_stock")
    .select("product_id, branch_id, quantity")
    .in("product_id", productIds);

  const quantityAtBranch = new Map<string, number>();
  const hasBranchData = new Set<string>();
  const availableElsewhere = new Set<string>();
  for (const row of stockRows ?? []) {
    const productId = row.product_id as string;
```

**Важно:** дальше в файле уже есть цикл `for (const row of stockRows ?? []) { ... }` и код ниже него (построение `quantityAtBranch`/`availableElsewhere`/финальный `return`) — этот код НЕ трогать, он остаётся как есть, только самая последняя строка (`return NextResponse.json({ products: products.map(...) })`, если она использует `toProduct` напрямую) должна оборачивать результат в `withPromo(...)`, аналогично ветке `!branchId` выше. Найти этот финальный `return` и обернуть его массив в `withPromo(...)` тем же способом.

- [x] **Step 2: `src/app/api/products/[id]/route.ts` — barcode, attributes, акция**

Заменить `toProduct` целиком:

```ts
function toProduct(p: Record<string, unknown>) {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode ?? null,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    description: p.description,
    characteristics: p.characteristics,
    purpose: p.purpose,
    nameKy: p.name_ky ?? null,
    descriptionKy: p.description_ky ?? null,
    characteristicsKy: p.characteristics_ky ?? null,
    purposeKy: p.purpose_ky ?? null,
    inStock: p.in_stock,
    imageUrl: p.image_url,
    attributes: p.attributes ?? undefined,
  };
}
```

В начало файла добавить импорты:
```ts
import { mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import type { Product } from "@/types";
```

После блока, где найден `product` (`if (error || !product) { ... }`), перед веткой `if (!branchId)`, добавить:

```ts
  const { data: promoRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("store_id", profile.storeId)
    .eq("status", "active")
    .eq("product_id", id);
  const promotionsByProduct = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));
  const withPromo = (p: Product) => applyActivePromotion(p, promotionsByProduct);
```

Заменить `return NextResponse.json({ product: toProduct(product) });` на:
```ts
    return NextResponse.json({ product: withPromo(toProduct(product) as Product) });
```

Заменить финальный `return NextResponse.json({ product: { ...toProduct(product), branchQuantity: ..., availableAtOtherBranch: ... } })` — обернуть весь объект в `withPromo(...)`:
```ts
  return NextResponse.json({
    product: withPromo({
      ...toProduct(product),
      branchQuantity: quantityAtBranch,
      availableAtOtherBranch: (quantityAtBranch === 0 || quantityAtBranch === null) && availableAtOtherBranch,
    } as Product),
  });
```

- [x] **Step 3: `src/app/api/products/bestsellers/route.ts` — та же подмена цены**

В начало файла добавить импорты:
```ts
import { mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import type { Product } from "@/types";
```

Перед финальным `return NextResponse.json({ products: picked.map((p) => ({ ... })) });` добавить:

```ts
  const { data: promoRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("store_id", profile.storeId)
    .eq("status", "active")
    .not("product_id", "is", null);
  const promotionsByProduct = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));
```

Обернуть каждый элемент в маппинге результата в `applyActivePromotion(..., promotionsByProduct)` — заменить `return NextResponse.json({ products: picked.map((p) => ({` ... `})) });` так, чтобы каждый смапленный объект товара проходил через `applyActivePromotion`:

```ts
  return NextResponse.json({
    products: picked.map((p) =>
      applyActivePromotion(
        {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode ?? null,
          name: p.name,
          brand: p.brand,
          category: p.category,
          price: p.price,
          description: p.description,
          characteristics: p.characteristics,
          purpose: p.purpose,
          nameKy: p.name_ky ?? null,
          descriptionKy: p.description_ky ?? null,
          characteristicsKy: p.characteristics_ky ?? null,
          purposeKy: p.purpose_ky ?? null,
          inStock: p.in_stock,
          imageUrl: p.image_url,
          createdAt: p.created_at,
          attributes: p.attributes ?? undefined,
        } as Product,
        promotionsByProduct
      )
    ),
  });
```

- [x] **Step 4: Проверить, что `src/app/api/admin/catalog/route.ts` уже отдаёт `barcode`**

Ничего менять не нужно — эта задача уже решена в Task 2 (`mapProduct` в `src/lib/supabase.ts` теперь включает `barcode`, а этот роут уже вызывает `products.map(mapProduct)`). Просто прочитать файл и убедиться, что это так.

- [x] **Step 5: Проверить типы, линтер и сборку**

```bash
npx tsc --noEmit
npx eslint src/app/api/products/route.ts src/app/api/products/[id]/route.ts src/app/api/products/bestsellers/route.ts
npm run build
```

- [x] **Step 6: Commit**

```bash
git add src/app/api/products src/app/api/admin/catalog
git commit -m "api: merge active-promotion price into catalog/detail/bestsellers; barcode; sku search"
git push origin main
```

---

## Task 8: `ProductPicker` — общий поиск товара для форм баннера/акции

**Files:**
- Create: `src/components/ProductPicker.tsx`

**Interfaces:**
- Consumes: `GET /api/products?q=` (уже умеет искать по sku после Task 7).
- Produces: `<ProductPicker value={productId} product={pickedProductSummary} onChange={(product) => void} />` — используется в Task 9 и 10.

- [x] **Step 1: Написать компонент**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import type { Product } from "@/types";

export type PickedProduct = { id: string; name: string; brand: string; imageUrl: string | null; price: number };

export function ProductPicker({
  picked,
  onPick,
}: {
  picked: PickedProduct | null;
  onPick: (product: PickedProduct | null) => void;
}) {
  const t = useTranslations("productPicker");
  const price = usePrice();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(query.trim())}`)
        .then((res) => (res.ok ? res.json() : { products: [] }))
        .then((data: { products: Product[] }) => setResults((data.products ?? []).slice(0, 8)))
        .catch(() => setResults([]));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (picked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-card p-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-accent-soft shrink-0">
          {picked.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picked.imageUrl} alt={picked.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-muted font-medium truncate">{picked.brand}</div>
          <div className="text-sm font-medium truncate">{picked.name}</div>
          <div className="text-xs text-muted">{price(picked.price)}</div>
        </div>
        <button
          type="button"
          onClick={() => onPick(null)}
          aria-label={t("clear")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-error shrink-0"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" strokeWidth={2} aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("placeholder")}
          className="w-full rounded-lg border border-black/10 bg-background pl-10 pr-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-black/10 bg-card shadow-[var(--shadow-card)] max-h-72 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onPick({ id: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl, price: product.price });
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 p-2.5 text-left transition hover:bg-black/5 border-b border-black/5 last:border-0"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-accent-soft shrink-0">
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted font-medium truncate">{product.brand}</div>
                <div className="text-sm truncate">{product.name}</div>
              </div>
              <div className="text-xs text-muted shrink-0">{price(product.price)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 2: Добавить переводы `productPicker` в `messages/ru.json` и `messages/ky.json`**

В `messages/ru.json`, рядом с другими небольшими namespace (например, после `"orderLink"`), добавить:
```json
  "productPicker": {
    "placeholder": "Найти товар: название, бренд или артикул",
    "clear": "Выбрать другой товар"
  },
```

В `messages/ky.json` на том же месте:
```json
  "productPicker": {
    "placeholder": "Товар табуу: аты, бренди же артикулу",
    "clear": "Башка товар тандоо"
  },
```

- [x] **Step 3: Проверить типы, линтер, валидность JSON**

```bash
npx tsc --noEmit
npx eslint src/components/ProductPicker.tsx
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ky.json','utf8')); console.log('ok')"
```

- [x] **Step 4: Commit**

```bash
git add src/components/ProductPicker.tsx messages/ru.json messages/ky.json
git commit -m "ui: shared product search-and-pick component for banner/promotion forms"
git push origin main
```

---

## Task 9: `BannerManager` — список и форма баннеров в админке

**Files:**
- Create: `src/components/BannerManager.tsx`

**Interfaces:**
- Consumes: `ProductPicker` (Task 8), `/api/admin/banners` (Task 4), `effectiveState` (Task 3), `Banner` тип (Task 2), `Chip` (`src/components/ui/Chip.tsx`), `Button` (`src/components/ui/Button.tsx`).
- Produces: `<BannerManager />` — монтируется в Task 11.

- [x] **Step 1: Написать компонент** (список карточками, фильтр, создание/редактирование инлайн, аплоад картинки — тот же приём, что `AvatarUploader.tsx`, но без обрезки в квадрат, пропорция как у `HeroSlider` — 16:11)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Eye, Pause, Play, Trash2, Loader2, ImageOff } from "lucide-react";
import { ProductPicker, type PickedProduct } from "@/components/ProductPicker";
import { BannerInterstitial } from "@/components/BannerInterstitial";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { effectiveState, type EffectiveState } from "@/lib/promo-status";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Banner } from "@/types";

const TARGET_W = 960;
const TARGET_H = 660; // 16:11, как HeroSlider

async function toBannerJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const srcRatio = bitmap.width / bitmap.height;
  const dstRatio = TARGET_W / TARGET_H;
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (srcRatio > dstRatio) {
    sw = bitmap.height * dstRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / dstRatio;
    sy = (bitmap.height - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85));
}

type FormState = {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  buttonText: string;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
  priority: string;
  product: PickedProduct | null;
};

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  imageUrl: null,
  buttonText: "",
  startAt: "",
  endAt: "",
  status: "draft",
  priority: "0",
  product: null,
};

function toDatetimeLocal(iso: string): string {
  return iso ? new Date(iso).toISOString().slice(0, 16) : "";
}

function bannerToForm(b: Banner): FormState {
  return {
    title: b.title,
    subtitle: b.subtitle ?? "",
    imageUrl: b.imageUrl,
    buttonText: b.buttonText ?? "",
    startAt: toDatetimeLocal(b.startAt),
    endAt: toDatetimeLocal(b.endAt),
    status: b.status,
    priority: String(b.priority),
    product: b.product ? { id: b.product.id, name: b.product.name, brand: b.product.brand, imageUrl: b.product.imageUrl, price: b.product.price } : null,
  };
}

const STATE_LABEL_KEY: Record<EffectiveState, string> = {
  draft: "draft",
  scheduled: "scheduled",
  active: "active",
  expired: "expired",
  disabled: "disabled",
};

const inputClass = "w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

function BannerForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: FormState;
  onCancel: () => void;
  onSaved: (form: FormState) => Promise<void>;
}) {
  const t = useTranslations("bannerManager");
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("choosePhoto"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("auth");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const storeId = session ? (await supabase.from("profiles").select("store_id").eq("id", user.id).single()).data?.store_id : null;
      if (!storeId) throw new Error("store");
      const blob = await toBannerJpeg(file);
      const path = `${storeId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      setForm((f) => ({ ...f, imageUrl: `${data.publicUrl}?v=${Date.now()}` }));
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startAt || !form.endAt) {
      setError(t("missing"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaved(form);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const previewBanner: Banner = {
    id: "preview",
    productId: form.product?.id ?? null,
    title: form.title || t("titlePlaceholder"),
    subtitle: form.subtitle || null,
    imageUrl: form.imageUrl,
    buttonText: form.buttonText || null,
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 86400000).toISOString(),
    status: "active",
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product: form.product,
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-3.5 mb-5">
      <input className={inputClass} placeholder={t("fields.title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea
        className={inputClass}
        placeholder={t("fields.subtitle")}
        rows={2}
        value={form.subtitle}
        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
      />

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.image")}</div>
        {form.imageUrl ? (
          <div className="relative rounded-xl overflow-hidden aspect-[16/11] bg-accent-soft mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-xl aspect-[16/11] bg-accent-soft flex items-center justify-center mb-2 text-muted">
            <ImageOff className="size-8" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-accent cursor-pointer">
          {uploading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {form.imageUrl ? t("changePhoto") : t("addPhoto")}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files?.[0])} />
        </label>
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.product")}</div>
        <ProductPicker picked={form.product} onPick={(product) => setForm({ ...form, product })} />
      </div>

      <input className={inputClass} placeholder={t("fields.buttonText")} value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.startAt")}</div>
          <input type="datetime-local" className={inputClass} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
        </div>
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.endAt")}</div>
          <input type="datetime-local" className={inputClass} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.status")}</div>
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}>
            <option value="draft">{t("status.draft")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="disabled">{t("status.disabled")}</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.priority")}</div>
          <input
            type="number"
            className={inputClass}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => setPreview(true)}>
          <Eye className="size-4" strokeWidth={2} aria-hidden />
          {t("preview")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={saving} className="ml-auto">
          {t("save")}
        </Button>
      </div>

      {preview && <BannerInterstitial banner={previewBanner} onClose={() => setPreview(false)} />}
    </form>
  );
}

export function BannerManager() {
  const t = useTranslations("bannerManager");
  const locale = useLocale();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "expired">("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/banners")
      .then((res) => res.json())
      .then((data: { banners?: Banner[] }) => setBanners(data.banners ?? []))
      .catch(() => setBanners([]));
  }

  useEffect(load, []);

  const filtered = (banners ?? []).filter((b) => {
    if (filter === "all") return true;
    return effectiveState(b) === filter;
  });

  async function submitForm(id: string | null, form: FormState) {
    const body = {
      title: form.title,
      subtitle: form.subtitle || null,
      imageUrl: form.imageUrl,
      productId: form.product?.id ?? null,
      buttonText: form.buttonText || null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      status: form.status,
      priority: Number(form.priority) || 0,
    };
    const res = await fetch(id ? `/api/admin/banners/${id}` : "/api/admin/banners", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("save");
    setCreating(false);
    setEditingId(null);
    load();
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("deleteFailed"));
      return;
    }
    load();
  }

  async function toggleDisabled(banner: Banner) {
    const nextStatus = banner.status === "disabled" ? "active" : "disabled";
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        productId: banner.productId,
        buttonText: banner.buttonText,
        startAt: banner.startAt,
        endAt: banner.endAt,
        status: nextStatus,
        priority: banner.priority,
      }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto">
          <Chip label={t("filters.all")} active={filter === "all"} onClick={() => setFilter("all")} />
          <Chip label={t("filters.active")} active={filter === "active"} onClick={() => setFilter("active")} />
          <Chip label={t("filters.draft")} active={filter === "draft"} onClick={() => setFilter("draft")} />
          <Chip label={t("filters.expired")} active={filter === "expired"} onClick={() => setFilter("expired")} />
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)} className="shrink-0 ml-2">
            <Plus className="size-4" strokeWidth={2.25} aria-hidden />
            {t("create")}
          </Button>
        )}
      </div>

      {creating && <BannerForm initial={EMPTY_FORM} onCancel={() => setCreating(false)} onSaved={(form) => submitForm(null, form)} />}

      {error && <p className="text-sm text-error mb-3">{error}</p>}

      {banners === null && <p className="text-muted text-sm">{t("loading")}</p>}
      {banners !== null && filtered.length === 0 && <p className="text-muted text-sm">{t("empty")}</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((banner) =>
          editingId === banner.id ? (
            <BannerForm
              key={banner.id}
              initial={bannerToForm(banner)}
              onCancel={() => setEditingId(null)}
              onSaved={(form) => submitForm(banner.id, form)}
            />
          ) : (
            <div key={banner.id} className="bg-card rounded-2xl border border-black/5 p-4 flex gap-3.5 items-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent-soft shrink-0">
                {banner.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{banner.title}</div>
                <div className="text-xs text-muted truncate">{banner.product?.name ?? t("noProduct")}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] rounded-full bg-accent-soft text-accent px-2 py-0.5">
                    {t(`status.${STATE_LABEL_KEY[effectiveState(banner)]}`)}
                  </span>
                  <span className="text-[11px] text-muted">{t("priorityShort", { n: banner.priority })}</span>
                  <span className="text-[11px] text-muted">
                    {new Date(banner.startAt).toLocaleDateString(locale)} – {new Date(banner.endAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(banner.id)}
                  aria-label={t("edit")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  <Eye className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  onClick={() => toggleDisabled(banner)}
                  aria-label={banner.status === "disabled" ? t("enable") : t("disable")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  {banner.status === "disabled" ? <Play className="size-4" strokeWidth={2} aria-hidden /> : <Pause className="size-4" strokeWidth={2} aria-hidden />}
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  aria-label={t("delete")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-error-soft hover:text-error"
                >
                  <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Добавить переводы `bannerManager` в `messages/ru.json`**

```json
  "bannerManager": {
    "create": "Создать баннер",
    "loading": "Загружаем…",
    "empty": "Баннеров пока нет.",
    "noProduct": "Товар не выбран",
    "edit": "Редактировать",
    "enable": "Включить",
    "disable": "Отключить",
    "delete": "Удалить",
    "deleteFailed": "Не удалось удалить баннер.",
    "preview": "Предпросмотр",
    "cancel": "Отмена",
    "save": "Сохранить",
    "saveFailed": "Не удалось сохранить.",
    "missing": "Заполните название и даты показа.",
    "choosePhoto": "Выберите файл изображения.",
    "uploadFailed": "Не удалось загрузить изображение.",
    "addPhoto": "Добавить изображение",
    "changePhoto": "Заменить изображение",
    "titlePlaceholder": "Заголовок баннера",
    "priorityShort": "приоритет {n}",
    "filters": { "all": "Все", "active": "Активные", "draft": "Черновики", "expired": "Завершённые" },
    "fields": {
      "title": "Название / заголовок баннера",
      "subtitle": "Подзаголовок / описание",
      "image": "Изображение баннера",
      "product": "Товар",
      "buttonText": "Текст кнопки",
      "startAt": "Начало показа",
      "endAt": "Окончание показа",
      "status": "Статус",
      "priority": "Приоритет"
    },
    "status": { "draft": "Черновик", "scheduled": "Запланирован", "active": "Активен", "expired": "Завершён", "disabled": "Отключён" }
  },
```

Тот же блок с переводом на кыргызский в `messages/ky.json`:

```json
  "bannerManager": {
    "create": "Баннер түзүү",
    "loading": "Жүктөлүүдө…",
    "empty": "Баннерлер азырынча жок.",
    "noProduct": "Товар тандалган эмес",
    "edit": "Түзөтүү",
    "enable": "Күйгүзүү",
    "disable": "Өчүрүү",
    "delete": "Өчүрүп салуу",
    "deleteFailed": "Баннерди өчүрүү мүмкүн болгон жок.",
    "preview": "Алдын ала көрүү",
    "cancel": "Жокко чыгаруу",
    "save": "Сактоо",
    "saveFailed": "Сактоо мүмкүн болгон жок.",
    "missing": "Аталышын жана көрсөтүү мөөнөттөрүн толтуруңуз.",
    "choosePhoto": "Сүрөт файлын тандаңыз.",
    "uploadFailed": "Сүрөттү жүктөө мүмкүн болгон жок.",
    "addPhoto": "Сүрөт кошуу",
    "changePhoto": "Сүрөттү алмаштыруу",
    "titlePlaceholder": "Баннердин аталышы",
    "priorityShort": "приоритет {n}",
    "filters": { "all": "Баары", "active": "Активдүү", "draft": "Черновиктер", "expired": "Аяктаган" },
    "fields": {
      "title": "Аталышы / баннердин темасы",
      "subtitle": "Кошумча тема / сүрөттөмө",
      "image": "Баннердин сүрөтү",
      "product": "Товар",
      "buttonText": "Баттон тексти",
      "startAt": "Көрсөтүүнүн башталышы",
      "endAt": "Көрсөтүүнүн аяктоосу",
      "status": "Статус",
      "priority": "Приоритет"
    },
    "status": { "draft": "Черновик", "scheduled": "Пландалган", "active": "Активдүү", "expired": "Аяктаган", "disabled": "Өчүрүлгөн" }
  },
```

- [x] **Step 3: Проверить типы, линтер, JSON** (`BannerInterstitial` появится в Task 12 — до тех пор `tsc`/сборка на этой задаче не пройдут из-за отсутствующего импорта; поэтому Step 3 этой задачи — временно ПРОПУСТИТЬ строгую проверку и сразу закоммитить, а полную проверку сделать в конце Task 12, где `BannerInterstitial` уже существует. Явно отметить в коммите, что задача не самодостаточна.)

```bash
npx eslint src/components/BannerManager.tsx || true
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ky.json','utf8')); console.log('ok')"
```

- [x] **Step 4: Commit**

```bash
git add src/components/BannerManager.tsx messages/ru.json messages/ky.json
git commit -m "ui: BannerManager (list, inline create/edit form, upload, preview) — needs Task 12's BannerInterstitial to build"
git push origin main
```

---

## Task 10: `PromotionManager` — список и форма акций в админке

**Files:**
- Create: `src/components/PromotionManager.tsx`

**Interfaces:**
- Consumes: `ProductPicker` (Task 8), `/api/admin/promotions` (Task 5), `effectiveState` (Task 3), `Promotion` тип (Task 2).
- Produces: `<PromotionManager />` — монтируется в Task 11.

- [x] **Step 1: Написать компонент**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Pause, Play, Trash2 } from "lucide-react";
import { ProductPicker, type PickedProduct } from "@/components/ProductPicker";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { usePrice } from "@/lib/use-price";
import { effectiveState, type EffectiveState } from "@/lib/promo-status";
import type { Promotion } from "@/types";

type DiscountType = "percent" | "fixed" | "special_price";

type FormState = {
  title: string;
  product: PickedProduct | null;
  discountType: DiscountType;
  discountValue: string;
  showOldPrice: boolean;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
};

const EMPTY_FORM: FormState = {
  title: "",
  product: null,
  discountType: "percent",
  discountValue: "",
  showOldPrice: true,
  startAt: "",
  endAt: "",
  status: "draft",
};

function toDatetimeLocal(iso: string): string {
  return iso ? new Date(iso).toISOString().slice(0, 16) : "";
}

function promotionToForm(p: Promotion): FormState {
  return {
    title: p.title,
    product: p.product ? { id: p.product.id, name: p.product.name, brand: p.product.brand, imageUrl: p.product.imageUrl, price: p.product.price } : null,
    discountType: p.discountType,
    discountValue: p.discountType === "special_price" ? String(p.newPrice) : String(p.discountValue ?? ""),
    showOldPrice: p.showOldPrice,
    startAt: toDatetimeLocal(p.startAt),
    endAt: toDatetimeLocal(p.endAt),
    status: p.status,
  };
}

function computePreview(basePrice: number | undefined, type: DiscountType, value: string): { oldPrice: number; newPrice: number } | null {
  if (basePrice === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (type === "percent") return { oldPrice: basePrice, newPrice: Math.round(basePrice * (1 - n / 100)) };
  if (type === "fixed") return { oldPrice: basePrice, newPrice: Math.max(0, basePrice - n) };
  return { oldPrice: basePrice, newPrice: n };
}

const inputClass = "w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

const STATE_LABEL_KEY: Record<EffectiveState, string> = {
  draft: "draft",
  scheduled: "scheduled",
  active: "active",
  expired: "expired",
  disabled: "disabled",
};

function PromotionForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: FormState;
  onCancel: () => void;
  onSaved: (form: FormState) => Promise<void>;
}) {
  const t = useTranslations("promotionManager");
  const price = usePrice();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = computePreview(form.product?.price, form.discountType, form.discountValue);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.product || !form.startAt || !form.endAt || !form.discountValue) {
      setError(t("missing"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaved(form);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-3.5 mb-5">
      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.product")}</div>
        <ProductPicker picked={form.product} onPick={(product) => setForm({ ...form, product })} />
      </div>

      <input className={inputClass} placeholder={t("fields.title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.discountType")}</div>
        <div className="flex gap-2">
          {(["percent", "fixed", "special_price"] as DiscountType[]).map((type) => (
            <Chip key={type} label={t(`discountType.${type}`)} active={form.discountType === type} onClick={() => setForm({ ...form, discountType: type, showOldPrice: type !== "special_price" })} />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">{t(`discountValueLabel.${form.discountType}`)}</div>
        <input
          type="number"
          className={inputClass}
          value={form.discountValue}
          onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
        />
      </div>

      {preview && (
        <div className="text-sm bg-accent-soft text-accent-strong rounded-lg px-3.5 py-2.5">
          {t("previewLine", {
            old: price(preview.oldPrice),
            new: price(preview.newPrice),
            percent: preview.oldPrice > 0 ? Math.round((1 - preview.newPrice / preview.oldPrice) * 100) : 0,
          })}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.showOldPrice} onChange={(e) => setForm({ ...form, showOldPrice: e.target.checked })} className="size-4 accent-accent" />
        {t("fields.showOldPrice")}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.startAt")}</div>
          <input type="datetime-local" className={inputClass} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
        </div>
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.endAt")}</div>
          <input type="datetime-local" className={inputClass} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
        </div>
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.status")}</div>
        <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}>
          <option value="draft">{t("status.draft")}</option>
          <option value="active">{t("status.active")}</option>
          <option value="disabled">{t("status.disabled")}</option>
        </select>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={saving} className="ml-auto">
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

export function PromotionManager() {
  const t = useTranslations("promotionManager");
  const locale = useLocale();
  const price = usePrice();
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "expired">("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/promotions")
      .then((res) => res.json())
      .then((data: { promotions?: Promotion[] }) => setPromotions(data.promotions ?? []))
      .catch(() => setPromotions([]));
  }

  useEffect(load, []);

  const filtered = (promotions ?? []).filter((p) => filter === "all" || effectiveState(p) === filter);

  async function submitForm(id: string | null, form: FormState) {
    const body = {
      title: form.title,
      productId: form.product?.id,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      showOldPrice: form.showOldPrice,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      status: form.status,
    };
    const res = await fetch(id ? `/api/admin/promotions/${id}` : "/api/admin/promotions", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("save");
    setCreating(false);
    setEditingId(null);
    load();
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("deleteFailed"));
      return;
    }
    load();
  }

  async function toggleDisabled(promotion: Promotion) {
    await fetch(`/api/admin/promotions/${promotion.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: promotion.title,
        productId: promotion.productId,
        discountType: promotion.discountType,
        discountValue: promotion.discountType === "special_price" ? promotion.newPrice : promotion.discountValue,
        showOldPrice: promotion.showOldPrice,
        startAt: promotion.startAt,
        endAt: promotion.endAt,
        status: promotion.status === "disabled" ? "active" : "disabled",
      }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto">
          <Chip label={t("filters.all")} active={filter === "all"} onClick={() => setFilter("all")} />
          <Chip label={t("filters.active")} active={filter === "active"} onClick={() => setFilter("active")} />
          <Chip label={t("filters.draft")} active={filter === "draft"} onClick={() => setFilter("draft")} />
          <Chip label={t("filters.expired")} active={filter === "expired"} onClick={() => setFilter("expired")} />
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)} className="shrink-0 ml-2">
            <Plus className="size-4" strokeWidth={2.25} aria-hidden />
            {t("create")}
          </Button>
        )}
      </div>

      {creating && <PromotionForm initial={EMPTY_FORM} onCancel={() => setCreating(false)} onSaved={(form) => submitForm(null, form)} />}

      {error && <p className="text-sm text-error mb-3">{error}</p>}

      {promotions === null && <p className="text-muted text-sm">{t("loading")}</p>}
      {promotions !== null && filtered.length === 0 && <p className="text-muted text-sm">{t("empty")}</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((promotion) =>
          editingId === promotion.id ? (
            <PromotionForm
              key={promotion.id}
              initial={promotionToForm(promotion)}
              onCancel={() => setEditingId(null)}
              onSaved={(form) => submitForm(promotion.id, form)}
            />
          ) : (
            <div key={promotion.id} className="bg-card rounded-2xl border border-black/5 p-4 flex gap-3.5 items-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent-soft shrink-0">
                {promotion.product?.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={promotion.product.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{promotion.title}</div>
                <div className="text-xs text-muted truncate">{promotion.product?.name ?? t("noProduct")}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] rounded-full bg-accent-soft text-accent px-2 py-0.5">
                    {t(`status.${STATE_LABEL_KEY[effectiveState(promotion)]}`)}
                  </span>
                  <span className="text-[11px] text-muted line-through">{price(promotion.oldPrice)}</span>
                  <span className="text-[11px] font-medium text-accent">{price(promotion.newPrice)}</span>
                  <span className="text-[11px] text-muted">
                    {new Date(promotion.startAt).toLocaleDateString(locale)} – {new Date(promotion.endAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(promotion.id)}
                  aria-label={t("edit")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  <Pencil className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  onClick={() => toggleDisabled(promotion)}
                  aria-label={promotion.status === "disabled" ? t("enable") : t("disable")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  {promotion.status === "disabled" ? <Play className="size-4" strokeWidth={2} aria-hidden /> : <Pause className="size-4" strokeWidth={2} aria-hidden />}
                </button>
                <button
                  onClick={() => handleDelete(promotion.id)}
                  aria-label={t("delete")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-error-soft hover:text-error"
                >
                  <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Добавить переводы `promotionManager` в `messages/ru.json`**

```json
  "promotionManager": {
    "create": "Создать акцию",
    "loading": "Загружаем…",
    "empty": "Акций пока нет.",
    "noProduct": "Товар не выбран",
    "edit": "Редактировать",
    "enable": "Включить",
    "disable": "Отключить",
    "delete": "Удалить",
    "deleteFailed": "Не удалось удалить акцию.",
    "cancel": "Отмена",
    "save": "Сохранить",
    "saveFailed": "Не удалось сохранить.",
    "missing": "Заполните товар, название, скидку и даты.",
    "previewLine": "Было {old} → станет {new} (-{percent}%)",
    "filters": { "all": "Все", "active": "Активные", "draft": "Черновики", "expired": "Завершённые" },
    "fields": {
      "product": "Товар",
      "title": "Название акции",
      "discountType": "Тип скидки",
      "showOldPrice": "Показывать старую цену зачёркнутой",
      "startAt": "Начало",
      "endAt": "Окончание",
      "status": "Статус"
    },
    "discountType": { "percent": "Процент", "fixed": "Фикс. сумма", "special_price": "Новая цена" },
    "discountValueLabel": { "percent": "Скидка, %", "fixed": "Скидка, сом", "special_price": "Новая цена, сом" },
    "status": { "draft": "Черновик", "scheduled": "Запланирована", "active": "Активна", "expired": "Завершена", "disabled": "Отключена" }
  },
```

На кыргызском в `messages/ky.json`:

```json
  "promotionManager": {
    "create": "Акция түзүү",
    "loading": "Жүктөлүүдө…",
    "empty": "Акциялар азырынча жок.",
    "noProduct": "Товар тандалган эмес",
    "edit": "Түзөтүү",
    "enable": "Күйгүзүү",
    "disable": "Өчүрүү",
    "delete": "Өчүрүп салуу",
    "deleteFailed": "Акцияны өчүрүү мүмкүн болгон жок.",
    "cancel": "Жокко чыгаруу",
    "save": "Сактоо",
    "saveFailed": "Сактоо мүмкүн болгон жок.",
    "missing": "Товарды, аталышын, арзандатууну жана мөөнөттөрдү толтуруңуз.",
    "previewLine": "Болгон {old} → болот {new} (-{percent}%)",
    "filters": { "all": "Баары", "active": "Активдүү", "draft": "Черновиктер", "expired": "Аяктаган" },
    "fields": {
      "product": "Товар",
      "title": "Акциянын аталышы",
      "discountType": "Арзандатуунун түрү",
      "showOldPrice": "Эски баасын сызылган түрдө көрсөтүү",
      "startAt": "Башталышы",
      "endAt": "Аяктоосу",
      "status": "Статус"
    },
    "discountType": { "percent": "Пайыз", "fixed": "Так сумма", "special_price": "Жаңы баасы" },
    "discountValueLabel": { "percent": "Арзандатуу, %", "fixed": "Арзандатуу, сом", "special_price": "Жаңы баасы, сом" },
    "status": { "draft": "Черновик", "scheduled": "Пландалган", "active": "Активдүү", "expired": "Аяктаган", "disabled": "Өчүрүлгөн" }
  },
```

- [x] **Step 3: Проверить типы, линтер, JSON**

```bash
npx tsc --noEmit
npx eslint src/components/PromotionManager.tsx
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ky.json','utf8')); console.log('ok')"
```

- [x] **Step 4: Commit**

```bash
git add src/components/PromotionManager.tsx messages/ru.json messages/ky.json
git commit -m "ui: PromotionManager (list, inline create/edit form, live price preview)"
git push origin main
```

---

## Task 11: Страница `/admin/promo` и пункт меню

**Files:**
- Create: `src/app/[locale]/(app)/admin/promo/page.tsx`
- Modify: `src/app/[locale]/(app)/admin/page.tsx`

**Interfaces:**
- Consumes: `BannerManager` (Task 9), `PromotionManager` (Task 10), `AdminPage` (существующий), `Chip` (существующий).
- Produces: маршрут `/admin/promo?tab=banners|promotions`; новый пункт в меню админки.

- [x] **Step 1: `src/app/[locale]/(app)/admin/promo/page.tsx`**

```tsx
"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { Chip } from "@/components/ui/Chip";
import { BannerManager } from "@/components/BannerManager";
import { PromotionManager } from "@/components/PromotionManager";

type Tab = "banners" | "promotions";

function PromoContent() {
  const t = useTranslations("adminPromo");
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "promotions" ? "promotions" : "banners";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      <div className="flex gap-2 mb-5">
        <Chip label={t("tabs.banners")} active={tab === "banners"} onClick={() => setTab("banners")} />
        <Chip label={t("tabs.promotions")} active={tab === "promotions"} onClick={() => setTab("promotions")} />
      </div>
      {tab === "banners" ? <BannerManager /> : <PromotionManager />}
    </AdminPage>
  );
}

export default function AdminPromoPage() {
  return (
    <Suspense fallback={null}>
      <PromoContent />
    </Suspense>
  );
}
```

- [x] **Step 2: Добавить переводы `adminPromo` в `messages/ru.json` и `messages/ky.json`**

`messages/ru.json`:
```json
  "adminPromo": {
    "title": "Реклама и акции",
    "subtitle": "Баннеры и акции на товары для клиентов.",
    "tabs": { "banners": "Баннеры", "promotions": "Акции" }
  },
```

`messages/ky.json`:
```json
  "adminPromo": {
    "title": "Реклама жана акциялар",
    "subtitle": "Кардарлар үчүн баннерлер жана товарларга акциялар.",
    "tabs": { "banners": "Баннерлер", "promotions": "Акциялар" }
  },
```

- [x] **Step 3: Добавить пункт меню в `src/app/[locale]/(app)/admin/page.tsx`**

Найти массив пунктов меню (там, где уже правился пункт `feedback` в предыдущей сессии) и добавить новый объект сразу после `catalog` (или после `feedback`, порядок не принципиален) — использовать иконку `Megaphone` из `lucide-react` (добавить в импорт lucide-react в начале файла, рядом с остальными иконками):

```ts
{ href: "/admin/promo", label: t("promo"), hint: t("promoHint"), icon: Megaphone, roles: ["owner", "admin"] },
```

- [x] **Step 4: Добавить переводы `admin.promo`/`admin.promoHint` в `messages/ru.json` и `messages/ky.json`**

Найти namespace `"admin"` (там же, где `"feedback"`/`"feedbackHint"` — правились в прошлой сессии) и добавить рядом:

`messages/ru.json`: `"promo": "Реклама и акции", "promoHint": "Баннеры и скидки на товары",`
`messages/ky.json`: `"promo": "Реклама жана акциялар", "promoHint": "Баннерлер жана товарларга арзандатуулар",`

- [x] **Step 5: Проверить типы, линтер, сборку**

```bash
npx tsc --noEmit
npx eslint "src/app/[locale]/(app)/admin/promo/page.tsx" "src/app/[locale]/(app)/admin/page.tsx"
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ky.json','utf8')); console.log('ok')"
npm run build
```

- [x] **Step 6: Commit**

```bash
git add "src/app/[locale]/(app)/admin/promo" "src/app/[locale]/(app)/admin/page.tsx" messages/ru.json messages/ky.json
git commit -m "ui: /admin/promo page with banners/promotions tabs; admin menu tile"
git push origin main
```

---

## Task 12: `BannerInterstitial` — всплывающий баннер у клиента

**Files:**
- Create: `src/components/BannerInterstitial.tsx`
- Modify: `src/lib/session-flags.ts`
- Modify: `src/app/[locale]/(app)/catalog/page.tsx`
- Modify: `src/app/[locale]/(app)/checkout/page.tsx`

**Interfaces:**
- Consumes: `Banner` тип (Task 2), `/api/banners` (Task 6), `tile-sheen` CSS-класс (уже есть в `globals.css`).
- Produces: `<BannerInterstitial banner={banner} onClose={() => void} />` (используется и в предпросмотре Task 9); `<BannerGate page="catalog" | "checkout" />` — монтируется в двух страницах.

- [x] **Step 1: `src/components/BannerInterstitial.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { Link } from "@/i18n/navigation";
import type { Banner } from "@/types";

/** Всплывающий баннер: клик по карточке (не по крестику) ведёт на товар. */
export function BannerInterstitial({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const t = useTranslations("bannerInterstitial");
  const price = usePrice();

  const body = (
    <div className="tile-sheen relative w-full max-w-sm overflow-hidden rounded-[28px] bg-card border border-black/5 shadow-xl animate-rise-in">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("close")}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition hover:scale-105 active:scale-90"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {banner.imageUrl && (
        <div className="relative aspect-[16/11] bg-accent-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-5">
        <div className="font-display text-xl leading-snug mb-1">{banner.title}</div>
        {banner.subtitle && <p className="text-sm text-muted mb-3">{banner.subtitle}</p>}
        {banner.product && (
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted truncate">{banner.product.name}</span>
            <span className="font-display text-foreground shrink-0 ml-2">{price(banner.product.price)}</span>
          </div>
        )}
        <div className="rounded-full bg-accent text-white px-4 py-3 text-sm font-medium text-center">
          {banner.buttonText || t("defaultCta")}
        </div>
      </div>
    </div>
  );

  if (!banner.productId) {
    // Предпросмотр без товара (форма ещё не сохранена) — не кликабельно.
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} />
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} />
      <Link href={`/product/${banner.productId}`} onClick={onClose} className="contents">
        {body}
      </Link>
    </div>
  );
}
```

- [x] **Step 2: Добавить два новых ключа в `session-flags.ts`**

Открыть `src/lib/session-flags.ts`, найти секцию `PRODUCT_PROMPT_KEY`/`wasProductPromptShown`/`markProductPromptShown` (конец файла) и добавить после неё:

```ts
// Всплывающий рекламный баннер — не чаще одного раза за посещение на каждый из двух входов:
// в каталог и в оформление заказа.
const CATALOG_AD_KEY = "beautyai-ad-catalog-shown";
const CHECKOUT_AD_KEY = "beautyai-ad-checkout-shown";

export const wasCatalogAdShown = () => readFlag(CATALOG_AD_KEY);
export const markCatalogAdShown = () => writeFlag(CATALOG_AD_KEY);
export const wasCheckoutAdShown = () => readFlag(CHECKOUT_AD_KEY);
export const markCheckoutAdShown = () => writeFlag(CHECKOUT_AD_KEY);
```

- [x] **Step 3: Добавить `BannerGate` в конец `src/components/BannerInterstitial.tsx`**

```tsx
import { useEffect, useState } from "react";
import { wasCatalogAdShown, markCatalogAdShown, wasCheckoutAdShown, markCheckoutAdShown } from "@/lib/session-flags";

/** Монтируется на /catalog и /checkout — сам решает, показывать ли баннер (раз за посещение). */
export function BannerGate({ page }: { page: "catalog" | "checkout" }) {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const wasShown = page === "catalog" ? wasCatalogAdShown() : wasCheckoutAdShown();
    if (wasShown) return;
    let cancelled = false;
    fetch("/api/banners")
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data: { banners: Banner[] }) => {
        if (cancelled) return;
        const top = (data.banners ?? [])[0];
        if (!top) return;
        Promise.resolve().then(() => {
          if (page === "catalog") markCatalogAdShown();
          else markCheckoutAdShown();
          setBanner(top);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (!banner) return null;
  return <BannerInterstitial banner={banner} onClose={() => setBanner(null)} />;
}
```

(Добавить `import { useEffect, useState } from "react";` в начало файла, если такого импорта там ещё нет — в основном компоненте `BannerInterstitial` этих хуков не было.)

- [x] **Step 4: Смонтировать `<BannerGate page="catalog" />` в `src/app/[locale]/(app)/catalog/page.tsx`**

В начало файла, среди импортов, добавить: `import { BannerGate } from "@/components/BannerInterstitial";`

Найти открывающий `<main className="flex-1 px-4 pt-6 pb-32 max-w-5xl mx-auto w-full">` (первая строка `return (`) и сразу после него добавить `<BannerGate page="catalog" />`.

- [x] **Step 5: Смонтировать `<BannerGate page="checkout" />` в `src/app/[locale]/(app)/checkout/page.tsx`**

В начало файла добавить: `import { BannerGate } from "@/components/BannerInterstitial";`

Найти `return (\n    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">` (основной return, не ветки `success`/`loading`/`items.length === 0`) и сразу после этого `<main ...>` добавить `<BannerGate page="checkout" />`.

- [x] **Step 6: Добавить переводы `bannerInterstitial` в `messages/ru.json` и `messages/ky.json`**

`messages/ru.json`:
```json
  "bannerInterstitial": {
    "close": "Закрыть",
    "defaultCta": "Смотреть товар"
  },
```

`messages/ky.json`:
```json
  "bannerInterstitial": {
    "close": "Жабуу",
    "defaultCta": "Товарды көрүү"
  },
```

- [x] **Step 7: Проверить типы, линтер, сборку — это первая точка, где `BannerManager.tsx` (Task 9) тоже становится проверяемым, т.к. `BannerInterstitial` теперь существует**

```bash
npx tsc --noEmit
npx eslint src/components/BannerInterstitial.tsx src/components/BannerManager.tsx src/lib/session-flags.ts "src/app/[locale]/(app)/catalog/page.tsx" "src/app/[locale]/(app)/checkout/page.tsx"
npm run build
```

- [x] **Step 8: Ручная проверка в браузере** (`npm run dev`, тестовый аккаунт): зайти в `/admin/promo`, создать баннер (загрузить картинку, выбрать товар через поиск, статус «Активен», даты — сегодня/через неделю), сохранить. Зайти в приложение как покупатель, перейти на `/catalog` — баннер должен всплыть один раз; закрыть крестиком, зайти в `/catalog` ещё раз в этом же открытии приложения — баннер больше не всплывает. Открыть `/checkout` (с товаром в корзине) — баннер всплывает там отдельно, один раз. Кликнуть по самому баннеру (не по крестику) — должен открыться `/product/{id}` выбранного товара.

- [x] **Step 9: Commit**

```bash
git add src/components/BannerInterstitial.tsx src/components/BannerManager.tsx src/lib/session-flags.ts "src/app/[locale]/(app)/catalog/page.tsx" "src/app/[locale]/(app)/checkout/page.tsx" messages/ru.json messages/ky.json
git commit -m "ui: banner interstitial on catalog/checkout entry, once per app visit each"
git push origin main
```

---

## Task 13: Блок «🔥 Акции» на главной

**Files:**
- Modify: `src/app/[locale]/(app)/page.tsx`

**Interfaces:**
- Consumes: `GET /api/promotions` (Task 6), `ProductCard` (существующий, без изменений), `Section` (уже определён внутри `page.tsx`).

- [x] **Step 1: Добавить состояние и загрузку акций**

В начало компонента `Home` (там, где уже объявлены `products`/`loading` через `useState`) добавить:
```ts
const [promoProducts, setPromoProducts] = useState<Product[]>([]);
```

В существующий `useEffect`, где загружаются товары (или в отдельный новый `useEffect` — если существующий эффект уже сложный, завести отдельный, короче и безопаснее):
```ts
useEffect(() => {
  fetch("/api/promotions")
    .then((res) => (res.ok ? res.json() : { products: [] }))
    .then((data: { products: Product[] }) => setPromoProducts(data.products ?? []))
    .catch(() => setPromoProducts([]));
}, []);
```

- [x] **Step 2: Добавить секцию в разметку**

Найти секцию `<Section title={t("popular")} ...>` (существующий блок «Популярные товары») и добавить перед ней новый блок (только если есть хотя бы одна акция):

```tsx
{promoProducts.length > 0 && (
  <Section title={t("promoTitle")} icon={Flame}>
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-pl-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {promoProducts.map((product) => (
        <div key={product.id} className="w-40 shrink-0 snap-start">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  </Section>
)}
```

Добавить `Flame` в существующий импорт из `lucide-react` в начале файла (рядом с `Sparkles, ChevronRight, Wand2`).

- [x] **Step 3: Добавить перевод `home.promoTitle` в `messages/ru.json` и `messages/ky.json`**

В `messages/ru.json`, внутри namespace `"home"` (рядом с `"popular"`): `"promoTitle": "Акции",`
В `messages/ky.json`, тот же namespace: `"promoTitle": "Акциялар",`

- [x] **Step 4: Проверить типы, линтер, сборку**

```bash
npx tsc --noEmit
npx eslint "src/app/[locale]/(app)/page.tsx"
npm run build
```

- [x] **Step 5: Ручная проверка в браузере**: на главной с активной акцией (из Task 12 можно создать и акцию тем же способом через `/admin/promo` → вкладка «Акции») должен появиться блок «Акции» с карточкой товара — старая цена зачёркнута, новая цена и «-X%», кнопка добавления в корзину работает как обычно.

- [x] **Step 6: Commit**

```bash
git add "src/app/[locale]/(app)/page.tsx" messages/ru.json messages/ky.json
git commit -m "ui: home page — Акции section from active promotions"
git push origin main
```

---

## Task 14: Граммаж и штрихкод в `admin/catalog`

**Files:**
- Modify: `src/app/[locale]/(app)/admin/catalog/page.tsx`

**Interfaces:**
- Consumes: `Product.barcode` (Task 2 — уже приходит через `/api/admin/catalog`, ничего в API менять не нужно), `Product.attributes.volume` (уже приходит).

- [x] **Step 1: Добавить две колонки в таблицу**

Найти `<thead>` со столбцами `colName`/`colBrand`/`colCategory`/`colPrice`/`colStock` и добавить два новых `<th>` после `colCategory`:

```tsx
<th className="py-2 pr-4">{t("colVolume")}</th>
<th className="py-2 pr-4">{t("colBarcode")}</th>
```

В `<tbody>`, в строке `<tr>`, после `<td>{p.category}</td>` добавить:

```tsx
<td className="py-2 pr-4 whitespace-nowrap">{p.attributes?.volume ?? "—"}</td>
<td className="py-2 pr-4 whitespace-nowrap font-mono text-xs">{p.barcode ?? "—"}</td>
```

- [x] **Step 2: Добавить переводы `adminCatalog.colVolume`/`colBarcode` в `messages/ru.json` и `messages/ky.json`**

`messages/ru.json`, внутри `"adminCatalog"`: `"colVolume": "Объём/вес", "colBarcode": "Штрихкод",`
`messages/ky.json`, внутри `"adminCatalog"`: `"colVolume": "Көлөм/салмак", "colBarcode": "Штрихкод",`

- [x] **Step 3: Проверить типы, линтер, сборку**

```bash
npx tsc --noEmit
npx eslint "src/app/[locale]/(app)/admin/catalog/page.tsx"
npm run build
```

- [x] **Step 4: Ручная проверка**: открыть `/admin/catalog` — в таблице видны колонки «Объём/вес» и «Штрихкод» (у демо-товаров без штрихкода — прочерк, это ожидаемо, колонка в базе пока ни для одного товара не заполнена).

- [x] **Step 5: Commit**

```bash
git add "src/app/[locale]/(app)/admin/catalog/page.tsx" messages/ru.json messages/ky.json
git commit -m "ui: show barcode and volume columns in admin catalog table"
git push origin main
```

---

## Task 15: Финальная сверка и передача владельцу

**Files:** нет изменений кода — только проверка и сообщение владельцу.

- [x] **Step 1: Полная финальная проверка**

```bash
npx tsc --noEmit
npx eslint src
npm run build
```
Все три должны пройти чисто (0 ошибок).

- [x] **Step 2: Полный ручной прогон в браузере** (тестовый аккаунт, потом удалить или попросить владельца удалить):
  1. `/admin/promo` → «Баннеры» → создать баннер с товаром, картинкой, статус «Активен» → сохранить → «Предпросмотр» показывает то же, что увидит клиент.
  2. `/admin/promo` → «Акции» → создать акцию (процент) на другой товар → живой предпросмотр цены в форме корректный → сохранить.
  3. Как покупатель: главная — есть блок «Акции» с товаром со скидкой; тот же товар в `/catalog` и в поиске показывает ту же зачёркнутую/новую цену (не расходится).
  4. Переход на `/catalog` — всплыл баннер (первый раз за это открытие приложения); закрыт крестиком; повторный заход на `/catalog` — баннер не всплывает снова.
  5. Переход на `/checkout` (с товаром в корзине) — баннер всплывает там отдельно, один раз; клик по баннеру (не по крестику) уводит на товар.
  6. `/admin/catalog` — видны колонки «Объём/вес» и «Штрихкод».
  7. Удалить баннер/акцию через админку — пропадают из списка и с клиентской стороны.
  8. Отключить (⏸) баннер/акцию — статус «Отключён», клиенту больше не показывается.

- [x] **Step 3: Сообщить владельцу**

Одним сообщением: какие файлы и таблицы созданы/изменены (список), что нужно сделать вручную (`supabase/marketing.sql` в Supabase SQL Editor, если ещё не запущен — без этого шага всё выше вернёт «база данных недоступна»), как пользоваться новым разделом (`/admin/promo`, кнопки «Создать баннер»/«Создать акцию», предпросмотр, фильтры, отключение вместо удаления), и что именно стоит проверить владельцу самому (совпадение цены везде, что баннер не мешает при частой навигации).

---

## Self-Review

**Spec coverage:** раздел 1 (баннеры) — Tasks 1, 2, 4, 6 (часть), 8, 9, 12. Раздел 2 (акции) — Tasks 1, 2, 3, 5, 6 (часть), 7, 8, 10, 13. Раздел 3 (граммаж/штрихкод) — Tasks 2, 7 (barcode в API), 14. Все три раздела спеки покрыты.

**Placeholders:** просмотрено — не осталось «TBD»/«implement later»; единственное намеренное отступление от «полностью самодостаточной задачи» — Task 9 не проходит сборку до Task 12 (явно указано в Step 3/коммите Task 9, с причиной).

**Type consistency:** `Banner`/`Promotion`/`Product.barcode` определены один раз в Task 2 и используются с одинаковыми именами полей (`imageUrl`, `productId`, `startAt`, `endAt`, `showOldPrice`, `discountType`, `newPrice`, `oldPrice`) во всех задачах. Нашёл при самопроверке несовпадение регистра: `StatusRow` в `promo-status.ts` изначально был `{status, start_at, end_at}` (snake_case, как в БД), а `Banner`/`Promotion` — camelCase — уже исправлено в Task 3 (`StatusRow` теперь `{status, startAt, endAt}`), и во всех местах, где `effectiveState`/`isVisibleToCustomers` вызывались с явными snake_case полями (Task 3 сам `apply-promotion.ts`, Task 6 `/api/banners`), вызов упрощён до передачи самого объекта `Banner`/`Promotion` напрямую (`isVisibleToCustomers(promotion)`, `isVisibleToCustomers(b)`) — единообразно с тем, как их уже вызывали `BannerManager.tsx`/`PromotionManager.tsx` (`effectiveState(banner)`/`effectiveState(promotion)`).
