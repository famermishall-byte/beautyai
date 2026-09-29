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
