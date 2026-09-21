-- ИЗМЕНЕНИЕ СОСТАВА ЗАКАЗА продавцом по ссылке из WhatsApp (без входа в приложение).
-- Продавец может только УМЕНЬШИТЬ количество (0 = товара нет), добавить товар или поменять цену нельзя.
-- После «Оплата получена» состав блокируется (правит только администратор в приложении).
-- Если продавец поставил 0 — остаток этого товара в этом филиале автоматически становится 0.
-- Безопасно: только ДОБАВЛЯЕТ колонки и функции; существующие заказы и остатки не меняются. Можно запускать повторно.
-- Запустить в Supabase → SQL Editor (страницу не переводить переводчиком браузера!).

alter table public.orders add column if not exists original_total numeric;   -- сумма до изменений (заполняется при первом изменении)
alter table public.orders add column if not exists edited_at timestamptz;
alter table public.orders add column if not exists edited_by text;           -- 'whatsapp' | 'admin'

-- Заказ для мини-страницы продавца: по секретному токену из ссылки.
create or replace function public.get_order_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'number', o.number,
    'customerName', o.customer_name,
    'customerPhone', o.customer_phone,
    'status', o.status,
    'totalPrice', o.total_price,
    'originalTotal', o.original_total,
    'items', o.items_json,
    'branchName', b.name,
    'editedAt', o.edited_at
  )
  from public.orders o
  left join public.branches b on b.id = o.branch_id
  where o.status_token::text = p_token
$$;

-- Изменить количество по позициям (массив чисел в том же порядке, что и позиции заказа).
create or replace function public.edit_order_by_token(p_token text, p_quantities jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
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

    -- Продавец сказал «нет» → в этом филиале остаток товара = 0, чтобы его больше не заказывали.
    if q = 0 and (it->>'quantity')::int > 0 and (it->>'productId') is not null and o.branch_id is not null then
      insert into public.product_branch_stock (store_id, product_id, branch_id, quantity, updated_at)
      values (o.store_id, (it->>'productId')::uuid, o.branch_id, 0, now())
      on conflict (product_id, branch_id) do update set quantity = 0, updated_at = now();
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

  return public.get_order_by_token(p_token);
end $$;

grant execute on function public.get_order_by_token(text) to anon, authenticated;
grant execute on function public.edit_order_by_token(text, jsonb) to anon, authenticated;
