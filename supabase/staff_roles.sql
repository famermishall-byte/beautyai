-- СОТРУДНИКИ И ФИЛИАЛЫ: роль «управляющий филиала», привязка к филиалу, назначение сотрудников владельцем.
-- Безопасно: только ДОБАВЛЯЕТ колонку, функции и правила; существующие данные не меняются. Можно запускать повторно.
-- Запустить в Supabase → SQL Editor (страницу не переводить переводчиком браузера!).

-- 1. У человека может быть филиал (для управляющего филиала) и новая роль.
alter table public.profiles add column if not exists branch_id uuid references public.branches(id) on delete set null;

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin', 'owner', 'super_admin', 'branch_manager'));

-- 2. Список сотрудников магазина — только для владельца.
create or replace function public.staff_list()
returns table (user_id uuid, email text, display_name text, role text, branch_id uuid, branch_name text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_store uuid;
begin
  select store_id into v_store from public.profiles where id = auth.uid() and role = 'owner';
  if v_store is null then
    raise exception 'Только владелец может управлять сотрудниками.';
  end if;
  return query
    select p.id, u.email::text, p.display_name::text, p.role::text, p.branch_id, b.name::text
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.branches b on b.id = p.branch_id
    where p.store_id = v_store and p.role::text in ('owner', 'admin', 'branch_manager')
    order by (p.role::text = 'owner') desc, b.name nulls first, u.email;
end $$;

-- 3. Назначить / изменить / снять роль (new_role = 'user' снимает доступ) — только владелец.
create or replace function public.staff_set(target_email text, new_role text, new_branch uuid default null)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_store uuid; v_target uuid; v_target_role text;
begin
  select store_id into v_store from public.profiles where id = auth.uid() and role = 'owner';
  if v_store is null then
    raise exception 'Только владелец может назначать сотрудников.';
  end if;
  if new_role not in ('admin', 'branch_manager', 'user') then
    raise exception 'Недопустимая роль.';
  end if;

  select id into v_target from auth.users where lower(email) = lower(trim(target_email));
  if v_target is null then
    raise exception 'Человек с такой почтой ещё не зарегистрирован в приложении.';
  end if;

  select role::text into v_target_role from public.profiles where id = v_target and store_id = v_store;
  if v_target_role is null then
    raise exception 'Этот человек не относится к вашему магазину.';
  end if;
  if v_target_role = 'owner' then
    raise exception 'Роль владельца менять нельзя.';
  end if;
  if v_target = auth.uid() then
    raise exception 'Свою роль менять нельзя.';
  end if;

  if new_role = 'branch_manager' then
    if new_branch is null or not exists (select 1 from public.branches where id = new_branch and store_id = v_store) then
      raise exception 'Выберите филиал для управляющего.';
    end if;
  else
    new_branch := null;
  end if;

  update public.profiles set role = new_role, branch_id = new_branch where id = v_target;
end $$;

grant execute on function public.staff_list() to authenticated;
grant execute on function public.staff_set(text, text, uuid) to authenticated;

-- 4. Управляющий филиала видит и правит остатки и заказы ТОЛЬКО своего филиала (правила добавляются к существующим).
drop policy if exists stock_branch_manager on public.product_branch_stock;
create policy stock_branch_manager on public.product_branch_stock
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'branch_manager'
      and p.branch_id = product_branch_stock.branch_id and p.store_id = product_branch_stock.store_id))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'branch_manager'
      and p.branch_id = product_branch_stock.branch_id and p.store_id = product_branch_stock.store_id));

drop policy if exists orders_branch_manager_select on public.orders;
create policy orders_branch_manager_select on public.orders
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'branch_manager'
      and p.branch_id = orders.branch_id and p.store_id = orders.store_id));

drop policy if exists orders_branch_manager_update on public.orders;
create policy orders_branch_manager_update on public.orders
  for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'branch_manager'
      and p.branch_id = orders.branch_id and p.store_id = orders.store_id));

-- 5. Общий признак «есть в наличии» у товара обновляется автоматически при любом изменении остатков
--    (управляющий филиала не может менять таблицу товаров сам, поэтому это делает база).
create or replace function public.sync_product_in_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_product uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products
  set in_stock = exists (select 1 from public.product_branch_stock s where s.product_id = v_product and s.quantity > 0)
  where id = v_product;
  return null;
end $$;

drop trigger if exists product_branch_stock_sync_in_stock on public.product_branch_stock;
create trigger product_branch_stock_sync_in_stock
  after insert or update of quantity or delete on public.product_branch_stock
  for each row execute function public.sync_product_in_stock();
