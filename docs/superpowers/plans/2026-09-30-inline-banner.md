# Встроенный баннер на главной — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** один встроенный (не всплывающий) баннер фото/видео между «Специально для тебя» и «Популярные товары», управляемый из админки.

**Architecture:** расширяем `home_slides` полем `placement` (hero | inline), `link_category` и новыми действиями; тот же
API и `HomeSlideManager` с пропом `placement`; новый компонент `InlineBanner` на главной, видео — через `HeroVideo`.

**Tech Stack:** Next.js 16 App Router, next-intl (ru+ky), Supabase, Tailwind 4, lucide-react, tsx --test.

**Spec:** `docs/superpowers/specs/2026-09-30-inline-banner-design.md`

## Global Constraints
- Всплывающие баннеры (`banners`, `BannerManager`, `BannerInterstitial`, `BannerGate`, `MarketingGate`), акции, каталог,
  товары, остатки — НЕ менять.
- Верхний слайдер (hero) ведёт себя как раньше: только `placement = 'hero'`, действия только `cart | promo`.
- Inline-действия: `product | category | promo | new | catalog`. Ссылки: product → `/product/{id}`, category →
  `/catalog?group={encodeURIComponent(name)}`, promo → `/catalog?promo=1`, new → `/catalog?new=1`, catalog → `/catalog`.
- На главной показывается максимум один inline-баннер (первый активный).
- Только owner/admin (`isStoreManager`) пишут; клиенты читают.
- Каждый новый текст — в `messages/ru.json` И `messages/ky.json`. Цвета/радиусы — токены DESIGN.md / globals.css.

## Review Focus
- Inline-баннер не должен попасть в верхний слайдер (GET без `placement` = hero) → тест `visibleSlides`/роут-фильтр.
- Включение второго inline выключает первый, без ошибки уникального индекса → порядок запросов в PUT/POST.
- Категория, которой больше нет в `CATEGORY_GROUPS`, или удалённый товар — баннер не показывается → тест `visibleSlides`.
- Существующий hero-слайд с `action = 'cart'` редактируется и сохраняется как раньше → тест `slideRowFromBody` для hero.
- Видео inline-баннера не играет, когда баннер вне экрана → ручная проверка.

---

### Task 1: База + логика + API

**Files:** Create `supabase/inline_banner.sql`; Modify `src/types.ts`, `src/lib/supabase.ts` (`mapHomeSlide`),
`src/lib/home-slides.ts`, `src/lib/home-slides.test.ts`, `src/app/api/home-slides/route.ts`,
`src/app/api/admin/home-slides/route.ts`, `src/app/api/admin/home-slides/[id]/route.ts`.

SQL:
```sql
-- ВСТРОЕННЫЙ БАННЕР НА ГЛАВНОЙ (docs/superpowers/specs/2026-09-30-inline-banner-design.md). Можно запускать повторно.
alter table public.home_slides add column if not exists placement text not null default 'hero';
alter table public.home_slides add column if not exists link_category text;
alter table public.home_slides drop constraint if exists home_slides_placement_check;
alter table public.home_slides add constraint home_slides_placement_check check (placement in ('hero','inline'));
alter table public.home_slides drop constraint if exists home_slides_action_check;
alter table public.home_slides add constraint home_slides_action_check
  check (action in ('cart','promo','product','category','new','catalog'));
create unique index if not exists home_slides_one_inline_active on public.home_slides(store_id)
  where placement = 'inline' and active;
```

