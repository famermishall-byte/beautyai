-- ЖИВОЕ ОБНОВЛЕНИЕ ЗАКАЗОВ В АДМИНКЕ (просьба владельца 29.09): Supabase Realtime сообщает открытой странице «Заказы» о каждом
-- изменении заказа. Realtime уважает RLS — каждый получает только заказы, которые ему и так видны. Можно запускать повторно.
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
