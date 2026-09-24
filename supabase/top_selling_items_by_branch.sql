-- «Рейтинг товаров» в админке: сколько штук каждого товара продано в конкретном филиале.
-- Отличие от top_selling_items.sql: та функция берёт весь магазин и матчит по name+brand (для
-- витринного блока «ХИТ»), эта — один филиал и матчит по productId из items_json (надёжнее,
-- и умеет отдавать 0 для товаров, которых вообще не покупали — нужно для полного рейтинга
-- всего каталога, а не только топ-N). Запустить один раз в Supabase → SQL Editor (уже запущено
-- 24.09 через Supabase MCP при добавлении этой функции — этот файл только для истории).
create or replace function public.top_selling_items_by_branch(p_branch_id uuid, p_limit int default 1000)
returns table (product_id uuid, total_qty bigint)
language sql
stable
security definer
set search_path = public
as $$
  select (i->>'productId')::uuid as product_id, sum(coalesce((i->>'quantity')::int, 1)) as total_qty
  from orders o
  join profiles p on p.id = auth.uid() and p.store_id = o.store_id
  cross join lateral jsonb_array_elements(o.items_json::jsonb) i
  where o.status <> 'cancelled'
    and o.branch_id = p_branch_id
    and i->>'productId' is not null
  group by 1
  order by 2 desc
  limit p_limit;
$$;
grant execute on function public.top_selling_items_by_branch(uuid, int) to authenticated;
