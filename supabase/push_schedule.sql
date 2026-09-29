-- РАССЫЛКА: ЗАПЛАНИРОВАТЬ, СРОК «ДО», ИЗМЕНИТЬ/УДАЛИТЬ (docs/superpowers/specs/2026-09-29-push-schedule-design.md).
-- Безопасно: добавляет колонки, функции, триггеры и задачу pg_cron. Можно запускать повторно.

create extension if not exists pg_cron;

alter table public.push_broadcasts
  add column if not exists scheduled_at timestamptz,
  add column if not exists valid_until date,
  add column if not exists status text not null default 'sending',
  add column if not exists sent_at timestamptz;

do $$ begin
  alter table public.push_broadcasts add constraint push_broadcasts_status_check check (status in ('scheduled', 'sending', 'sent'));
exception when duplicate_object then null; end $$;

-- При создании: в будущем — «запланировано», иначе — сразу отправляется.
create or replace function public.push_broadcasts_before_insert()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.status := case when new.scheduled_at is not null and new.scheduled_at > now() then 'scheduled' else 'sending' end;
  new.sent_at := null;
  new.sent_count := null;
  return new;
end $$;

drop trigger if exists push_broadcasts_before_insert on public.push_broadcasts;
create trigger push_broadcasts_before_insert before insert on public.push_broadcasts
  for each row execute function public.push_broadcasts_before_insert();

create or replace function public.push_broadcasts_after_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'sending' then
    perform public.notify_push('broadcast', new.id);
  end if;
  return new;
end $$;

-- Менять содержимое можно только у запланированной; служебные поля (status, sent_at, sent_count) пишет отправка.
create or replace function public.push_broadcasts_before_update()
returns trigger language plpgsql set search_path = public
as $$
begin
  if old.status <> 'scheduled'
     and (new.title, new.body, new.url, new.scheduled_at, new.valid_until) is distinct from
         (old.title, old.body, old.url, old.scheduled_at, old.valid_until) then
    raise exception 'Отправленную рассылку изменить нельзя — её можно только удалить.';
  end if;
  return new;
end $$;

drop trigger if exists push_broadcasts_before_update on public.push_broadcasts;
create trigger push_broadcasts_before_update before update on public.push_broadcasts
  for each row execute function public.push_broadcasts_before_update();

-- Раз в минуту: запланированные с наступившим временем → отправка.
create or replace function public.send_due_broadcasts()
returns void language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  for r in
    update public.push_broadcasts set status = 'sending'
    where status = 'scheduled' and scheduled_at <= now()
    returning id
  loop
    perform public.notify_push('broadcast', r.id);
  end loop;
end $$;
revoke all on function public.send_due_broadcasts() from public, anon, authenticated;
revoke all on function public.push_broadcasts_before_insert() from public, anon, authenticated;
revoke all on function public.push_broadcasts_before_update() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('send-due-broadcasts');
exception when others then null; end $$;
select cron.schedule('send-due-broadcasts', '* * * * *', 'select public.send_due_broadcasts()');
