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
