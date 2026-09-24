-- ОТЗЫВЫ И ЗВЁЗДЫ ПОКУПАТЕЛЕЙ: 1-5 звёзд + необязательный текст, на странице товара, видны всем.
-- Безопасно: только ДОБАВЛЯЕТ таблицу и политики; ничего существующего не меняет. Можно запускать повторно.
-- Запустить в Supabase → SQL Editor (страницу не переводить переводчиком браузера!).

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index if not exists product_reviews_product_id_idx on public.product_reviews(product_id);
create index if not exists product_reviews_store_id_idx on public.product_reviews(store_id);

alter table public.product_reviews enable row level security;

-- Отзывы публичные для всех вошедших в магазин (как и сами товары).
drop policy if exists product_reviews_select on public.product_reviews;
create policy product_reviews_select on public.product_reviews
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = product_reviews.store_id));

-- Можно оставить отзыв только на реально купленный товар: заказ должен принадлежать этому же
-- клиенту, быть не отменён и содержать этот товар в items_json (см. POST /api/orders — там же
-- ключ "productId"). unique(order_id, product_id) не даст оставить второй отзыв на ту же покупку.
drop policy if exists product_reviews_insert_own on public.product_reviews;
create policy product_reviews_insert_own on public.product_reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = product_reviews.order_id
        and o.user_id = auth.uid()
        and o.store_id = product_reviews.store_id
        and o.status <> 'cancelled'
        and exists (
          select 1 from jsonb_array_elements(o.items_json) as item
          where (item->>'productId')::uuid = product_reviews.product_id
        )
    )
  );

-- Удалить может либо сам автор, либо владелец/админ своего магазина (без отдельного экрана
-- модерации — иконка удаления прямо на странице товара).
drop policy if exists product_reviews_delete on public.product_reviews;
create policy product_reviews_delete on public.product_reviews
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = product_reviews.store_id and p.role::text in ('admin', 'owner')
    )
  );
