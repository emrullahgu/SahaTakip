-- ====================================================================
-- Ürün kataloğu override katmanı: hardcoded MATERIAL_CATALOG üzerine
-- yöneticinin fiyat değişikliği + ürün silme (soft) bilgisini paylaşımlı tutar.
-- product_id = MATERIAL_CATALOG item id (text). price null ise fiyat değişmedi.
-- ====================================================================
create table if not exists public.catalog_overrides (
  product_id text primary key,
  price numeric,                       -- yeni birim fiyat (null = değişmedi)
  deleted boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);
alter table public.catalog_overrides enable row level security;

-- Herkes okur (teklif/picker'da uygulanır); admin/manager/engineer yazar.
drop policy if exists "catalog_ovr_read" on public.catalog_overrides;
create policy "catalog_ovr_read" on public.catalog_overrides
  for select using (auth.uid() is not null);
drop policy if exists "catalog_ovr_write" on public.catalog_overrides;
create policy "catalog_ovr_write" on public.catalog_overrides
  for all using (public.user_role() in ('admin','manager','engineer'))
  with check (public.user_role() in ('admin','manager','engineer'));
