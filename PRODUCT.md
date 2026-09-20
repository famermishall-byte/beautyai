# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Customers of a cosmetics/perfumery store trading under the brand
"ОПТОВЫЕ ЦЕНЫ 01" (raspberry-pink Instagram-based shop, Bishkek,
Kyrgyzstan). The customer base is **both wholesale resellers and retail
end-customers** — not wholesale-only, per the merchant (confirmed
2026-09-20). They browse the catalog by category or search, save items
to a wishlist ("Моя косметичка"), build an order in a cart, and submit
it — the app itself never takes payment or arranges delivery; the order
is handed off as a pre-filled WhatsApp message to store staff, who
confirm and fulfill it manually.

## Product Purpose

A white-label storefront app the developer (the person directing this
project) builds and intends to sell/license to independent shop owners
like "ОПТОВЫЕ ЦЕНЫ 01" — a mobile-first catalog + WhatsApp-order tool
that lets a small shop offer an app-like shopping experience without
building payment/delivery infrastructure themselves. Success is a
storefront professional enough that a real shop owner would pay to put
their brand on it and hand it to their customers.

## Positioning

Not a general e-commerce cart-and-checkout builder — deliberately
WhatsApp-native order handoff (staff confirm/fulfill manually, no
payment gateway, no delivery logistics inside the app) so it fits how
small local shops in this market actually operate today, while still
looking and feeling like a polished, branded commercial app rather than
a bare admin tool.

## Operating Context

- Runs as a responsive web app (Next.js on Vercel) and is also wrapped
  natively via Capacitor for Android/iOS app-store distribution — the
  wrapper loads the same live site; there is no separate native UI, so
  platform stays `web` for design purposes.
- Every account belongs to one store (multi-tenant by `store_id`); a
  store can have several physical branches, each with its own WhatsApp
  number, address, city, and hours.
- Skin-type/skin-concern profile (optional, self-reported) drives a
  rule-based routine builder and home-screen product recommendations —
  no AI/ML involved.
- Admin/owner accounts manage catalog import, branches, order status,
  and now customer feedback, from the same codebase's `/admin` section
  (kept out of the customer-facing redesign's primary scope unless
  asked).

## Capabilities and Constraints

- Stack: Next.js (App Router) + Supabase (Postgres/RLS/auth) + Tailwind
  v4 tokens in `globals.css`; Capacitor for native app-store wrapping.
- No payment processing, no delivery/logistics tracking, no loyalty
  program inside the app — orders and feedback both resolve through a
  WhatsApp deep link plus a store-side record for admins to review.
- Small live catalogs in practice (tens of products per store today),
  so the UI must read well with few items, not assume dense inventory.
- **Product photography is not yet on hand for the real client.** The
  live catalog is currently seeded with placeholder test data (a
  dessert/cream product set, "Сладкий Дом") standing in for real
  cosmetics — product cards must be designed against real product
  photography as the target case, with a deliberate, polished fallback
  for products that have no photo yet (confirmed this is common for
  small wholesale suppliers).
- Must preserve all existing business logic/routes/data flows — this is
  a visual/UX pass, not a functional rewrite.

## Brand Commitments

- Name in-product: "ОПТОВЫЕ ЦЕНЫ 01" (client-specific white-label
  instance; codebase/repo still called BeautyAI).
- Existing palette (`src/app/globals.css`): accent `#c8135f`
  (raspberry/magenta, sourced from the client's real logo), background
  `#fbe3ec` (deliberately visible pale pink, not white — explicit past
  client preference), card `#ffffff`, muted text `#6b5c62`. Treat as
  incumbent brand color to preserve/refine, not replace outright.
- Real logo mark on file: `design/logo-drafts/0-reference.jpg` (a white
  ring/number-1 mark on the accent color) — small source image, already
  wired into favicons/splash/in-app badge via
  `scripts/build-brand-assets.mjs`.
- Typeface: Manrope everywhere (client's explicit choice, 2026-09-20; supersedes the
  earlier Playfair Display + Inter pairing).

## Evidence on Hand

- Real branch data: two branches, both in Bishkek, with real address/
  phone/WhatsApp/hours (`branches` table).
- No real product photography yet — see Capabilities and Constraints.
  Do not fabricate specific product images; design the empty/fallback
  state as a first-class visual, not an afterthought.
- No testimonials, press, case studies, or usage metrics exist or
  should be implied.

## Product Principles

1. Read as a real commercial product a shop owner would pay to license
   — not a prototype or admin tool — while keeping the WhatsApp-handoff
   model, which is a deliberate fit for this market, not a limitation
   to hide.
2. Serve both a wholesale reseller (bulk-oriented, price-led) and a
   retail end-customer (single-item, browse-led) from the same catalog
   UI without forcing either into the other's mental model.
3. Design for a small, sparse catalog and for products without photos
   yet — density and imagery are the exception to design for gracefully,
   not the assumed default.
4. Preserve every existing business flow and data shape; this is a
   visual/interaction system pass on top of working functionality.

## Accessibility & Inclusion

No standard mandated yet; content and locale are Russian throughout.
Treat comfortable thumb-reach tap targets and legible contrast as
baseline given the whole product is used one-handed on a phone.
