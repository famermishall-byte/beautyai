-- САМОВЫВОЗ: «Выдан и оплачен» одной кнопкой (просьба владельца 01.10). Можно запускать повторно.
-- Как supabase/security_hardening.sql, но самовывоз можно отметить «Выполнен» и до оплаты (оплата на месте —
-- paid_at ставится в момент выдачи).

create or replace function public.set_order_status_by_token(p_token text, p_status text)
returns table(order_number text, order_status text)
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('paid', 'shipped', 'completed') then
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
      and (
        (p_status = 'paid' and o.status in ('sent', 'confirmed'))
        or (p_status = 'shipped' and o.delivery_method = 'delivery' and o.status in ('sent', 'confirmed', 'paid'))
        or (p_status = 'completed' and ((o.delivery_method = 'pickup' and o.status in ('sent', 'confirmed', 'paid'))
                                        or (o.delivery_method = 'delivery' and o.status = 'shipped')))
      )
    returning o.number::text, o.status::text;
  if not found then
    if not exists (select 1 from public.orders where status_token::text = p_token) then
      raise exception 'Заказ не найден.';
    end if;
    raise exception 'Этот шаг сейчас недоступен — обновите страницу.';
  end if;
end $$;
