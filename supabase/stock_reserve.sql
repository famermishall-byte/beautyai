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
