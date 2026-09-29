-- Номер заказа — просто число (1, 2, 3 …), его выдаёт база (29.09).
-- Раньше приложение считало номер как «число заказов + 1», но под RLS покупатель видит только СВОИ заказы,
-- поэтому у каждого нового клиента первый заказ получал BA-00001 (повторы). Теперь номер ставит триггер
-- из счётчика магазина: upsert в store_order_counters блокирует строку счётчика, так что два одновременных
-- заказа не получат один номер; уникальный индекс (store_id, number) — страховка.

-- 1) Прежние номера (BA-…) сохраняем — по ним можно найти заказ из старой переписки в WhatsApp.
alter table public.orders add column if not exists legacy_number text;
update public.orders set legacy_number = number where legacy_number is null and number like 'BA-%';

-- 2) Перенумеровать существующие заказы по дате оформления, отдельно в каждом магазине.
with ranked as (
  select id, row_number() over (partition by store_id order by created_at, id) as rn
  from public.orders
)
update public.orders o set number = ranked.rn::text from ranked where ranked.id = o.id;

-- 3) Счётчик магазина. Без политик RLS: к нему обращается только функция-триггер ниже.
create table if not exists public.store_order_counters (
  store_id uuid primary key references public.stores(id) on delete cascade,
  last_number integer not null default 0
);
alter table public.store_order_counters enable row level security;

insert into public.store_order_counters (store_id, last_number)
select store_id, count(*) from public.orders group by store_id
on conflict (store_id) do update set last_number = excluded.last_number;

-- 4) Триггер: номер всегда ставит база, что бы ни прислало приложение.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.store_order_counters as c (store_id, last_number)
  values (new.store_id, 1)
  on conflict (store_id) do update set last_number = c.last_number + 1
  returning c.last_number into n;
  new.number := n::text;
  return new;
end;
$$;

revoke execute on function public.assign_order_number() from public, anon, authenticated;

drop trigger if exists orders_assign_number on public.orders;
create trigger orders_assign_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

create unique index if not exists orders_store_number_key on public.orders (store_id, number);
