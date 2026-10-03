-- Список сотрудников (раздел «Сотрудники», только владелец) не открывался: функция staff_list() всегда
-- падала с ошибкой «column reference "role" is ambiguous». Имя выходного столбца функции — role — совпало
-- со столбцом role в её первом запросе, и база не могла решить, что имеется в виду.
--
-- Исправление: в первом запросе столбцы названы через псевдоним таблицы (p.role, p.store_id, p.id).
-- Больше ничего не меняется: та же проверка «только владелец», те же столбцы в ответе, те же права на вызов.
-- Данные не затрагиваются. Можно запускать повторно.

create or replace function public.staff_list()
returns table(user_id uuid, email text, display_name text, role text, branch_id uuid, branch_name text)
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare v_store uuid;
begin
  select p.store_id into v_store from public.profiles p where p.id = auth.uid() and p.role = 'owner';
  if v_store is null then
    raise exception 'Только владелец может управлять сотрудниками.';
  end if;
  return query
    select p.id, u.email::text, p.display_name::text, p.role::text, p.branch_id, b.name::text
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.branches b on b.id = p.branch_id
    where p.store_id = v_store and p.role::text in ('owner', 'admin', 'branch_manager')
    order by (p.role::text = 'owner') desc, b.name nulls first, u.email;
end $function$;
