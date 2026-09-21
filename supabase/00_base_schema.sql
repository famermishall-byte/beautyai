-- =============================================================================
-- 00_base_schema.sql — БАЗОВАЯ СХЕМА (запускать ПЕРВОЙ на пустом проекте Supabase)
--
-- Восстановлено 2026-09-21 из истории миграций живого проекта
-- (supabase_migrations.schema_migrations, 16 миграций 20260913…20260920) —
-- раньше эти изменения применялись напрямую и в репозитории не хранились.
-- Порядок и содержимое сохранены; вырезана только разовая правка данных
-- конкретных аккаунтов (UPDATE profiles по uuid из миграции fix_owner_assignment…),
-- на чистой базе она не нужна.
--
-- После этого файла — остальные по порядку из docs/RECOVERY.md (шаг «База данных»).
-- =============================================================================

-- ---- 20260913215359 init_beautyai_schema ----
create extension if not exists pgcrypto;

create table stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  sku text not null,
  name text not null,
  brand text not null,
  category text not null,
  price float8 not null,
  description text,
  characteristics text,
  purpose text,
  in_stock boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_store_id_idx on products(store_id);

create table branches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  address text not null,
  phone text not null,
  whatsapp text not null,
  hours text not null,
  created_at timestamptz not null default now()
);
create index branches_store_id_idx on branches(store_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  branch_id uuid not null references branches(id),
  number text not null,
  customer_name text not null,
  customer_phone text not null,
  items_json jsonb not null,
  total_price float8 not null,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);
create index orders_store_id_idx on orders(store_id);
create index orders_branch_id_idx on orders(branch_id);

alter table stores enable row level security;
alter table products enable row level security;
alter table branches enable row level security;
alter table orders enable row level security;

create policy "public full access" on stores for all using (true) with check (true);
create policy "public full access" on products for all using (true) with check (true);
create policy "public full access" on branches for all using (true) with check (true);
create policy "public full access" on orders for all using (true) with check (true);

-- ---- НАЧАЛЬНЫЕ ДАННЫЕ: единственный магазин (slug 'demo'), к нему привязывается всё ----
-- (в живой базе магазин был создан вручную; без него handle_new_user() не сможет
--  привязать профиль к магазину)
insert into stores (slug, name) values ('demo', 'Оптовые цены №1')
on conflict (slug) do nothing;

-- ---- 20260914140755 add_auth_roles_and_store_scoping ----
update public.stores set name = 'Оптовые цены №1' where slug = 'demo';

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin','owner','super_admin')),
  store_id uuid references public.stores(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_store_id uuid;
  assigned_role text;
begin
  select id into default_store_id from public.stores order by created_at asc limit 1;

  if exists (select 1 from public.profiles) then
    assigned_role := 'user';
  else
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, role, store_id)
  values (new.id, new.email, assigned_role, default_store_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy "public full access" on public.stores;
drop policy "public full access" on public.products;
drop policy "public full access" on public.branches;
drop policy "public full access" on public.orders;

create policy "stores_select_own" on public.stores
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = stores.id)
  );

create policy "stores_update_own_admin" on public.stores
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = stores.id and p.role = 'admin')
  );

create policy "products_select_same_store" on public.products
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = products.store_id)
  );

create policy "products_admin_write" on public.products
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = products.store_id and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = products.store_id and p.role = 'admin')
  );

create policy "branches_select_same_store" on public.branches
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = branches.store_id)
  );

create policy "branches_admin_write" on public.branches
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = branches.store_id and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = branches.store_id and p.role = 'admin')
  );

create policy "orders_select_same_store" on public.orders
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = orders.store_id)
  );

create policy "orders_insert_same_store" on public.orders
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = orders.store_id)
  );

-- ---- 20260914140833 restrict_handle_new_user_execute ----
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---- 20260914142647 add_owner_role_and_ownership_transfer ----
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_store_id uuid;
  assigned_role text;
begin
  select id into default_store_id from public.stores order by created_at asc limit 1;

  if exists (select 1 from public.profiles) then
    assigned_role := 'user';
  else
    assigned_role := 'owner';
  end if;

  insert into public.profiles (id, email, role, store_id)
  values (new.id, new.email, assigned_role, default_store_id);

  return new;
end;
$$;

