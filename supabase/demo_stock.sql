-- ДЕМО-остатки: расставляет остатки демо-товарам (DEMO-*) по ВСЕМ филиалам магазина, чтобы на показе
-- были видны разные статусы: «В наличии», «Мало осталось», «Нет в наличии».
-- Затрагивает ТОЛЬКО демо-товары; реальные товары не трогает. Значения «псевдослучайные», но стабильные
-- (считаются из id товара и филиала), поэтому файл можно запускать повторно — результат одинаковый.
-- Распределение: ~10% — нет в наличии, ~15% — мало (1–3 шт.), остальное — в наличии (4–40 шт.);
-- у ~5% пар товар–филиал остаток не задан (в админке «Не заполнено»).
-- Запустить в Supabase → SQL Editor.

with calc as (
  select p.store_id, p.id as product_id, b.id as branch_id,
         abs(hashtext('a' || p.id::text || b.id::text)::bigint) as n1,
         abs(hashtext('b' || p.id::text || b.id::text)::bigint) as n2,
         abs(hashtext('c' || p.id::text || b.id::text)::bigint) as n3
  from products p
  join branches b on b.store_id = p.store_id
  where p.sku like 'DEMO-%'
), vals as (
  select store_id, product_id, branch_id, n3,
         case
           when (n1 % 100) < 10 then 0
           when (n1 % 100) < 25 then 1 + (n2 % 3)
           else 4 + (n2 % 37)
         end as quantity,
         now() - (n2 % 360) * interval '1 minute' as updated_at
  from calc
)
insert into product_branch_stock (store_id, product_id, branch_id, quantity, updated_at)
select store_id, product_id, branch_id, quantity, updated_at
from vals
where (n3 % 100) >= 5
on conflict (product_id, branch_id) do update
  set quantity = excluded.quantity, updated_at = excluded.updated_at;

-- Чтобы демо-товар не пропал из каталога целиком, у каждого товара должен быть хотя бы один филиал с остатком.
update product_branch_stock s
set quantity = 12
where (s.product_id, s.branch_id) in (
  select distinct on (t.product_id) t.product_id, t.branch_id
  from product_branch_stock t
  join products p on p.id = t.product_id
  where p.sku like 'DEMO-%'
    and not exists (select 1 from product_branch_stock u where u.product_id = t.product_id and u.quantity > 0)
  order by t.product_id, t.branch_id
);

-- Общий признак «есть в наличии» у товара = есть остаток хотя бы в одном филиале.
update products
set in_stock = exists (select 1 from product_branch_stock s where s.product_id = products.id and s.quantity > 0)
where sku like 'DEMO-%'
  and exists (select 1 from product_branch_stock s where s.product_id = products.id);
