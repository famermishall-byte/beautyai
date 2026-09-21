# Beauty (бывший BeautyAI)

Каталог и заказы для оптового магазина косметики: витрина, роли (владелец / администратор / управляющий филиала /
покупатель), остатки по филиалам, заказы через WhatsApp. Next.js (App Router) + Supabase + Vercel, мобильная
оболочка на Capacitor.

> ⚠️ Нестандартная версия Next.js (16.x) — перед правкой кода читайте `node_modules/next/dist/docs/` и `AGENTS.md`.

## Быстрый старт
```bash
git clone https://github.com/famermishall-byte/beautyai.git
cd beautyai
npm ci
cp .env.example .env    # вписать SUPABASE_URL и SUPABASE_ANON_KEY (или оставить: есть значения по умолчанию)
npm run dev             # http://localhost:3000
```
Требуется Node.js ≥ 20.9 (разработка велась на Node 24 / npm 11).

## Документы
- **[docs/RECOVERY.md](docs/RECOVERY.md)** — восстановление с нуля на новом компьютере, переезд Supabase/Vercel, секреты, резервные копии.
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — состояние проекта, договорённости, история решений (читать первым).
- [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) — продукт и дизайн.
- `supabase/` — SQL базы данных; порядок запуска — в docs/RECOVERY.md (начинается с `00_base_schema.sql`).
- `.env.example` — список переменных окружения (без значений).

## Команды
`npm run dev` · `npm run build` · `npm run lint` · `npm run cap:sync` · `npm run cap:android` · `npm run cap:ios`
