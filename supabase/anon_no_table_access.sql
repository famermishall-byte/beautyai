-- Не вошедший в аккаунт пользователь (роль anon) не должен иметь прав на таблицы public.
--
-- Supabase по умолчанию выдаёт anon полный доступ ко всем таблицам и полагается только на политики RLS. Сейчас
-- политики не пускают anon (они все завязаны на auth.uid()), но одна ошибка в будущей политике открыла бы данные
-- без входа. Отзываем права как второй слой защиты. Страницы по ссылке продавца/курьера (/o, /c) работают через
-- функции (get_order_by_token и т. п.) — у функций свои права EXECUTE, их это не затрагивает.
--
-- Новые таблицы тоже создаются без прав для anon (ALTER DEFAULT PRIVILEGES). Можно запускать повторно.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
