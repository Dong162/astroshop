-- Run this on existing projects to allow admin page to read orders
alter table public.astro_orders enable row level security;

drop policy if exists "astro_orders_select_policy" on public.astro_orders;
create policy "astro_orders_select_policy"
  on public.astro_orders
  for select
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select on table public.astro_orders to anon, authenticated;
