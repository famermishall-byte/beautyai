# Design

<!-- impeccable:design-schema 1 -->

This file is the single source of truth for how the app looks. Tokens live in
`src/app/globals.css` and are generated from the rules below; components in
`src/components/ui/` implement them. When a screen needs something this file
doesn't describe, add it here (and to the tokens) first, then use it.

## World

Restrained color strategy (Operate mode: task completion outranks
expression) built on the client's existing raspberry-pink brand, executed
with real elevation, a real icon system, and real empty/loading/error
states instead of the flat, list-and-chip look the app had before. Warm
pale-pink surface, white cards, one saturated accent carrying every
primary action and every "you are here" signal (active nav, selected
chip, selected city). Manrope for everything — body, headings, prices, titles — by the client's explicit choice
(2026-09-20). Headings/prices use the `font-display` class, which in this one-family
setup gets weight 700 and slightly tight tracking from a base-layer rule in `globals.css`.

## Brand

- **Name:** "ОПТОВЫЕ ЦЕНЫ 01" (white-label instance; the codebase is BeautyAI).
  Shown in caps with wide tracking in the top header, in `font-display` on
  the sign-in card and the splash. Never abbreviated or restyled.
- **Mark:** the client's real "01" ring logo (`/brand/mark.png`, rendered by
  `BrandMark`), white on the accent. It is not redrawn, recolored or
  replaced; it always sits on an accent tile/rounded square with its own
  radius (`size × 0.28`).
- **Tagline:** "Красота начинается с правильного ухода" (`splash.tagline`).
  It is the only slogan — no new marketing lines are invented.