Interfaces — Produces:
```ts
// types.ts
export type SlidePlacement = "hero" | "inline";
export type SlideAction = "cart" | "promo" | "product" | "category" | "new" | "catalog";
// HomeSlide: action: SlideAction; + placement: SlidePlacement; + category: string | null;
// home-slides.ts
export const HERO_ACTIONS: SlideAction[] = ["cart", "promo"];
export const INLINE_ACTIONS: SlideAction[] = ["product", "category", "promo", "new", "catalog"];
export type SlideInput = { placement: string; mediaType: string; imageUrl: string | null; videoUrl: string | null; action: string; productId: string | null; category: string | null };
export function validateSlideInput(i: SlideInput): "ok" | "media" | "product" | "action" | "category";
//   action не из списка своего placement → "action"; cart|product без productId → "product"; category без category → "category"
export function slideRowFromBody(body: unknown): { ok: true; row: SlideRow } | { ok: false; error: … };
//   SlideRow + placement, link_category (только для category); product_id только для cart|product; placement по умолчанию "hero"
export function visibleSlides(slides: HomeSlide[], groupNames?: string[]): HomeSlide[];
//   cart — товар в наличии; product — товар есть; category — category есть и (если groupNames передан) входит в него
export function slideHref(s: Pick<HomeSlide, "action" | "productId" | "category">): string;
```
- `SLIDE_INPUT_ERRORS.category = "Выберите категорию."`
- Public GET: `?placement=inline` → inline, иначе hero (`.eq("placement", …)`); передаёт `CATEGORY_GROUPS.map(g => g.name)` в `visibleSlides`.
- Admin GET: фильтр по `?placement` (по умолчанию hero). POST: если inline и active — сначала `update active=false where store_id and placement='inline' and active`, потом insert. Priority — max в своём placement + 1.
- PUT `{active:true}` для inline — то же выключение остальных перед обновлением; полная форма PUT не меняет placement.

- [ ] Тесты: hero `cart` без товара → product; hero `category` → action; inline `cart` → action; inline `category` без category → category; inline `promo` → ok; `slideRowFromBody` без placement → hero; inline category пишет link_category и product_id null; `visibleSlides` отбрасывает category вне groupNames и product без товара; `slideHref` для всех 6 действий (cart → /product/{id}).
- [ ] RED → реализация → GREEN; `npm test`, `npx tsc --noEmit`, eslint. Commit (SQL не применять — применяет контроллер).

### Task 2: Админка — вкладка «Баннер на главной»

**Files:** Modify `src/components/admin/HomeSlideManager.tsx` (проп `placement: SlidePlacement`), `src/app/[locale]/(app)/admin/promo/page.tsx` (вкладка `inline` после «Слайдер»), `messages/ru.json`, `messages/ky.json`.
- [ ] `placement` уходит в GET `?placement=` и в POST body. Для inline: радио действий из `INLINE_ACTIONS` (подписи «Открыть товар», «Открыть категорию», «Акции», «Новинки», «Каталог»), ProductPicker для product, `<select>` групп `CATEGORY_GROUPS` (подпись — как в каталоге, `useCatalogLabels` если есть) для category; нет стрелок ↑↓; статус «Показывается» / «Выключен»; интро «На главной показывается один баннер — включённый. Он стоит между «Специально для тебя» и «Популярными товарами».»; кнопка «Добавить баннер». Hero-режим — без изменений поведения.
- [ ] tsc, eslint, npm test. Commit.

### Task 3: Главная — InlineBanner

**Files:** Create `src/components/InlineBanner.tsx`; Modify `src/components/HeroVideo.tsx` (опц. `loop?: boolean`, `onEnded?` необязателен), `src/app/[locale]/(app)/page.tsx` (вставка после Section «Специально для тебя»).
- [ ] `InlineBanner`: fetch `/api/home-slides?placement=inline`, берёт `slides[0]`; нет — `null`. Link `slideHref(slide)`; `aspect-[16/9] rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)] bg-accent-soft`; фото `<img object-cover>`; видео — `HeroVideo` с `loop`, `active = inView` (IntersectionObserver threshold 0.5), mute state локально (по умолчанию выключен звук), `onFailed` — ничего (остаётся обложка). Текст при наличии: градиент `from-black/60` снизу, заголовок `font-display text-lg`, подпись `text-sm`.
- [ ] tsc, eslint, npm test, `npm run build`. Commit.

### Task 4: Проверка (контроллер)
- [ ] Применить SQL; advisors. Playwright 390×844 на тестовом админе: popup-баннер как раньше; слайдер как раньше; inline-баннер на месте; действия product/category/promo/new/catalog; вкл/выкл; видео и звук. Удалить тестовые данные и файлы. PROJECT_CONTEXT.md + память.
