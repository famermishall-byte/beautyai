# Восстановление проекта с нуля (новый компьютер / потеря ноутбука)

Все ценное живёт **не на вашем компьютере**:

| Что | Где хранится | Зависит от ноутбука? |
|---|---|---|
| Код, картинки демо-товаров, SQL, документация | GitHub `famermishall-byte/beautyai` (ветка `main`, метка `v0.9-showcase`) | Нет |
| Сайт (прод) | Vercel, проект `beautyai-famermishall-3772`, деплой сам из `main` | Нет |
| База данных, пользователи (логины), заказы, аватарки | Supabase, проект `nufmsvwkixnfjvzdabmz` | Нет |
| Мобильные приложения (Android/iOS) | Оболочка Capacitor в git; грузит живой сайт | Нет |
| Ключи и секреты | Панели Supabase / Vercel + ваш менеджер паролей | Нет, если сохранены там |
| Файл `.env` | Только на ноутбуке (не в git) | Да — но воссоздаётся за 2 минуты (шаг 3) |

> ⚠️ Единственное, что НЕ защищено автоматически: **резервные копии базы**. На бесплатном тарифе Supabase
> их нет. См. раздел «Резервные копии» внизу — делайте хотя бы раз в неделю.

---

## Что нужно иметь при себе (не в git — запишите в менеджер паролей)

1. Вход в **GitHub** (аккаунт `famermishall-byte`) — с двухфакторной защитой и резервными кодами.
2. Вход в **Supabase** (проект `nufmsvwkixnfjvzdabmz`) и **пароль базы данных** (Project Settings → Database).
3. Вход в **Vercel**.
4. Для публикации мобильных приложений: аккаунты Google Play / Apple Developer (если появятся) и
   **файл ключа подписи Android (keystore) с паролями — его нет в git; потеряете — не сможете обновлять приложение**.
   Сейчас keystore ещё не создан; когда создадите — храните копию вне ноутбука.
