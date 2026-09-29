# Промо-слайды и видео — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** владелец/админ загружает фото и видео-промо в верхний слайдер главной и видео во всплывающий баннер.

**Architecture:** новая таблица `home_slides` + API (публичный и админский) + `HomeSlideManager` во вкладке «Слайдер»;
`HeroSlider` принимает смешанный список слайдов (промо → товары); файлы — в существующем хранилище `banners`
(лимит поднят до 30 МБ, добавлены видео-типы); у баннера — `video_url`. Чистая логика — в `src/lib/home-slides.ts` и
`src/lib/promo-media.ts` с тестами node:test.

**Tech Stack:** Next.js 16 App Router, next-intl (ru+ky), Supabase (RLS, Storage), Tailwind 4, lucide-react, tsx --test.

**Spec:** `docs/superpowers/specs/2026-09-30-promo-media-design.md`

## Global Constraints
- Только owner/admin (`isStoreManager`) пишут слайды и файлы; филиалы и клиенты — только читают.
- Видео: `video/mp4`, `video/webm`, `video/quicktime`, не больше 30 МБ (31457280 байт).
- Фото и обложка — JPEG 960×660 (16:11), как у баннера.
- Каждый новый текст — в `messages/ru.json` И `messages/ky.json`.
- Цвета/радиусы — только токены из `globals.css` / DESIGN.md.
- Миграция на живую базу — только после явного «да» владельца (получено 30.09 на этот дизайн).

## Review Focus
- Видео, которое браузер не может открыть (HEVC на Chrome) — понятная ошибка, а не пустой слайд → тест `checkVideoFile` + ручная проверка ошибки `loadeddata`/`error` в Task 3.
- Слайд «Купить товар», товар удалён или нет в наличии — слайд не показывается → тест `visibleSlides`.
- Слайд «Купить товар» без выбранного товара — сохранение не проходит → тест `validateSlideInput`.
- Видео на невидимом слайде не должно играть и шуметь → ручная проверка в Task 4 (пауза при уходе со слайда).
- Файл > 30 МБ — ошибка до загрузки → тест `checkVideoFile`.

---

### Task 1: База (миграция)

**Files:** Create `supabase/promo_media.sql`

- [ ] Написать SQL:

```sql
-- ПРОМО-СЛАЙДЫ И ВИДЕО (docs/superpowers/specs/2026-09-30-promo-media-design.md). Можно запускать повторно.
update storage.buckets
set file_size_limit = 31457280,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
where id = 'banners';

alter table public.banners add column if not exists video_url text;

create table if not exists public.home_slides (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  image_url text,
  video_url text,
  title text,
  subtitle text,
  action text not null default 'promo' check (action in ('cart','promo')),
  product_id uuid references public.products(id) on delete set null,
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists home_slides_store_id_idx on public.home_slides(store_id);
create index if not exists home_slides_product_id_idx on public.home_slides(product_id);
alter table public.home_slides enable row level security;

drop policy if exists home_slides_select on public.home_slides;
create policy home_slides_select on public.home_slides for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = home_slides.store_id));

drop policy if exists home_slides_write_staff on public.home_slides;
create policy home_slides_write_staff on public.home_slides for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = home_slides.store_id and p.role::text in ('admin','owner')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.store_id = home_slides.store_id and p.role::text in ('admin','owner')));
```

- [ ] Применить через Supabase MCP `apply_migration` (name `promo_media`), проверить `select file_size_limit from storage.buckets where id='banners'` = 31457280, `get_advisors security` — без новых предупреждений по `home_slides`.
- [ ] Commit.

### Task 2: Логика + тесты

**Files:** Create `src/lib/home-slides.ts`, `src/lib/home-slides.test.ts`; Modify `src/types.ts` (тип `HomeSlide`, `Banner.videoUrl`), `package.json` (test script), `src/lib/supabase.ts` (`mapHomeSlide`, `videoUrl` в `mapBanner`).

**Interfaces — Produces:**
```ts
// types.ts
export type HomeSlide = {
  id: string; mediaType: "image" | "video"; imageUrl: string | null; videoUrl: string | null;
  title: string | null; subtitle: string | null; action: "cart" | "promo";
  productId: string | null; priority: number; active: boolean; product: Product | null;
};
// home-slides.ts
export const VIDEO_MAX_BYTES = 31457280;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export function checkVideoFile(f: { type: string; size: number }): "ok" | "type" | "size";
export type SlideInput = { mediaType: string; imageUrl: string | null; videoUrl: string | null; action: string; productId: string | null };
export function validateSlideInput(i: SlideInput): "ok" | "media" | "product" | "action";
export function visibleSlides(slides: HomeSlide[]): HomeSlide[]; // active, cart → product && product.inStock, sort priority
export function moveSlide<T extends { id: string }>(list: T[], index: number, dir: -1 | 1): T[];
```

- [ ] Тесты (`home-slides.test.ts`, node:test + assert/strict):
  - `checkVideoFile({type:"video/mp4",size:1000})` → ok; `size: VIDEO_MAX_BYTES+1` → size; `type:"video/avi"` → type; `size: VIDEO_MAX_BYTES` → ok.
  - `validateSlideInput`: video без videoUrl → media; image без imageUrl → media; cart без productId → product; action "x" → action; promo без товара → ok.
  - `visibleSlides`: отбрасывает active=false, cart с product=null, cart с product.inStock=false; оставляет promo без товара; сортирует по priority.
  - `moveSlide`: вверх с 0 — без изменений; вниз меняет соседей; исходный массив не мутирует.
