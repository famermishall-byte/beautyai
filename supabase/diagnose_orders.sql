-- ДИАГНОСТИКА (только чтение, ничего не меняет): почему заказ не виден в админке.
-- Показывает 5 последних заказов и кто из сотрудников к какому магазину/филиалу привязан.
select 'заказ' as что, o.number as номер, o.status as статус, o.created_at as создан,
       o.store_id::text as магазин, o.branch_id::text as филиал, o.user_id::text as покупатель
from public.orders o
order by o.created_at desc
limit 5;

select 'сотрудник' as что, u.email as почта, p.role as роль, p.store_id::text as магазин, p.branch_id::text as филиал
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('owner', 'admin', 'branch_manager');
