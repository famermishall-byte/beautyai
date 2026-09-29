-- САМОВЫВОЗ / ДОСТАВКА, «ОТПРАВЛЕН», «ДОСТАВЛЕН», ССЫЛКА КУРЬЕРУ (docs/superpowers/specs/2026-09-29-order-delivery-design.md).
-- Безопасно: добавляет колонки (старые заказы становятся «самовывоз») и заменяет/добавляет функции. Можно запускать повторно.
-- Изменение смысла: «Отправлен» (shipped) больше НЕ означает оплату — заказ с доставкой можно отправить до оплаты.

alter table public.orders
  add column if not exists delivery_method text not null default 'pickup',
  add column if not exists delivery_address text,
  add column if not exists delivery_time text,
  add column if not exists courier_phone text,
  add column if not exists delivered_at timestamptz,
  add column if not exists courier_token uuid not null default gen_random_uuid();

do $$ begin
  alter table public.orders add constraint orders_delivery_method_check check (delivery_method in ('pickup', 'delivery'));
exception when duplicate_object then null; end $$;

create unique index if not exists orders_courier_token_key on public.orders(courier_token);

-- Статус по ссылке продавца: shipped — без оплаты; completed — ставит оплату (если не было) и время доставки.
create or replace function public.set_order_status_by_token(p_token text, p_status text)
returns table(order_number text, order_status text)
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('confirmed', 'paid', 'shipped', 'completed', 'cancelled') then
    raise exception 'Недопустимый статус.';
  end if;
  return query
    update public.orders o
    set status = p_status,
        paid_at = case when p_status in ('paid', 'completed') then coalesce(o.paid_at, now()) else o.paid_at end,
        shipped_at = case when p_status = 'shipped' then coalesce(o.shipped_at, now()) else o.shipped_at end,
        delivered_at = case when p_status = 'completed' and o.delivery_method = 'delivery' then coalesce(o.delivered_at, now()) else o.delivered_at end,
        status_source = 'whatsapp',
        status_changed_at = now()
    where o.status_token::text = p_token
    returning o.number::text, o.status::text;
end $$;

create or replace function public.get_order_by_token(p_token text)
returns jsonb
language sql stable security definer set search_path = public
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
    'editedAt', o.edited_at,
    'paidAt', o.paid_at,
    'deliveryMethod', o.delivery_method,
    'deliveryAddress', o.delivery_address,
    'deliveryTime', o.delivery_time,
    'courierPhone', o.courier_phone,
    'courierToken', o.courier_token
  )
  from public.orders o
  left join public.branches b on b.id = o.branch_id
  where o.status_token::text = p_token
$$;

-- Страница курьера /c/<courier_token>: только то, что нужно для доставки (без права менять состав или отменять).
create or replace function public.get_order_by_courier_token(p_token text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'number', o.number,
    'customerName', o.customer_name,
    'customerPhone', o.customer_phone,
    'courierPhone', o.courier_phone,
    'deliveryAddress', o.delivery_address,
    'deliveryTime', o.delivery_time,
    'status', o.status,
    'totalPrice', o.total_price,
    'paid', o.paid_at is not null,
    'items', o.items_json,
    'branchName', b.name,
    'branchPhone', b.whatsapp,
    'deliveredAt', o.delivered_at
  )
  from public.orders o
  left join public.branches b on b.id = o.branch_id
  where o.courier_token::text = p_token and o.delivery_method = 'delivery'
$$;

create or replace function public.mark_delivered_by_courier_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  update public.orders o
  set status = 'completed',
      paid_at = coalesce(o.paid_at, now()),
      delivered_at = coalesce(o.delivered_at, now()),
      status_source = 'courier',
      status_changed_at = now()
  where o.courier_token::text = p_token and o.delivery_method = 'delivery' and o.status = 'shipped';
  if not found then
    raise exception 'Заказ уже отмечен или ещё не отправлен.';
  end if;
  return public.get_order_by_courier_token(p_token);
end $$;

grant execute on function public.set_order_status_by_token(text, text) to anon, authenticated;
grant execute on function public.get_order_by_token(text) to anon, authenticated;
grant execute on function public.get_order_by_courier_token(text) to anon, authenticated;
grant execute on function public.mark_delivered_by_courier_token(text) to anon, authenticated;
