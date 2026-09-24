-- НОВИНКИ: товары, которые владелец/админ сам выбирает для верхнего блока на главной (там, где
-- слайдер) и для плитки «Новинки» в каталоге — один и тот же список, свой порядок (priority).
-- Безопасно: только ДОБАВЛЯЕТ таблицу и политики; ничего существующего не меняет. Можно запускать повторно.
-- Запустить в Supabase → SQL Editor (страницу не переводить переводчиком браузера!).

create table if not exists public.new_arrivals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, product_id)
);
create index if not exists new_arrivals_store_id_idx on public.new_arrivals(store_id);
create index if not exists new_arrivals_product_id_idx on public.new_arrivals(product_id);

alter table public.new_arrivals enable row level security;

-- Видят все вошедшие в магазин (как товары).
drop policy if exists new_arrivals_select on public.new_arrivals;
create policy new_arrivals_select on public.new_arrivals
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = new_arrivals.store_id));

-- Добавляют/убирают/переставляют только владелец и администратор своего магазина.
drop policy if exists new_arrivals_write_staff on public.new_arrivals;
create policy new_arrivals_write_staff on public.new_arrivals
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.store_id = new_arrivals.store_id and p.role::text in ('admin', 'owner')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.store_id = new_arrivals.store_id and p.role::text in ('admin', 'owner')
  ));
