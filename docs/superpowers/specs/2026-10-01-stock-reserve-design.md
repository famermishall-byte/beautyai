# Автосписание остатков при заказе — дизайн

Дата: 2026-10-01. Просьба владельца: «как только продался товар — вся база обновлялась по остаткам, иначе продавец
забудет отмечать вручную».

## Решения владельца
- Списывать **сразу при заказе** (бронь), а не при оплате/выдаче.
- При загрузке остатков из Excel / программы магазина **вычитать** товары в ещё не выданных заказах.

## Поведение

| Событие | Остаток филиала заказа |
|---|---|
| Клиент отправил заказ | − заказанное количество (строки с записью остатка); не хватает → заказ не создаётся, 409 «закончился» |
| Заказ отменён (любой путь: админка, RPC) | + текущие количества позиций (после правок) |
| Продавец/админ уменьшил позицию (в т.ч. до 0) | остаток этого товара в филиале = 0 (раньше — только при 0) |
| Оплачен / Отправлен / Выдан / Доставлен | без изменений |
| Позиция без строки в `product_branch_stock` | не трогается и заказ не блокирует (как сейчас) |
| Удаление открытого заказа (SQL, тест-чистка) | + количества (если заказ бронировал и статус не completed/cancelled) |

Только **новые** заказы бронируют: колонка `orders.stock_reserved boolean not null default false`, её ставит в `true`
триггер вставки. Возврат при отмене/удалении — только если `stock_reserved`. Старые заказы остаток не трогают.

`products.in_stock` пересчитывается существующим триггером `product_branch_stock_sync_in_stock` — ничего не добавляем.

## База (`supabase/stock_reserve.sql`, повторно запускаемый)
1. `alter table orders add column if not exists stock_reserved boolean not null default false`.
2. `orders_reserve_stock()` — BEFORE INSERT, security definer. Позиции `items_json` с `productId` и `quantity > 0`,
   по порядку `productId` (без взаимных блокировок): `update product_branch_stock set quantity = quantity - q
   where product_id, branch_id and quantity >= q`. Строка есть, но обновилась 0 строк → `raise exception
   'Товар «%» закончился в этом филиале.' using errcode = 'P0001'`. Строки нет → пропуск. `new.stock_reserved := true`.
   Если `branch_id is null` — ничего не делаем, `stock_reserved` остаётся false.
3. `orders_release_stock()` — AFTER UPDATE OF status (переход в `cancelled` из не-cancelled) и AFTER DELETE
   (статус не completed/cancelled), только при `stock_reserved`: `quantity = quantity + q` для существующих строк.
4. `edit_order_by_token` — условие обнуления остатка: `q < (it->>'quantity')::int` вместо `q = 0`. Остальное как в
   живой версии функции (перед правкой снять текущее определение из базы, не из файла).

## Приложение
- `src/lib/stock-reserve.ts` (чистые функции + тесты):
  - `reservedByProductBranch(orders)` → Map `"productId|branchId" → qty` по открытым заказам
    (`sent|confirmed|paid|shipped`) с `branchId`;
  - `netStock(fileQty, reserved)` = `max(0, fileQty − reserved)`;
  - `availableForOrder(current, itemQty, stockReserved)` = `stockReserved ? current + itemQty : current`.
- `src/app/api/orders/route.ts`: ошибка вставки с `code === 'P0001'` → 409 с текстом из базы. Предпроверка остатков
  остаётся (понятное сообщение по всем позициям сразу); триггер — защита от гонки.
- `src/lib/import/executeSync.ts`: перед upsert остатков вычесть брони открытых заказов (`netStock`).
- `src/app/api/admin/orders/route.ts` (`attachStock`): показывать `availableForOrder`; `mapOrder` отдаёт `stockReserved`.
- `src/app/api/admin/orders/[id]/route.ts`: обнулять остаток при `quantities[i] < it.quantity` (не только 0).

## Проверка
- `npm test` (новые тесты `stock-reserve.test.ts`), tsc, eslint, build.
- SQL применить на живой базе только после «да» владельца. Живая проверка на тестовом товаре/филиале: заказ → −q;
  второй заказ сверх остатка → 409; отмена → +q; уменьшение продавцом → 0; затем удалить тестовые заказы/аккаунт и
  вернуть остаток.
- Работа в ветке `worktree-stock-reserve`, merge в main `--no-ff` после проверки.

## Вне рамок
- Возврат товара после выдачи, частичные возвраты.
- Интеграция с программой магазина в реальном времени.
