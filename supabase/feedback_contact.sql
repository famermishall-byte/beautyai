-- КОНТАКТЫ КЛИЕНТА В ОБРАТНОЙ СВЯЗИ: филиал видит имя, телефон и почту клиента, чтобы связаться с ним.
-- Данные сохраняются в самом сообщении в момент отправки — профили клиентов сотрудникам по-прежнему
-- не видны (RLS profiles_select_own). Безопасно: только ДОБАВЛЯЕТ колонки. Можно запускать повторно.

alter table public.feedback
  add column if not exists author_name text,
  add column if not exists author_email text,
  add column if not exists contact_phone text;
