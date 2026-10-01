# Автосписание остатков при заказе — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Остаток филиала уменьшается сам при заказе, возвращается при отмене, обнуляется при уменьшении позиции продавцом; загрузка остатков вычитает брони открытых заказов.

**Architecture:** Бронь и возврат — триггеры Postgres на `orders` (покрывают все пути: API, RPC по ссылке, админку, курьера). Приложение: чистые функции в `src/lib/stock-reserve.ts`, их используют синхронизация остатков, подсказки в админке и API заказа.

**Tech Stack:** Next.js (App Router), Supabase Postgres (plpgsql, security definer), node:test через tsx (`npm test`).

**Spec:** `docs/superpowers/specs/2026-10-01-stock-reserve-design.md`

## Global Constraints

- Бронируют только новые заказы: `orders.stock_reserved boolean not null default false`, ставит триггер вставки.
- Позиция без строки в `product_branch_stock` — не трогается и заказ не блокирует.
- Открытые заказы = статусы `sent`, `confirmed`, `paid`, `shipped`.
- Ошибка нехватки из базы: `errcode = 'P0001'`, текст «Товар «…» закончился в этом филиале.»; API отвечает 409 этим текстом.
- SQL на живой базе — только после явного «да» владельца.
- Тексты для людей — по-русски; комментарии в коде — по-русски, как в соседнем коде.

## Review Focus

1. Продавец уменьшил позицию до 0 → заказ стал `cancelled` в том же UPDATE → возврат +0, затем остаток 0 (не должен вернуться «старый» остаток).
2. Отмена заказа, отредактированного раньше → возвращается текущее (уменьшенное) количество, а не исходное.
3. Отмена старого заказа (`stock_reserved = false`) → остаток не меняется.
4. Один заказ с несколькими позициями, одной не хватает → весь заказ не создаётся, ни одна позиция не списана (откат транзакции).
5. Загрузка остатков, когда тот же товар/филиал в нескольких открытых заказах → вычитается сумма, результат не ниже 0.

---

### Task 1: Чистые функции остатков

**Files:**
- Create: `src/lib/stock-reserve.ts`
- Test: `src/lib/stock-reserve.test.ts`

**Interfaces:**
- Produces:
  - `OPEN_ORDER_STATUSES: readonly string[]` = `["sent","confirmed","paid","shipped"]`
  - `type ReservingOrder = { status: string; branchId: string | null; items: { productId?: string; quantity: number }[] }`
  - `reservedByProductBranch(orders: ReservingOrder[]): Map<string, number>` — ключ `"productId|branchId"`
  - `netStock(fileQty: number, reserved: number): number` = `max(0, fileQty − reserved)`
  - `availableForOrder(current: number | null, itemQty: number, stockReserved: boolean): number | null`

- [x] **Step 1: Write the failing test** — `src/lib/stock-reserve.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { reservedByProductBranch, netStock, availableForOrder } from "./stock-reserve";

test("reservedByProductBranch sums open orders per product and branch", () => {
  const m = reservedByProductBranch([
    { status: "sent", branchId: "b1", items: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }] },
    { status: "paid", branchId: "b1", items: [{ productId: "p1", quantity: 3 }] },
    { status: "shipped", branchId: "b2", items: [{ productId: "p1", quantity: 4 }] },
  ]);
  assert.equal(m.get("p1|b1"), 5);
  assert.equal(m.get("p2|b1"), 1);
  assert.equal(m.get("p1|b2"), 4);
});

test("reservedByProductBranch skips closed orders, no branch, no productId, zero qty", () => {
  const m = reservedByProductBranch([
    { status: "completed", branchId: "b1", items: [{ productId: "p1", quantity: 2 }] },
    { status: "cancelled", branchId: "b1", items: [{ productId: "p1", quantity: 2 }] },
    { status: "sent", branchId: null, items: [{ productId: "p1", quantity: 2 }] },
    { status: "sent", branchId: "b1", items: [{ quantity: 2 }, { productId: "p3", quantity: 0 }] },
  ]);
  assert.equal(m.size, 0);
});

test("netStock never goes below zero", () => {
  assert.equal(netStock(10, 3), 7);
  assert.equal(netStock(2, 5), 0);
  assert.equal(netStock(4, 0), 4);
});

test("availableForOrder adds back this order's own reservation", () => {
  assert.equal(availableForOrder(0, 3, true), 3);
  assert.equal(availableForOrder(2, 3, false), 2);
  assert.equal(availableForOrder(null, 3, true), null);
});
```

