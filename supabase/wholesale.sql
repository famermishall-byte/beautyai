-- Оптовые цены (docs/superpowers/specs/2026-09-29-wholesale-pricing-design.md). Выключено по умолчанию.
alter table public.stores add column if not exists wholesale_mode text not null default 'off';
alter table public.stores add column if not exists wholesale_percent numeric;
alter table public.stores add column if not exists wholesale_threshold_usd numeric not null default 1000;
alter table public.stores add column if not exists usd_rate numeric;
alter table public.stores drop constraint if exists stores_wholesale_mode_check;
alter table public.stores add constraint stores_wholesale_mode_check check (wholesale_mode in ('off', 'percent', 'per_product'));
alter table public.stores drop constraint if exists stores_wholesale_percent_check;
alter table public.stores add constraint stores_wholesale_percent_check check (wholesale_percent is null or (wholesale_percent > 0 and wholesale_percent < 100));
alter table public.stores drop constraint if exists stores_wholesale_threshold_check;
alter table public.stores add constraint stores_wholesale_threshold_check check (wholesale_threshold_usd > 0);
alter table public.stores drop constraint if exists stores_usd_rate_check;
alter table public.stores add constraint stores_usd_rate_check check (usd_rate is null or usd_rate > 0);

alter table public.products add column if not exists wholesale_price numeric;
alter table public.products drop constraint if exists products_wholesale_price_check;
alter table public.products add constraint products_wholesale_price_check check (wholesale_price is null or wholesale_price > 0);

alter table public.orders add column if not exists is_wholesale boolean not null default false;