drop policy "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = products.store_id and p.role in ('admin','owner'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = products.store_id and p.role in ('admin','owner'))
  );

drop policy "branches_admin_write" on public.branches;
create policy "branches_admin_write" on public.branches
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = branches.store_id and p.role in ('admin','owner'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = branches.store_id and p.role in ('admin','owner'))
  );

drop policy "stores_update_own_admin" on public.stores;
create policy "stores_update_own_admin" on public.stores
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = stores.id and p.role in ('admin','owner'))
  );

create or replace function public.transfer_store_ownership(new_owner_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_store_id uuid;
  caller_role text;
  target_user_id uuid;
begin
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select store_id, role into caller_store_id, caller_role
  from public.profiles where id = caller_id;

  if caller_role is distinct from 'owner' or caller_store_id is null then
    raise exception 'not_owner';
  end if;

  select id into target_user_id from auth.users where lower(email) = lower(new_owner_email);

  if target_user_id is null then
    raise exception 'target_not_registered';
  end if;

  if target_user_id = caller_id then
    raise exception 'cannot_transfer_to_self';
  end if;

  update public.profiles
  set role = 'owner', store_id = caller_store_id
  where id = target_user_id;

  update public.profiles
  set role = 'user', store_id = null
  where id = caller_id;
end;
$$;

revoke execute on function public.transfer_store_ownership(text) from public, anon;
grant execute on function public.transfer_store_ownership(text) to authenticated;

-- ---- 20260914172833 fix_owner_assignment_on_email_confirm ----
-- Новые регистрации всегда 'user'; владельцем становится первый подтвердивший email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_store_id uuid;
begin
  select id into default_store_id from public.stores order by created_at asc limit 1;

  insert into public.profiles (id, email, role, store_id)
  values (new.id, new.email, 'user', default_store_id);

  return new;
end;
$$;

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_store_id uuid;
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    select store_id into target_store_id from public.profiles where id = new.id;

    if target_store_id is not null and not exists (
      select 1 from public.profiles where store_id = target_store_id and role = 'owner'
    ) then
      update public.profiles set role = 'owner' where id = new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update on auth.users
  for each row
  execute function public.handle_user_confirmed();

-- (разовая правка ролей двух конкретных аккаунтов из оригинальной миграции опущена)
-- ВАЖНО на новой базе: ВЛАДЕЛЕЦ — первый аккаунт, подтвердивший email. Если подтверждение
-- email выключено в Supabase Auth, назначьте владельца вручную:
--   update public.profiles set role = 'owner' where email = 'famermishall@gmail.com';

-- ---- 20260914183716 add_skin_profile_and_saved_products ----
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists skin_type text,
  add column if not exists skin_concerns text[] not null default '{}';

revoke update on public.profiles from authenticated;
grant update (display_name, skin_type, skin_concerns) on public.profiles to authenticated;

create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.saved_products enable row level security;

create policy saved_products_select_own on public.saved_products
  for select using (auth.uid() = user_id);

create policy saved_products_insert_own on public.saved_products
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = saved_products.store_id
    )
  );

create policy saved_products_delete_own on public.saved_products
  for delete using (auth.uid() = user_id);

-- ---- 20260914194512 add_import_templates_and_sku_uniqueness ----
alter table public.products
  add constraint products_store_sku_unique unique (store_id, sku);

create table public.import_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  source_type text not null default 'xlsx',
  column_mapping jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.import_templates enable row level security;

create policy import_templates_select_same_store on public.import_templates
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = import_templates.store_id)
  );

create policy import_templates_admin_write on public.import_templates
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = import_templates.store_id and p.role in ('admin', 'owner')
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = import_templates.store_id and p.role in ('admin', 'owner')
    )
  );

-- ---- 20260915110241 add_delete_own_account_function ----
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.import_templates set created_by = null where created_by = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ---- 20260917112756 add_order_user_id_and_fix_rls ----
alter table public.orders add column user_id uuid references auth.users(id) on delete set null;

drop policy if exists orders_select_same_store on public.orders;
drop policy if exists orders_insert_same_store on public.orders;

create policy orders_select_own on public.orders
  for select
  using (user_id = auth.uid());

create policy orders_select_store_manager on public.orders
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.store_id = orders.store_id
        and p.role = any (array['admin','owner'])
    )
  );