- [ ] Запустить `npx tsx --test src/lib/home-slides.test.ts` — FAIL (нет модуля).
- [ ] Реализовать `home-slides.ts`; `mapHomeSlide(row, product: Product | null)`; `mapBanner` + `videoUrl: (row.video_url as string|null) ?? null`; `Banner.videoUrl: string | null` (+ поправить `previewBanner` в BannerManager).
- [ ] Добавить файл в `"test"` package.json; `npm test` — всё зелёное; `npx tsc --noEmit`.
- [ ] Commit.

### Task 3: API + загрузка медиа + админка «Слайдер»

**Files:**
- Create `src/app/api/home-slides/route.ts` (GET: активные слайды магазина → товары через `products` + `applyActivePromotion` → `visibleSlides`).
- Create `src/app/api/admin/home-slides/route.ts` (GET все / POST), `src/app/api/admin/home-slides/[id]/route.ts` (PUT/DELETE; PUT принимает частичный `{active}` или `{priority}` либо полную форму). Все — `isStoreManager`, `validateSlideInput` → 400.
- Create `src/lib/promo-media.ts` (браузер): `toCoverJpeg(source: CanvasImageSource, w, h)`, `photoToJpeg(file)`, `videoPoster(file): Promise<Blob>` (video element → `loadeddata` → seek 0.1 → canvas; `error` → reject "unplayable"), `uploadPromoFile(blob, ext, contentType): Promise<string>` (путь `{storeId}/{Date.now()}.{ext}` в `banners`, public URL). `toBannerJpeg` из BannerManager переезжает сюда.
- Create `src/components/admin/MediaPicker.tsx`: переключатель Фото/Видео, загрузка, предпросмотр (`<video controls muted playsInline poster>`), ошибки `type|size|unplayable|upload`, подсказка «Лучше MP4 до 30 МБ». Props: `{ mediaType, imageUrl, videoUrl, onChange({mediaType,imageUrl,videoUrl}) }`.
- Create `src/components/admin/HomeSlideManager.tsx`: список (миниатюра, заголовок, действие, «Скрыт»), ↑↓ (`moveSlide` → PUT priority по индексам), показать/скрыть, изменить, удалить (confirm); форма: MediaPicker, заголовок, подпись, действие (радио «Купить товар» / «Перейти в акции»), ProductPicker при cart.
- Modify `src/app/[locale]/(app)/admin/promo/page.tsx`: вкладка `slides` первой после «Баннеры» (`?tab=slides`).
- Modify `messages/ru.json`, `messages/ky.json`: `adminPromo.tabs.slides`, блок `homeSlides` (все подписи формы/ошибок), `bannerManager.fields.media`.

- [ ] Реализовать, `npx tsc --noEmit`, `npm run lint` по изменённым файлам.
- [ ] Playwright: тестовый админ `claude.test.admin@example.com` → «Слайдер» → создать фото-слайд (promo) и видео-слайд (cart + товар), ↑↓, скрыть; видео > 30 МБ → ошибка; branch_manager получает 403 на `/api/admin/home-slides`.
- [ ] Commit.

### Task 4: Главная — HeroSlider со слайдами и видео

**Files:** Modify `src/components/HeroSlider.tsx`, `src/app/[locale]/(app)/page.tsx`; Create `src/components/HeroVideo.tsx`.

**Interfaces:** `HeroSlider({ promo: HomeSlide[]; products: Product[]; isNew?: boolean })`; `HeroVideo({ src, poster, active, muted, onToggleMute, onEnded })`.

- [ ] `page.tsx`: fetch `/api/home-slides` → `promo`; скелетон пока грузятся оба; слайдер показывается, если `promo.length + slides.length > 0`.
- [ ] `HeroSlider`: единый список `items = [...promo.map(kind:"promo"), ...products.map(kind:"product")]`. Таймер: не листает, пока текущий — видео; `onEnded` → next (если слайдов 1 — `currentTime=0; play()`). Промо-слайд: фото `<img>` или `HeroVideo`; градиент + заголовок/подпись; cart → кнопка «В корзину · цена» (`useCart().addItem(product)`, `e.preventDefault()`, короткое «Добавлено ✓»), тап по слайду → `/product/{id}`; promo → Link `/catalog?promo=1`.
- [ ] `HeroVideo`: `<video muted={muted} playsInline preload="metadata" poster>`; effect: `active ? play().catch(()=>{}) : (pause(), currentTime=0)`; кнопка звука 36px `aria-label`, `stopPropagation`+`preventDefault`.
- [ ] Playwright на мобильной ширине: промо идут первыми, видео играет, звук переключается, после ролика — следующий слайд, «В корзину» кладёт товар; клиент без роли видит слайды.
- [ ] Commit.

### Task 5: Видео в баннере

**Files:** Modify `src/components/BannerManager.tsx` (MediaPicker вместо загрузки фото; `videoUrl` в body и `toggleDisabled`), `src/app/api/admin/banners/route.ts` и `[id]/route.ts` (`video_url: videoUrl || null`), `src/components/BannerInterstitial.tsx` (если `videoUrl` — `<video autoPlay muted loop playsInline poster={imageUrl}>` + кнопка звука; иначе как было).

- [ ] Реализовать, tsc, lint.
- [ ] Playwright: баннер с видео — предпросмотр и показ клиенту; старый баннер с фото не сломан.
- [ ] Commit.

### Task 6: Завершение
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [ ] Удалить тестовые аккаунты/слайды/файлы из Storage.
- [ ] Записать в `PROJECT_CONTEXT.md` и память `project_beautyai.md`; commit. Merge/push — только по «пуш».
