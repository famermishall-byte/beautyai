-- «Хит продаж»: самые заказываемые товары магазина текущего пользователя.
-- security definer, потому что обычный покупатель по RLS видит только свои заказы.
-- Запустить один раз в Supabase → SQL Editor.
create or replace function public.top_selling_items(p_limit int default 12)
returns table (name text, brand text, total_qty bigint)
language sql
stable
security definer
set search_path = public
as $$
  select i->>'name' as name, i->>'brand' as brand, sum(coalesce((i->>'quantity')::int, 1)) as total_qty
  from orders o
  join profiles p on p.id = auth.uid() and p.store_id = o.store_id
  cross join lateral jsonb_array_elements(o.items_json::jsonb) i
  where o.status <> 'cancelled'
  group by 1, 2
  order by 3 desc
  limit p_limit;
$$;
grant execute on function public.top_selling_items(int) to authenticated;