- [x] **Step 2: Run** `npx tsx --test src/lib/stock-reserve.test.ts` — Expected: FAIL (module not found).

- [x] **Step 3: Implement** `src/lib/stock-reserve.ts`:

```ts
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
```

- [x] **Step 4: Run** `npx tsx --test src/lib/stock-reserve.test.ts` — Expected: 4 pass.
- [x] **Step 5: Commit** `git add src/lib/stock-reserve.ts src/lib/stock-reserve.test.ts && git commit -m "feat(stock): расчёты броней остатков"`

---

### Task 2: SQL — бронь, возврат, обнуление при уменьшении

**Files:**
- Create: `supabase/stock_reserve.sql`

**Interfaces:**
- Produces: колонка `orders.stock_reserved`; триггеры `orders_reserve_stock` (BEFORE INSERT), `orders_release_stock_update` (AFTER UPDATE OF status), `orders_release_stock_delete` (AFTER DELETE); новая версия `edit_order_by_token`.

- [x] **Step 1: Write** `supabase/stock_reserve.sql`:

```sql
-- АВТОСПИСАНИЕ ОСТАТКОВ ПРИ ЗАКАЗЕ (docs/superpowers/specs/2026-10-01-stock-reserve-design.md).
-- Заказ создан → остаток филиала − количество; отменён/удалён (открытый) → + количество; продавец уменьшил позицию → 0.
-- Только новые заказы (stock_reserved = true). Позиции без строки остатка не трогаются. Можно запускать повторно.

alter table public.orders add column if not exists stock_reserved boolean not null default false;

create or replace function public.orders_reserve_stock()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  it record;
  has_row boolean;
begin
  if new.branch_id is null then
    return new;
  end if;
  -- по порядку товаров — чтобы два одновременных заказа не заблокировали друг друга
  for it in
    select (e->>'productId')::uuid as product_id, (e->>'quantity')::int as q, e->>'name' as name
    from jsonb_array_elements(coalesce(new.items_json, '[]'::jsonb)) e
    where e->>'productId' is not null and coalesce((e->>'quantity')::int, 0) > 0
    order by 1
  loop
    update public.product_branch_stock
    set quantity = quantity - it.q, updated_at = now()
    where product_id = it.product_id and branch_id = new.branch_id and quantity >= it.q;
    if not found then
      select exists (select 1 from public.product_branch_stock where product_id = it.product_id and branch_id = new.branch_id) into has_row;
      if has_row then
        raise exception 'Товар «%» закончился в этом филиале.', it.name using errcode = 'P0001';
      end if;
    end if;
  end loop;
  new.stock_reserved := true;
  return new;
end $$;

drop trigger if exists orders_reserve_stock on public.orders;
create trigger orders_reserve_stock before insert on public.orders
  for each row execute function public.orders_reserve_stock();

-- Вернуть текущие количества позиций в остаток филиала (только существующие строки).
create or replace function public.orders_return_stock(p_branch uuid, p_items jsonb)
returns void language sql security definer set search_path = public
as $$
  update public.product_branch_stock s
  set quantity = s.quantity + x.q, updated_at = now()
  from (
    select (e->>'productId')::uuid as product_id, sum((e->>'quantity')::int) as q
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
    where e->>'productId' is not null and coalesce((e->>'quantity')::int, 0) > 0
    group by 1
  ) x
  where s.product_id = x.product_id and s.branch_id = p_branch;
$$;
revoke all on function public.orders_return_stock(uuid, jsonb) from public, anon, authenticated;

create or replace function public.orders_release_stock()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.stock_reserved and new.branch_id is not null and new.status = 'cancelled' and old.status <> 'cancelled' then
      perform public.orders_return_stock(new.branch_id, new.items_json);
    end if;
    return null;
  end if;
  -- DELETE: возвращаем только то, что ещё лежало под заказом
  if old.stock_reserved and old.branch_id is not null and old.status not in ('completed', 'cancelled') then
    perform public.orders_return_stock(old.branch_id, old.items_json);
  end if;
  return null;
end $$;

drop trigger if exists orders_release_stock_update on public.orders;
create trigger orders_release_stock_update after update of status on public.orders
  for each row execute function public.orders_release_stock();
drop trigger if exists orders_release_stock_delete on public.orders;
create trigger orders_release_stock_delete after delete on public.orders
  for each row execute function public.orders_release_stock();

-- Правка состава по ссылке продавца: как в живой версии, но остаток = 0 при ЛЮБОМ уменьшении позиции
-- (продавец оставил меньше, чем заказано, — значит, больше в филиале нет).
create or replace function public.edit_order_by_token(p_token text, p_quantities jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  o public.orders%rowtype;
  cur jsonb;
  it jsonb;
  idx int := 0;
  new_items jsonb := '[]'::jsonb;
  q int;
  ordered int;
  total numeric := 0;
  any_left boolean := false;
  reduced uuid[] := '{}';
begin
  select * into o from public.orders where status_token::text = p_token for update;
  if not found then
    raise exception 'Заказ не найден.';
  end if;
  if o.status not in ('sent', 'confirmed') then
    raise exception 'Заказ уже оплачен или закрыт — состав менять нельзя. Обратитесь к администратору.';
  end if;

  cur := o.items_json::jsonb;
  if jsonb_typeof(p_quantities) <> 'array' or jsonb_array_length(p_quantities) <> jsonb_array_length(cur) then
    raise exception 'Состав заказа изменился — обновите страницу.';
  end if;

  for it in select * from jsonb_array_elements(cur) loop
    ordered := coalesce((it->>'orderedQuantity')::int, (it->>'quantity')::int);
    q := (p_quantities->>idx)::int;
    if q is null or q < 0 or q > ordered then
      raise exception 'Недопустимое количество.';
    end if;

    new_items := new_items || jsonb_build_array(jsonb_set(jsonb_set(it, '{quantity}', to_jsonb(q)), '{orderedQuantity}', to_jsonb(ordered)));
    total := total + (it->>'price')::numeric * q;
    if q > 0 then any_left := true; end if;
    if q < (it->>'quantity')::int and (it->>'productId') is not null then
      reduced := reduced || (it->>'productId')::uuid;
    end if;

    idx := idx + 1;
  end loop;

  update public.orders
  set items_json = new_items,
      total_price = total,
      original_total = coalesce(original_total, o.total_price),
      edited_at = now(),
      edited_by = 'whatsapp',
      status = case when any_left then o.status else 'cancelled' end
  where id = o.id;

  -- после UPDATE (триггер отмены мог вернуть остаток) — уменьшенные позиции: в этом филиале товара больше нет
  if o.branch_id is not null and array_length(reduced, 1) > 0 then
    insert into public.product_branch_stock (store_id, product_id, branch_id, quantity, updated_at)
    select o.store_id, p, o.branch_id, 0, now() from unnest(reduced) p
    on conflict (product_id, branch_id) do update set quantity = 0, updated_at = now();
  end if;

  return public.get_order_by_token(p_token);
end $$;
```

