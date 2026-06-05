-- ====================================================================
-- Katalog: isim override + kullanıcı tarafından eklenen yeni ürünler.
-- ====================================================================

-- 1) İsim değişikliği için override'a name kolonu (null = isim değişmedi)
alter table public.catalog_overrides add column if not exists name text;

-- 2) Kullanıcının elle eklediği ürünler (MATERIAL_CATALOG'da olmayanlar)
create table if not exists public.catalog_custom_products (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  category text,
  brand text,
  code text,
  unit text,
  deleted boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.catalog_custom_products enable row level security;

drop policy if exists "custom_prod_read" on public.catalog_custom_products;
create policy "custom_prod_read" on public.catalog_custom_products
  for select using (auth.uid() is not null);
drop policy if exists "custom_prod_write" on public.catalog_custom_products;
create policy "custom_prod_write" on public.catalog_custom_products
  for all using (public.user_role() in ('admin','manager','engineer'))
  with check (public.user_role() in ('admin','manager','engineer'));