5. Значения переменных из `.env.example` (когда будут заданы `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).

---

## Сценарий А. Сломался/потерян компьютер, а Supabase и Vercel живы (самый частый)

База и сайт продолжают работать — нужно только вернуть возможность править код.

1. **Установить инструменты:** Git, Node.js 24 LTS (проект собирался на Node 24.19 / npm 11; подойдёт Node ≥ 20.9),
   VS Code (по желанию). Для Android — Android Studio; для iOS — Mac с Xcode.
2. **Забрать код:**
   ```bash
   git clone https://github.com/famermishall-byte/beautyai.git
   cd beautyai
   npm ci
   ```
   (`npm ci` ставит точные версии из `package-lock.json`.)
3. **Создать `.env`:** `cp .env.example .env`, вписать `SUPABASE_URL` и `SUPABASE_ANON_KEY`
   (Supabase → Project Settings → API). Без `.env` проект тоже запустится — те же значения зашиты по умолчанию
   в `src/lib/supabase/config.ts`.
4. **Запустить:** `npm run dev` → http://localhost:3000. Войдите владельцем — увидите живые данные.
5. **Проверка:** `npm run lint` и `npm run build` проходят без ошибок.
6. **Git-доступ на новом ПК:** войти в GitHub (`gh auth login` или Git Credential Manager). Дальше `git push` в `main` →
   Vercel выкладывает сам.
7. **Claude Code (по желанию):** папка памяти ассистента лежит вне репозитория и на новом ПК будет пустой; вся суть
   проекта — в `PROJECT_CONTEXT.md` (читать первым), просто попросите ассистента прочитать его.

Время: ~15 минут.

## Сценарий Б. Полная потеря: и Supabase-проект удалён/сломан (катастрофа)

Нужны последние резервные копии базы (см. ниже). Без них восстановятся структура и демо-товары, но **не** реальные
заказы, аккаунты и аватарки.

1. Выполнить шаги 1–2 сценария А.
2. **Создать новый проект Supabase** (регион как раньше). Запомнить `Project URL`, `anon key`, `service_role key`,
   пароль БД.
3. **Настроить Auth** (Authentication → Sign In / Providers): Email включён; «Confirm email» — пока ВЫКЛ (как сейчас,
   для показа); Site URL = адрес сайта на Vercel, Redirect URLs = он же + `/**`.
4. **Накатить схему** — в Supabase → SQL Editor запускать файлы из `supabase/` **строго в этом порядке**:
   1. `00_base_schema.sql` — таблицы, RLS, триггеры, функции, бакет `avatars`, магазин `demo`
   2. `demo_products.sql` — **только при первичной загрузке**, повторно не запускать
   3. `product_attributes.sql`
   4. `section_lists.sql`
   5. `catalog_structure.sql`
   6. `demo_stock.sql` (можно повторять)
   7. `top_selling_items.sql`
   8. `staff_roles.sql`
   9. `order_payments.sql`
   10. `order_edit.sql`

   `diagnose_orders.sql` — только чтение (для разбора «не вижу заказ»), запускать не обязательно.
5. **Назначить владельца:** зарегистрируйтесь в приложении и выполните в SQL Editor
   `update public.profiles set role = 'owner' where email = 'ваш@email';`
6. **Восстановить данные** (если есть копия) — см. «Восстановление из дампа». Если копий нет — заказы и
   пользователи потеряны, начинаете с демо-данных.
7. **Перенаправить приложение на новый проект:** в Vercel → Settings → Environment Variables задать `SUPABASE_URL`
   и `SUPABASE_ANON_KEY` нового проекта (они перекрывают значения по умолчанию из `config.ts`), затем Redeploy.
   Локально — то же в `.env`. Значения по умолчанию в `src/lib/supabase/config.ts` указывают на старый проект —
   при переезде обновите и их и закоммитьте.
8. Тест ролей: владелец, администратор, управляющий филиала, покупатель (оформить заказ, увидеть его в админке).

## Сценарий В. Сайт на Vercel потерян / переезд на другой хостинг

1. Vercel → Add New → Project → импорт репозитория `famermishall-byte/beautyai`. Framework Preset: Next.js
   (`vercel.json` уже в репозитории: сборка `next build`, ночной cron `/api/cron/sync-sources`).
2. Environment Variables — из `.env.example` (минимум `SUPABASE_URL`, `SUPABASE_ANON_KEY`; для cron ещё
   `SUPABASE_SERVICE_ROLE_KEY` и `CRON_SECRET`).
3. Новый адрес сайта → обновить `server.url` в `capacitor.config.ts` (мобильная оболочка грузит сайт по этому адресу),
   затем `npm run cap:sync` и пересобрать приложения; в Supabase Auth поправить Site URL/Redirect URLs.

## Мобильные приложения (Android/iOS)

Папки `android/` и `ios/` в git. Оболочка только открывает живой сайт, поэтому правки сайта не требуют пересборки.
Пересобирать нужно при смене иконок/плагинов/адреса сайта:
```bash
npm ci
npm run cap:sync        # копирует конфиг в нативные проекты (создаёт локальные, не хранимые в git файлы)
npm run cap:android     # открыть в Android Studio  (JDK 17+, Android SDK)
npm run cap:ios         # открыть в Xcode (только на Mac)
```
Иконки/сплэш: исходники `assets/`, генерация — `@capacitor/assets`. Ключ подписи Android — см. «Что нужно иметь при себе».

---

## Секреты: как устроено

- В git **нет** ни одного секрета. Проверено сканированием всей истории: `.env` никогда не коммитился.
- В коде лежит только **публичный** `anon`-ключ Supabase (`src/lib/supabase/config.ts`) — он по замыслу открыт,
  безопасность обеспечивает RLS в базе. Это не секрет.
- **Секретные:** `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, пароль БД, `ANTHROPIC_API_KEY` (не используется),
  keystore Android. Хранить — в переменных окружения Vercel и вашем менеджере паролей.
- Если секрет утёк: Supabase → Settings → API → перевыпустить ключ → обновить на Vercel → Redeploy.
- `.env.example` — шаблон без значений, он в git.

## Резервные копии базы (хотя бы раз в неделю и перед крупными изменениями)

Бесплатный Supabase не делает автоматических копий. Варианты:
- **Надёжно:** платный тариф Supabase (Pro) — ежедневные бэкапы и восстановление на точку во времени.
- **Бесплатно, вручную:** нужен PostgreSQL client (`pg_dump`) и строка подключения из Supabase → Connect →
  «Session pooler» (в ней ваш пароль БД; **никогда не коммитьте**).
  ```bash
  mkdir -p backups
  # схема public + пользователи auth
  pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -n public -n auth -F c -f backups/beauty-$(date +%F).dump
  ```
  Папка `backups/` в `.gitignore` (там персональные данные). Храните копию в облаке (Google Drive/OneDrive), не только
  на ноутбуке.
- **Аватарки** (Storage → `avatars`) не входят в дамп — скачать через панель Supabase либо загрузить заново (не критично).

### Восстановление из дампа
```bash
pg_restore --no-owner --clean --if-exists -d "$NEW_SUPABASE_DB_URL" backups/beauty-YYYY-MM-DD.dump
```
Выполнять на **новом пустом проекте** или тестовом — не на живой базе.

## Контрольный список «я защищён»

- [ ] `git status` чистый, `git log origin/main..HEAD` пуст (всё запушено)
- [ ] GitHub: включена двухфакторная защита, сохранены резервные коды
- [ ] Пароль БД Supabase и доступы к Supabase/Vercel записаны в менеджер паролей
- [ ] Свежий дамп базы лежит вне ноутбука (или включён платный тариф с бэкапами)
- [ ] Когда появятся `SUPABASE_SERVICE_ROLE_KEY`/`CRON_SECRET` — значения сохранены в менеджере паролей
- [ ] Когда появится keystore Android — копия вне ноутбука
- [ ] Раз в несколько месяцев: клонировать репозиторий в пустую папку, `npm ci && npm run build` — убедиться, что восстановление работает