create policy orders_insert_own on public.orders
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.store_id = orders.store_id
    )
  );

create policy orders_update_store_manager on public.orders
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.store_id = orders.store_id
        and p.role = any (array['admin','owner'])
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.store_id = orders.store_id
        and p.role = any (array['admin','owner'])
    )
  );

-- ---- 20260917122013 add_order_status_token_and_link_update ----
alter table public.orders add column status_token uuid not null default gen_random_uuid();
alter table public.orders add constraint orders_status_token_key unique (status_token);

create or replace function public.update_order_status_by_token(p_token uuid, p_status text)
returns table (id uuid, number text, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('confirmed', 'completed', 'cancelled') then
    raise exception 'invalid status: %', p_status;
  end if;

  return query
    update public.orders o
    set status = p_status
    where o.status_token = p_token
    returning o.id, o.number, o.status;
end;
$$;

revoke all on function public.update_order_status_by_token(uuid, text) from public;
grant execute on function public.update_order_status_by_token(uuid, text) to anon, authenticated;

-- ---- 20260917132201 add_branch_stock_and_universal_import_sources ----
alter table public.products add column barcode text null;
alter table public.products add column external_id text null;
create index products_store_barcode_idx on public.products(store_id, barcode) where barcode is not null;
create index products_store_external_id_idx on public.products(store_id, external_id) where external_id is not null;

create table public.product_branch_stock (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, branch_id)
);
create index product_branch_stock_store_id_idx on public.product_branch_stock(store_id);
create index product_branch_stock_branch_id_idx on public.product_branch_stock(branch_id);

alter table public.product_branch_stock enable row level security;

create policy product_branch_stock_select_same_store on public.product_branch_stock
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = product_branch_stock.store_id
    )
  );

create policy product_branch_stock_admin_write on public.product_branch_stock
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = product_branch_stock.store_id
        and p.role = any (array['admin','owner'])
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = product_branch_stock.store_id
        and p.role = any (array['admin','owner'])
    )
  );

alter table public.import_templates add column connection_type text not null default 'file';
alter table public.import_templates add constraint import_templates_connection_type_check
  check (connection_type in ('file','api'));
alter table public.import_templates add column connection_config jsonb null;
alter table public.import_templates add column last_synced_at timestamptz null;
alter table public.import_templates add column last_sync_summary jsonb null;

create table public.import_review_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  source_id uuid null references public.import_templates(id) on delete set null,
  raw_row jsonb not null,
  candidate_product_id uuid null references public.products(id) on delete set null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index import_review_items_store_id_idx on public.import_review_items(store_id);

alter table public.import_review_items enable row level security;

create policy import_review_items_admin_all on public.import_review_items
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = import_review_items.store_id
        and p.role = any (array['admin','owner'])
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.store_id = import_review_items.store_id
        and p.role = any (array['admin','owner'])
    )
  );

-- ---- 20260920115815 add_branch_city_and_feedback_table ----
alter table branches add column city text not null default '';

create table feedback (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy feedback_insert_own on feedback
  for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.store_id = feedback.store_id)
  );

create policy feedback_select_own on feedback
  for select
  using (user_id = auth.uid());

create policy feedback_select_store_manager on feedback
  for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.store_id = feedback.store_id and p.role in ('admin', 'owner')
    )
  );

-- ---- 20260920171435 add_profile_details_avatar_and_branch_coordinates ----
alter table profiles
  add column age integer check (age is null or (age between 5 and 120)),
  add column gender text check (gender is null or gender in ('female', 'male')),
  add column hair_type text,
  add column hair_concerns text[] not null default '{}',
  add column avatar_url text;

alter table branches
  add column latitude double precision check (latitude is null or latitude between -90 and 90),
  add column longitude double precision check (longitude is null or longitude between -180 and 180);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- 20260920172320 grant_profile_detail_columns_update ----
grant update (age, gender, hair_type, hair_concerns, avatar_url) on public.profiles to authenticated;

-- ---- 20260920172531 avatars_select_policy_for_upsert ----
create policy avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

-- ---- 20260920172929 replace_profile_age_with_birth_date ----
alter table profiles drop column age;
alter table profiles add column birth_date date
  check (birth_date is null or (birth_date <= current_date and birth_date >= date '1900-01-01'));
grant update (birth_date) on public.profiles to authenticated;
