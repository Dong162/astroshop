-- Create order table for Astro checkout
create table if not exists public.astro_orders (
  id bigint generated always as identity primary key,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  shipping_address text not null,
  note text not null default '',
  payment_method text not null check (payment_method in ('cod', 'bank')),
  status text not null default 'pending',
  item_count integer not null check (item_count >= 1),
  subtotal bigint not null check (subtotal >= 0),
  shipping_fee bigint not null check (shipping_fee >= 0),
  total bigint not null check (total >= 0),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.astro_orders enable row level security;

-- Needed for browser insert with anon key
drop policy if exists "astro_orders_insert_policy" on public.astro_orders;
create policy "astro_orders_insert_policy"
  on public.astro_orders
  for insert
  to anon, authenticated
  with check (true);

-- Needed for browser read on admin page (anon key)
drop policy if exists "astro_orders_select_policy" on public.astro_orders;
create policy "astro_orders_select_policy"
  on public.astro_orders
  for select
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant insert, select on table public.astro_orders to anon, authenticated;
