-- PUSH-УВЕДОМЛЕНИЯ (docs/superpowers/specs/2026-09-29-web-push-design.md).
-- Безопасно: добавляет таблицы, функции и триггеры; заказы и данные не меняются. Можно запускать повторно.
-- Секреты (VAPID-ключи и секрет вебхука) кладутся в Supabase Vault ОТДЕЛЬНО, не этим файлом:
--   select vault.create_secret('<значение>', 'push_vapid_public');
--   select vault.create_secret('<значение>', 'push_vapid_private');
--   select vault.create_secret('<значение>', 'push_webhook_secret');
-- Отправляет Edge Function `send-push` (supabase/functions/send-push). Сбой отправки никогда не ломает заказ.

create extension if not exists pg_net with schema extensions;

-- Подписки браузеров. Каждый видит и меняет только свои.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = push_subscriptions.store_id)
  );

-- Рассылки клиентам («акции и новинки»). Пишут и видят только владелец/админ своего магазина.
create table if not exists public.push_broadcasts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 300),
  url text check (url is null or url ~ '^/'),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_count integer
);
alter table public.push_broadcasts enable row level security;

drop policy if exists push_broadcasts_manager on public.push_broadcasts;
create policy push_broadcasts_manager on public.push_broadcasts
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = push_broadcasts.store_id and p.role::text in ('owner', 'admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = push_broadcasts.store_id and p.role::text in ('owner', 'admin')));

-- Секреты для Edge Function. Выполнять может только service_role.
create or replace function public.push_config()
returns jsonb
language sql stable security definer set search_path = public, vault
as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('push_vapid_public', 'push_vapid_private', 'push_webhook_secret')
$$;
revoke all on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;

-- Зовёт Edge Function асинхронно (pg_net) — ошибки глотаются, чтобы не мешать заказу.
create or replace function public.notify_push(p_event text, p_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions, vault
as $$
begin
  perform net.http_post(
    url := 'https://nufmsvwkixnfjvzdabmz.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('event', p_event, 'id', p_id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret')
    )
  );
exception when others then
  null;
end $$;
revoke all on function public.notify_push(text, uuid) from public, anon, authenticated;

create or replace function public.orders_push_after_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.notify_push('order_new', new.id);
  return new;
end $$;

create or replace function public.orders_push_after_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('paid', 'shipped', 'completed', 'cancelled') then
    perform public.notify_push('order_status', new.id);
  elsif new.edited_at is distinct from old.edited_at and new.edited_at is not null then
    perform public.notify_push('order_edited', new.id);
  end if;
  return new;
end $$;

create or replace function public.push_broadcasts_after_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.notify_push('broadcast', new.id);
  return new;
end $$;

drop trigger if exists orders_push_insert on public.orders;
create trigger orders_push_insert after insert on public.orders
  for each row execute function public.orders_push_after_insert();

drop trigger if exists orders_push_update on public.orders;
create trigger orders_push_update after update on public.orders
  for each row execute function public.orders_push_after_update();

drop trigger if exists push_broadcasts_insert on public.push_broadcasts;
create trigger push_broadcasts_insert after insert on public.push_broadcasts
  for each row execute function public.push_broadcasts_after_insert();

revoke all on function public.orders_push_after_insert() from public, anon, authenticated;
revoke all on function public.orders_push_after_update() from public, anon, authenticated;
revoke all on function public.push_broadcasts_after_insert() from public, anon, authenticated;

-- Сохранить подписку этого браузера за текущим пользователем (если на телефоне вошёл другой человек — подписка
-- переходит к нему, чтобы чужие уведомления сюда не приходили). Удалить — только свою.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_store uuid;
begin
  if auth.uid() is null then raise exception 'Не авторизовано.'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 or char_length(p_p256dh) > 200 or char_length(p_auth) > 100 then
    raise exception 'Некорректная подписка.';
  end if;
  select store_id into v_store from public.profiles where id = auth.uid();
  if v_store is null then raise exception 'Профиль не найден.'; end if;
  insert into public.push_subscriptions (user_id, store_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), v_store, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, store_id = excluded.store_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end $$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;
