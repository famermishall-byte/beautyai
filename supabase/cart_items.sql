-- Корзина за аккаунтом (см. docs/superpowers/specs/2026-09-29-persistent-cart-design.md).
-- Живёт, пока клиент сам не удалит товар или не закажет его; каскадно удаляется вместе с аккаунтом
-- и вместе с товаром, удалённым из каталога.
create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Каскад при удалении товара ищет строки по product_id.
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);

alter table public.cart_items enable row level security;

create policy cart_items_select_own on public.cart_items
  for select using (user_id = auth.uid());
create policy cart_items_insert_own on public.cart_items
  for insert with check (user_id = auth.uid());
create policy cart_items_update_own on public.cart_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_delete_own on public.cart_items
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.cart_items to authenticated;