- [x] **Step 2: Commit** `git add supabase/stock_reserve.sql && git commit -m "feat(stock): SQL — бронь остатков заказом, возврат при отмене"` (НЕ применять к базе — это Task 4).

---

### Task 3: Приложение — API заказа, админка, загрузка остатков

**Files:**
- Modify: `src/app/api/orders/route.ts:100` (ошибка вставки)
- Modify: `src/lib/supabase.ts:65-91` (`mapOrder` → `stockReserved`)
- Modify: `src/types.ts:89` (`Order.stockReserved: boolean`)
- Modify: `src/app/api/admin/orders/route.ts:11-37` (`attachStock`)
- Modify: `src/app/api/admin/orders/[id]/route.ts:115-122` (обнуление при уменьшении, после update)
- Modify: `src/lib/import/executeSync.ts:81` (вычесть брони перед upsert)

**Interfaces:**
- Consumes: `reservedByProductBranch`, `netStock`, `availableForOrder`, `OPEN_ORDER_STATUSES` из Task 1.

- [x] **Step 1: API заказа** — заменить `if (orderError) throw orderError;` на:

```ts
    // Нехватка, которую поймала база (заказ одновременно с другим клиентом) — supabase/stock_reserve.sql.
    if (orderError?.code === "P0001") {
      return NextResponse.json({ error: `${orderError.message} Выберите другой филиал или уменьшите количество.` }, { status: 409 });
    }
    if (orderError) throw orderError;
```

