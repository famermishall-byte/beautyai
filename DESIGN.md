# Design

<!-- impeccable:design-schema 1 -->

## World

Restrained color strategy (Operate mode: task completion outranks
expression) built on the client's existing raspberry-pink brand, executed
with real elevation, a real icon system, and real empty/loading/error
states instead of the flat, list-and-chip look the app had before. Warm
pale-pink surface, white cards, one saturated accent carrying every
primary action and every "you are here" signal (active nav, selected
chip, selected city). Playfair Display for all headings/prices (the
brand's existing editorial display face), Inter for body/UI text.

## Tokens

Defined in `src/app/globals.css` under `:root` and exposed to Tailwind
via `@theme inline`.

- **Color:** `--accent` #c8135f / `--accent-strong` #970e49 (pressed,
  gradient-end, dark text-on-tint) / `--accent-soft` #f8dbe9 (tinted
  surfaces, icon chips) / `--background` #fbe3ec / `--card` #ffffff /
  `--foreground` #241f1d / `--muted` #6b5c62 / `--border` /
  `--border-strong`. Semantic: `--success` / `--success-soft`,
  `--warning` / `--warning-soft`, `--error` / `--error-soft` — each a
  color plus its own tinted surface, no gray standing in for status.
- **Radius:** `--radius-card` 18px (cards, sheets, tiles) /
  `--radius-control` 13px (inputs, chips' corner family — chips
  themselves stay pill/`rounded-full`).
- **Elevation:** `--shadow-card` (tight contact shadow + soft
  accent-tinted ambient glow), `--shadow-float` (floating buttons, the
  city picker's selected row), `--shadow-sheet` (bottom sheets/drawers).
  Every shadow carries an offset and blur — no flat halos.
- **Motion:** `rise-in` (content entrance, staggered in grids via inline
  `animationDelay`), `sheet-in` (bottom sheets/drawers), `pop`
  (favorite-heart toggle — exponential ease-out, not spring/bounce),
  `shimmer`/`.skeleton` (loading placeholders). All respect
  `prefers-reduced-motion`.
- **Type scale:** display sizes are set ad hoc per context with Tailwind
  utilities (`text-2xl`…`text-[28px]`) rather than a named scale — every
  heading and price uses `font-display`; body/labels use the default
  sans. Prices always carry `tabular-nums`.

## Components

- **`Button`** (`src/components/ui/Button.tsx`) — the one button
  primitive for the app: variants `primary` / `secondary` / `ghost` /
  `danger`, sizes `sm` / `md` / `lg`, a `loading` prop (spinner replaces
  nothing else in the label), disabled state baked in. Every button in
  the redesigned surfaces goes through this component instead of a
  hand-rolled `<button className="...">`.
- **`EmptyState`** — icon-in-a-tinted-circle + title + optional
  description + optional action, used for every "nothing here" and
  every error, never a bare sentence of gray text.
- **`Skeleton` / `ProductCardSkeleton` / `ProductGridSkeleton`** — the
  loading state for anything that fetches, replacing "Загружаем…" text.
- **`BottomSheet`** — the one modal/sheet primitive (drag handle, title,
  close button, scrollable body, optional sticky footer). Used by the
  catalog's filter sheet; `CartDrawer` still hand-rolls its own
  side-drawer variant of the same visual language (same backdrop,
  radius, shadow, `sheet-in` motion) since it slides from the side, not
  the bottom.
- **`ProductCard`** — the product card system: 4:5 image (or a tinted
  sparkle-icon placeholder when `imageUrl` is null — no stock photography
  exists for the real client yet, see PRODUCT.md), brand, name, price,
  stock badge, favorite heart (top-right, `.animate-pop` on toggle), and
  a compact round add-to-cart button that becomes a checkmark on success.
  The whole card is a `<Link>` to `/product/[id]`. No discount/old-price
  UI exists — the data model has no such field, and none is invented.

## Icons

`lucide-react` — one stroke-based icon set, one weight discipline
(1.75–2 for static icons, 2.25+ for an active/selected state), no emoji
standing in for an icon anywhere in the redesigned surfaces (nav,
buttons, cards, headers, empty states, menu rows). `Sparkle` is the
product-photo placeholder mark; category tiles use `Droplet` /
`Palette` / `Scissors` (`src/lib/categories.ts`).

## Patterns this system commits to

- **Bottom nav:** icon + label, a pill highlight behind the active
  icon, not a color change alone. Fixed height via `--bottom-nav-h`
  (64px) so anything else pinned above it (a PDP's sticky action bar)
  can offset by exactly that plus the safe-area inset without guessing.
- **City / store selection** (`/city`, `/branches`): a real picker
  screen — search, a "your city" section when one is set, a checkmark
  and filled accent row for the active choice, not a native `<select>`.
- **Filters:** a bottom sheet (sort, price, brand — only shown when the
  catalog actually has more than one brand, dynamic in-stock toggle)
  triggered from a badge-counted button next to search, not inline
  chips fighting the category row for space.
- **Product detail page** (`/product/[id]`, new — did not exist before
  this pass): photo, back/favorite overlaid on the image, description /
  characteristics / "кому подойдёт" from real product fields only,
  related products from the same category, sticky add-to-cart bar
  stacked above the bottom nav.
- **Empty/loading/error:** every fetch-driven screen in this pass
  (`catalog`, `mybag`, `city`, `branches`, `product/[id]`) has a real
  skeleton for loading and a real `EmptyState` for zero-results/error —
  none fall back to a plain sentence.

## Known gaps / next pass

Scope for this pass was the primary shopping path (home, catalog,
product card, product detail, city, branches, feedback, profile, cart,
nav) per explicit user direction. **Not yet carried into this system:**
`routine`, `skin-profile`, `checkout`, `orders`, `login`, and the entire
`/admin` section still use the pre-redesign look (plain chips/buttons,
no icon system). They still work — nothing there was broken — they just
haven't been visually migrated yet.
