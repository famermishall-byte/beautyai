-- Секретные ссылки заказа (status_token — продавец, courier_token — курьер) больше не читаются сессией пользователя.
--
-- Зачем: функции set_order_status_by_token / edit_order_by_token / mark_delivered_by_courier_token считают
-- секретом сам токен. Но покупатель мог прочитать токен СВОЕГО заказа запросом к таблице orders (политика
-- orders_select_own даёт читать строку целиком) и вызвать функции продавца/курьера — например, самому отметить заказ
-- оплаченным. Права на чтение этих двух колонок отзываем: функции и триггеры работают от имени владельца
-- (SECURITY DEFINER), сервер читает токен сервисным ключом (POST /api/orders, GET /api/orders/recent).
--
-- ВАЖНО на будущее: после этого у authenticated есть право читать только перечисленные колонки. Новая колонка в
-- orders, которую должен видеть пользователь, = отдельный `grant select (имя) on public.orders to authenticated`
-- (как с profiles) и добавление имени в ORDER_COLUMNS в src/lib/supabase.ts. `select("*")` по orders не использовать.
--
-- Можно запускать повторно.

revoke select on public.orders from anon, authenticated;

grant select (
  id, store_id, user_id, branch_id, number, legacy_number, status, total_price, original_total,
  is_wholesale, customer_name, customer_phone, items_json, created_at, paid_at, shipped_at,
  delivered_at, status_source, status_changed_at, edited_at, edited_by, stock_reserved,
  delivery_method, delivery_address, delivery_time, courier_phone
) on public.orders to authenticated;
