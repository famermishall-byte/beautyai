-- ЗАКАЗЫ: новые статусы «Оплачен» и «Передан курьеру» + дата оплаты для подсчёта продаж.
-- Безопасно: только ДОБАВЛЯЕТ колонки и функцию, существующие заказы не меняются (кроме того, что уже
-- выполненные заказы получают дату оплаты = дате создания, чтобы они попали в продажи). Можно запускать повторно.
-- Запустить в Supabase → SQL Editor (страницу не переводить переводчиком браузера!).

alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists shipped_at timestamptz;
-- Как и когда последний раз менялся статус: "whatsapp" (продавец нажал ссылку в чате) или "admin" (в приложении).
alter table public.orders add column if not exists status_source text;
alter table public.orders add column if not exists status_changed_at timestamptz;

-- Уже выполненные заказы считаем проданными.
update public.orders set paid_at = created_at where status = 'completed' and paid_at is null;

-- Разрешить новые значения статуса (старое ограничение на статус, если было, заменяется).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check check (status in ('sent', 'confirmed', 'paid', 'shipped', 'completed', 'cancelled'));

-- Смена статуса по ссылке из WhatsApp (без входа в приложение) — теперь для всех статусов.
create or replace function public.set_order_status_by_token(p_token text, p_status text)
returns table (order_number text, order_status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('confirmed', 'paid', 'shipped', 'completed', 'cancelled') then
    raise exception 'Недопустимый статус.';
  end if;
  return query
    update public.orders o
    set status = p_status,
        paid_at = case when p_status in ('paid', 'shipped', 'completed') then coalesce(o.paid_at, now()) else o.paid_at end,
        shipped_at = case when p_status = 'shipped' then coalesce(o.shipped_at, now()) else o.shipped_at end,
        status_source = 'whatsapp',
        status_changed_at = now()
    where o.status_token::text = p_token
    returning o.number::text, o.status::text;
end $$;

grant execute on function public.set_order_status_by_token(text, text) to anon, authenticated;
