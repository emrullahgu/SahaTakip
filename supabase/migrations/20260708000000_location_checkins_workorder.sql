-- ====================================================================
-- location_checkins / geofences şema-drift kapatma + iş emri bağı
-- Bu tablolar YALNIZ schema.sql'de tanımlıydı; migration ile kurulan üretim
-- ortamlarında YOKtu (deploy boşluğu — checkinsRepo 'relation does not exist'
-- ile sessizce başarısız oluyordu). Idempotent kurar ve location_checkins'e
-- work_order_id ekler (FIELD işinde 'Başladı' için check-in zorunluluğu).
-- NOT: work_order_id TEXT — client work order id'si DB'de uuid değil app
-- 'number' değeridir; uuid FK id-uzayı uyumsuzluğu yaratırdı.
-- ====================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.geofences (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  customer_id uuid references public.customers,
  center_lat numeric(10,7) not null,
  center_lng numeric(10,7) not null,
  radius_m int not null default 100,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.geofence_events (
  id uuid primary key default uuid_generate_v4(),
  geofence_id uuid references public.geofences on delete cascade,
  user_id uuid references auth.users on delete cascade,
  event text not null check (event in ('enter','exit')),
  recorded_at timestamptz not null default now()
);

create table if not exists public.location_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  customer_id uuid references public.customers,
  site_code text not null,
  method text not null check (method in ('qr','nfc','manual')),
  lat numeric(10,7),
  lng numeric(10,7),
  recorded_at timestamptz not null default now()
);

alter table public.location_checkins
  add column if not exists work_order_id text;
create index if not exists idx_checkins_work_order on public.location_checkins(work_order_id);
create index if not exists idx_checkins_user on public.location_checkins(user_id);

alter table public.geofences         enable row level security;
alter table public.geofence_events   enable row level security;
alter table public.location_checkins enable row level security;

drop policy if exists "geofences_manager_write" on public.geofences;
create policy "geofences_manager_write" on public.geofences
  for all using (public.user_role() in ('admin','manager'));
drop policy if exists "geofences_all_read" on public.geofences;
create policy "geofences_all_read" on public.geofences
  for select using (auth.uid() is not null);

drop policy if exists "geofence_events_read" on public.geofence_events;
create policy "geofence_events_read" on public.geofence_events
  for select using (user_id = auth.uid() or public.user_role() in ('admin','manager'));
drop policy if exists "geofence_events_write" on public.geofence_events;
create policy "geofence_events_write" on public.geofence_events
  for insert with check (user_id = auth.uid());

-- Kendi check-in'ini yazar; yönetici/admin herkesinkini okur.
drop policy if exists "checkins_self_write" on public.location_checkins;
create policy "checkins_self_write" on public.location_checkins
  for all using (user_id = auth.uid() or public.user_role() in ('admin','manager'));