- **Voice:** Russian (and Kyrgyz) first; addresses the customer as «вы»;
  short, warm and practical — say what happens next ("Откройте WhatsApp и
  нажмите «Отправить»"), not how great the store is. Buttons are verbs
  (Сохранить, Оформить, Обнулить); status copy names the state plainly.
  Admin copy is terse and operational. No exclamation-mark hype, no
  invented testimonials, discounts, cities or branches.
- **Emoji:** never as icons or decoration in UI or status copy. The plain
  "✓" text mark in a few confirmation messages is tolerated as punctuation.

## Theme

Light only. The visible pale-pink background (`--background`) is an
explicit client preference and the whole palette is tuned against it.
`color-scheme: light` keeps native controls light when the OS is dark.
The tokens are layered so a dark theme could be added later by redefining
`:root` values under `[data-theme="dark"]` — not done yet (see Open
questions).

## Tokens

Three layers in `src/app/globals.css`:
1. `:root` — raw values (the only place hex/rgba may appear in the app,
   besides `manifest.ts` / `viewport.themeColor`, which can't read CSS vars);
2. `@theme inline` — semantic colors exposed to Tailwind (`bg-accent`…);
3. `@theme static` — radius / shadow / z-index / type / easing scales that
   Tailwind turns into utilities and also emits as CSS vars.

Components use utilities only — no raw hex, no `rgba()`, no `bg-white`/
`text-white`/`black/…`, no `rounded-[…px]`, no `shadow-[…]`, no `z-[…]`.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `accent` | #c8135f | primary actions, "you are here", links |
| `accent-strong` | #970e49 | hover/pressed, gradient end, text on `accent-soft` |
| `accent-soft` | #f8dbe9 | tinted surfaces, icon chips, idle chips |
| `on-accent` | #ffffff | text/icons on any saturated fill (accent, success, error, WhatsApp, photo scrim) |
| `background` | #fbe3ec | page surface (pink by client choice) |
| `card` | #ffffff | cards, sheets, inputs |
| `foreground` | #241f1d | body text |
| `muted` | #6b5c62 | secondary text (≥ 4.5:1 on card and background) |
| `border` / `border-strong` | foreground 9% / 16% | hairlines / control outlines |
| `state-hover` / `state-pressed` | foreground 5% / 9% | hover and pressed tints on neutral controls |
| `scrim` / `scrim-strong` | foreground 40% / 75% | modal backdrop / text strip over photos |
| `success`, `warning`, `error`, `info` (+ `-soft`) | #17774a, #a84f0e, #c81f3d, #2f5fb3 | status; each color on its own `-soft` surface is ≥ 4.5:1 (4.9 / 4.7 / 4.7 / 5.1) |
| `promo-sale` / `promo-hit` | #f470b4 / #7fcf50 | "-N%" and "ХИТ" photo badges only (see Open questions) |
| `rank-gold/silver/bronze` (+ `-ink`) | see css | top-3 places in «Рейтинг товаров» only |
| `whatsapp` | #25d366 | the WhatsApp hand-off button only (see Open questions) |

Text on `accent-soft` uses `accent-strong` (6.6:1); plain `accent` on
`accent-soft` is 4.4:1 and is for icons only.

Opacity modifiers on tokens (`bg-card/90`, `text-on-accent/85`,
`border-accent/40`) are fine — they stay inside the palette.

### Type

Manrope only. Tailwind's scale plus two additions:

| Role | Class |
| --- | --- |
| Page title (no icon) | `font-display text-3xl` |
| Page title next to an icon chip | `font-display text-2xl` |
| Section heading | `font-display text-xl` (screen sections) / `text-lg` (inside a card) |
| Body | `text-sm` (lists, cards) / `text-base` (inputs, long text) |
| Secondary | `text-xs text-muted` |
| Eyebrow / brand line / badges | `text-2xs` (11px, never body text) or the `eyebrow` utility |
| Product name in cards | `font-display text-md` (15px) |
| Prices | `font-display` + `tabular-nums`, always |

The one exception is the 8px "RUS/KG" micro-badge on the language icon.

### Spacing & layout

Tailwind's 4px scale; the rhythm is:
- page gutter `px-4`; top of an inner page `pt-6`–`pt-8`; bottom `pb-10`
  (customer) or `pb-24` (admin, clears the bottom nav);
- content width: customer screens `max-w-2xl`, admin data screens
  `max-w-4xl` (`AdminPage`), admin menu/forms `max-w-3xl`/`max-w-2xl`,
  header `max-w-5xl`;
- card padding `p-4` (lists) / `p-5` (forms, sections); gaps `gap-3` in
  grids, `gap-4` between cards, `mb-6` after a page header;
- breakpoints: Tailwind defaults (`sm` 640 · `md` 768 · `lg` 1024); the app
  is designed at 375–430px first, grids go 2 → 3 columns at `sm`.

### Radius

`rounded-control` 13px (inputs, notices, thumbnails, small tiles) ·
`rounded-card` 18px (cards, list groups, dialogs) · `rounded-tile` 22px
(catalog/admin-menu tiles, promo banner) · `rounded-sheet` 28px (bottom
sheets, interstitials, sign-in card, big grouped menus) · `rounded-full`
(buttons, chips, badges, avatars, icon buttons).

### Elevation

`shadow-control` (white buttons/knobs over photos) · `shadow-card`
(cards) · `shadow-button` (primary button only) · `shadow-float`
(floating cart button, hover lift on tiles, sign-in card, toast) ·
`shadow-modal` (dialogs, interstitials, drawers) · `shadow-sheet` (bottom
sheets). Every shadow carries an offset and blur, tinted toward the brand —
no flat halos.

### Stacking

`z-raised` 10 (badges/buttons over a photo, dropdowns) · `z-sticky` 30
(top header, sticky action bars) · `z-nav` 40 (bottom nav, floating cart,
toast) · `z-modal` 50 (sheets, drawers, confirm dialogs, splash) ·
`z-overlay` 60 (marketing interstitials) · `z-top` 70 (first-run
permission screen). No other z values.

### Motion

Easing `ease-out-expo` (cubic-bezier(0.16, 1, 0.3, 1)) for everything that
enters. Durations: `--duration-fast` 150ms (press/hover, color),
`--duration-base` 220ms (toggles, small reveals), `--duration-sheet` 320ms
(sheets/drawers), `--duration-enter` 450ms (content entrance). Named
animations: `rise-in` (content entrance, staggered in lists via inline
`animationDelay`, ≤ 8 steps), `sheet-in`, `pop` (favorite heart),
`shimmer`/`.skeleton`, `tile-sheen` (pearly tiles), `intro-*` (splash).
Press feedback is `active:scale-[0.97]` (buttons) / `active:scale-90`
(icon buttons). `prefers-reduced-motion` turns off every animation and
collapses transitions to instant.

### Focus

The `focus-ring` utility (2px background gap + 2px accent ring) on every
custom control, or the equivalent `focus-visible:ring-2 ring-accent`. A
global `:focus-visible` accent outline is the fallback for anything that
has neither. Focus is never removed without a replacement.

## Components

All in `src/components/ui/` unless noted.

- **`Button`** + **`buttonClasses()`** — the one button: variants `primary`
  / `secondary` / `ghost` / `danger` / `success` / `whatsapp`, sizes `sm`
  (36px) / `md` (48px) / `lg` (56px), `loading` (spinner + `aria-busy`),
  `fullWidth`. Links that look like buttons use `buttonClasses()` instead of
  copying classes. States: hover (darker / tint), pressed (scale 0.97),
  focus (ring), disabled (faded, no pointer), loading.
- **`IconButton`** — round icon-only button, 40px (`md`) / 36px (`sm`),
  variants `plain` / `surface` / `soft` / `danger`; `label` is required and
  becomes `aria-label`.
- **`Chip`** — pill toggle (`aria-pressed`), 40px high; idle
  `accent-soft`, active `accent`. For filters, skin type/concerns, any
  multi/single choice from a short list.
- **`Badge`** — small status pill, tones `neutral` / `accent` / `success`
  / `warning` / `error` / `info`, sizes `xs` / `sm`, optional icon. Color is
  always paired with text.
- **`OrderStatusBadge`** — the only way to show an order status, customer
  and admin alike: `sent` accent · `confirmed` warning · `paid`/`shipped`
  success · `completed` neutral · `cancelled` error.
- **`Notice`** — inline message block (form errors, confirmations,
  warnings), tones `success` / `warning` / `error` / `info` / `accent`,
  icon by tone; errors are `role="alert"`, the rest `role="status"`.
- **`PageHeader`** — title block for every inner screen: optional icon
  chip (`accent-soft` circle) + title + muted subtitle + optional trailing
  action. `AdminPage` wraps it for admin sections.
- **`Field`** + the **`field`** / **`field-label`** utilities — form
  controls. `field`: 44px min height, 16px text (no iOS zoom),
  `border-strong` outline, `card` fill; states hover (accent-tinted
  border), focus (accent border + soft accent ring), invalid
  (`aria-invalid="true"` → error border), disabled (background fill, muted
  text). `Field` adds a visible label above and a hint or `role="alert"`
  error below. Compact auth forms keep placeholder-named inputs with an
  accessible name; every other form uses visible labels. Search inputs are
  `field` + a leading icon (`pl-11`).
- **`surface-card`** utility — white card: `card` fill, `border`,
  `rounded-card`, `shadow-card`. Cards that should stay flat until hover
  (`ProductCard`) spell out the classes instead.
- **`EmptyState`** — icon-in-a-tinted-circle + title + optional
  description + optional action, used for every "nothing here" and every
  error, never a bare sentence of gray text.
- **`Skeleton` / `ProductGridSkeleton`** — the loading state for anything
  that fetches or waits for the session, replacing "Загружаем…" text.
- **`BottomSheet`** — the one modal/sheet primitive (drag handle, title,
  close button, Escape to close, scrollable body, optional sticky footer).
  `CartDrawer` is the side-drawer variant of the same visual language.
- **`ProductCard`** (`src/components/ProductCard.tsx`) — 4:5 image (or a
  tinted sparkle-icon placeholder when `imageUrl` is null), brand, name,
  price, stock line, favorite heart (`.animate-pop` on toggle), compact
  round add-to-cart that becomes a checkmark. The card fills its row
  (`h-full`); grids use `auto-rows-fr` and rails use `PRODUCT_RAIL_ITEM`
  (one width, `w-40`), so all cards in a row/rail are the same length. No
  invented discount — the "-N%" badge appears only when the product has a
  real `oldPrice`.

## Icons

`lucide-react` — one stroke-based icon set, one weight discipline
(1.75–2 for static icons, 2.25+ for an active/selected state), sizes
`size-3`/`3.5` (inside badges), `size-4`/`4.5` (in buttons and rows),
`size-5` (header/nav, icon chips), `size-7`/`8` (empty/success states).
Decorative icons next to text are `aria-hidden`. `Sparkle` is the
product-photo placeholder mark; category tiles use `Droplet` / `Palette` /
`Scissors` (`src/lib/categories.ts`).

## Patterns this system commits to

- **Bottom nav:** icon + label, a pill highlight behind the active
  icon, not a color change alone. Fixed height via `--bottom-nav-h`
  (64px) so anything else pinned above it (a PDP's sticky action bar)
  can offset by exactly that plus the safe-area inset without guessing.
- **City / store selection** (`/city`, `/branches`, checkout branch step):
  a real picker — cards with a checkmark and filled accent row for the
  active choice (`role="radio"`), not a native `<select>`.
- **Filters:** a bottom sheet (sort, price, brand — only shown when the
  catalog actually has more than one brand, dynamic in-stock toggle)
  triggered from a badge-counted button next to search.
- **Product detail page:** photo, back/favorite overlaid on the image,
  description / characteristics / "кому подойдёт" from real product
  fields only, related products, sticky add-to-cart bar above the nav.
- **Checkout:** numbered stepper (done steps show a check), one question
  per step, `Button` pair "Назад" (ghost) + primary; the final action is
  the `whatsapp` button; the success screen repeats the WhatsApp action
  with a warning `Notice` that the customer must press «Отправить».
- **Empty/loading/error:** every fetch-driven screen has a skeleton for
  loading and an `EmptyState` / `Notice` for zero-results/error — none
  fall back to a plain sentence.
- **Admin screens:** `AdminPage`/`PageHeader` + white `surface-card`
  sections. Lists of records are cards on mobile; wide data (catalog,
  import preview, sales) uses a plain table inside a card — header row
  `text-left text-muted border-b border-border`, cells `py-2 pr-4`, row
  dividers `border-border`, numbers `tabular-nums`, booleans as a
  `Check` icon or "—". Destructive actions use the `danger` button and a
  confirmation. Branch pickers persist through `beautyai-admin-branch`.

## Accessibility rules

- Text contrast ≥ 4.5:1 (large text ≥ 3:1); meaningful icons and control
  outlines ≥ 3:1. Every semantic color is paired with its `-soft` surface
  at ≥ 4.5:1.
- Tap targets ≥ 44px for primary controls (buttons `md`/`lg`, fields,
  chips 40px + spacing); icon buttons are 36–40px visual with spacing
  around them.
- Visible focus on everything interactive (see Focus); logical tab order;
  dialogs close on Escape.
- Color is never the only signal: statuses carry text, selected states
  carry a check or `aria-pressed`/`aria-checked`.
- Errors are announced (`role="alert"`) and shown next to the field.
- No horizontal page scroll at 375px; rails scroll inside themselves.
- `prefers-reduced-motion` respected everywhere.

## Open questions (waiting for the client/owner)

1. **Promo badges contrast.** White text on `promo-sale` #f470b4 is about
   2.6:1 and on `promo-hit` #7fcf50 about 2:1 (needs 4.5:1). Kept as is
   until the owner decides: darken the fills, or use dark text.
2. **WhatsApp button contrast.** White on #25d366 is about 2:1. Options:
   WhatsApp's darker official green #128c7e (~4.1:1) with white text, or
   keep #25d366 with dark `foreground` text (~8:1). Kept as is until
   decided.
3. **Dark theme.** Currently light-only (see Theme). Confirm this stays,
   or plan a dark palette for the pink brand.

## Known gaps / next pass

- The two pre-existing `react-hooks/exhaustive-deps` lint warnings
  (`admin/staff`, `OrderManager`) are behavioral, not visual — left alone.
- Some large admin managers (`SourceManager`, `OrderManager`,
  `BannerManager`, `PromotionManager`) were brought onto tokens and shared
  buttons/fields/cards mechanically; their layouts were not redesigned.
- Admin screens could not be checked visually by the agent (no admin test
  account is allowed); they were verified by build/typecheck only.
