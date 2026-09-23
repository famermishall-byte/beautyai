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
