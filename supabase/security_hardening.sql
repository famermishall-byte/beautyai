-- ЗАКРЫТИЕ ОБХОДНЫХ ПУТЕЙ (проверка безопасности 01.10). Можно запускать повторно.
-- 1. Ссылка продавца: база сама пускает только шаги, которые показывают кнопки (lib/delivery.ts sellerActions),
--    без отмены — отменяет только владелец/администратор в админке (решение владельца 29.09).
-- 2. Старая функция смены статуса (одноразовые ссылки первой версии) — удалена.
-- 3. Продажи по филиалу (рейтинг товаров) — только сотрудникам, не покупателям.
-- 4. Служебные функции нельзя вызывать через API (триггеры работают как прежде).

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
        or (p_status = 'completed' and ((o.delivery_method = 'pickup' and o.status = 'paid')
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

drop function if exists public.update_order_status_by_token(uuid, text);

create or replace function public.top_selling_items_by_branch(p_branch_id uuid, p_limit integer default 1000)
returns table(product_id uuid, total_qty bigint)
language sql stable security definer set search_path = public
as $$
  select (i->>'productId')::uuid as product_id, sum(coalesce((i->>'quantity')::int, 1)) as total_qty
  from orders o
  join profiles p on p.id = auth.uid() and p.store_id = o.store_id
    and p.role::text in ('owner', 'admin', 'branch_manager')
  cross join lateral jsonb_array_elements(o.items_json::jsonb) i
  where o.status <> 'cancelled'
    and o.branch_id = p_branch_id
    and i->>'productId' is not null
  group by 1
  order by 2 desc
  limit p_limit;
$$;
revoke all on function public.top_selling_items_by_branch(uuid, integer) from public, anon;
grant execute on function public.top_selling_items_by_branch(uuid, integer) to authenticated;

-- Только для входящих пользователей (сами проверяют, кто вызывает).
revoke all on function public.staff_list() from public, anon;
grant execute on function public.staff_list() to authenticated;
revoke all on function public.staff_set(text, text, uuid) from public, anon;
grant execute on function public.staff_set(text, text, uuid) to authenticated;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- Триггерные функции — не для API.
revoke all on function public.orders_reserve_stock() from public, anon, authenticated;
revoke all on function public.orders_release_stock() from public, anon, authenticated;
revoke all on function public.sync_product_in_stock() from public, anon, authenticated;
revoke all on function public.handle_user_confirmed() from public, anon, authenticated;
