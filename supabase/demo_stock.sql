-- ДЕМО-остатки: раскидывает случайные остатки демо-товарам (DEMO-*) по ВСЕМ филиалам магазина,
-- чтобы на показе были видны разные статусы: «В наличии», «Мало осталось», «Нет в наличии».
-- ТОЛЬКО ДОБАВЛЯЕТ: уже заданные остатки не перезаписываются (on conflict do nothing), реальные товары
-- не затрагиваются. Запустить в Supabase → SQL Editor (можно повторно — новые строки не появятся).
--
-- Распределение: ~10% — нет в наличии, ~15% — мало (1–3 шт.), остальное — в наличии (4–40 шт.);
-- у ~5% пар товар–филиал остаток не задан (виден как «Не заполнено» в админке).

insert into product_branch_stock (store_id, product_id, branch_id, quantity, updated_at)
select p.store_id, p.id, b.id,
       case
         when x.r < 0.10 then 0
         when x.r < 0.25 then 1 + floor(random() * 3)::int
         else 4 + floor(random() * 37)::int
       end,
       now() - random() * interval '6 hours'
from products p
join branches b on b.store_id = p.store_id
cross join lateral (select random() as r) x
where p.sku like 'DEMO-%'
  and random() > 0.05
on conflict (product_id, branch_id) do nothing;

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
