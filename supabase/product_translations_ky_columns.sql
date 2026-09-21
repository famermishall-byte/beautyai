-- Kyrgyz text for products. Run after 00_base_schema.sql (safe to re-run).
-- Additive and nullable: the Russian columns stay the source of truth (personalisation matches on their text);
-- the app shows the *_ky value when the interface is Kyrgyz and falls back to the Russian text when it is empty.
-- Brands, SKUs and official product names are never translated (see docs/TRANSLATION.md).
alter table public.products
  add column if not exists name_ky text,
  add column if not exists description_ky text,
  add column if not exists characteristics_ky text,
  add column if not exists purpose_ky text;