- [x] **Step 2: `mapOrder`/тип** — в `mapOrder` добавить `stockReserved: row.stock_reserved === true,`; в `Order` (`src/types.ts`) добавить
  `/** Заказ забронировал остаток при оформлении (supabase/stock_reserve.sql). */ stockReserved: boolean;`

- [x] **Step 3: `attachStock`** — строку 34 заменить на:

```ts
      const current = pid && o.branch ? (quantity.get(`${pid}|${o.branch.id}`) ?? null) : null;
      // Забронированные штуки этого заказа в остатке уже не видны — показываем, сколько есть именно для него.
      it.stock = { quantity: availableForOrder(current, it.quantity, o.stockReserved) };
```
  и импорт `import { availableForOrder } from "@/lib/stock-reserve";`.

- [x] **Step 4: Админ-правка** — блок «What is now missing» заменить на:

```ts
    // Уменьшено (в т.ч. до 0) → в этом филиале товара больше нет: остаток 0. После update — триггер отмены мог вернуть остаток.
    const reduced = items.filter((it, i) => quantities[i] < it.quantity && it.productId);
    if (reduced.length > 0 && order.branch_id) {
      await supabase.from("product_branch_stock").upsert(
        reduced.map((it) => ({ store_id: profile.storeId, product_id: it.productId, branch_id: order.branch_id, quantity: 0, updated_at: new Date().toISOString() })),
        { onConflict: "product_id,branch_id" }
      );
    }
```
  и обновить комментарий над `PATCH` («A reduced line also sets…»).

- [x] **Step 5: Загрузка остатков** — в `executeSync.ts` внутри `if (stockWrites.length > 0) {` перед upsert:

```ts
    // Программа магазина не знает о невыданных заказах из приложения — их штуки вычитаем (spec 2026-10-01-stock-reserve).
    const { data: openOrders } = await supabase
      .from("orders")
      .select("status, branch_id, items_json")
      .eq("store_id", storeId)
      .in("status", [...OPEN_ORDER_STATUSES]);
    const reserved = reservedByProductBranch(
      (openOrders ?? []).map((o) => ({ status: o.status as string, branchId: (o.branch_id as string | null) ?? null, items: (o.items_json ?? []) as { productId?: string; quantity: number }[] }))
    );
    for (const w of stockWrites) w.quantity = netStock(w.quantity, reserved.get(`${w.productId}|${w.branchId}`) ?? 0);
```
  и импорт `import { OPEN_ORDER_STATUSES, netStock, reservedByProductBranch } from "../stock-reserve";`.

- [x] **Step 6: Проверка** — `npm test`, `npx tsc --noEmit`, `npx eslint` по изменённым файлам, `npm run build`. Expected: всё чисто.
- [x] **Step 7: Commit** `git commit -am "feat(stock): API, админка и загрузка остатков учитывают брони"`

---

### Task 4: Применить SQL, проверить вживую, влить

- [x] **Step 1:** Спросить владельца «да» на запуск `supabase/stock_reserve.sql` на живой базе; применить через Supabase MCP `apply_migration` (name `stock_reserve`).
- [x] **Step 2: Живая проверка (SQL, в транзакции с откатом где возможно):** взять товар с остатком в филиале; вставить тестовый заказ (`status 'sent'`, `items_json` с этим `productId`, qty 2) → остаток −2, `stock_reserved = true`; второй заказ из двух позиций, где второй не хватает → ошибка P0001 и остаток первой позиции не изменился (Review Focus 4); заказ отредактирован до 1, затем отменён → вернулась 1, а не исходное количество (Review Focus 2); отмена старого заказа с `stock_reserved = false` → остаток не изменился (Review Focus 3); `update status = 'cancelled'` → +2; заказ qty 3 → `edit_order_by_token(token, '[1]')` → остаток 0; удалить тестовые заказы и вернуть исходный остаток; сверить счётчик номеров заказов (`store_order_counters`) — вернуть, если тест его сдвинул.
- [x] **Step 3:** Merge `worktree-stock-reserve` → `main` `--no-ff`, push (владелец уже сказал «пуш»).
- [x] **Step 4:** Отметить чекбоксы этого плана `[x]`, добавить запись «Автосписание остатков — 01.10» в `PROJECT_CONTEXT.md`, коммит + push.
