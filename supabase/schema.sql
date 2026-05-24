-- ====================================================================
-- SahaTakip — Supabase Schema
-- ====================================================================
-- Bu dosyayı Supabase Dashboard > SQL Editor > New query içine yapıştırın
-- ve "Run" butonuna basın. Tüm tablolar, RLS politikaları ve trigger'lar
-- otomatik oluşturulacak.
-- ====================================================================

-- UUID extension
create extension if not exists "uuid-ossp";

-- ========== PROFILES (Auth users'a bağlı ek profil bilgileri) ==========
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null default 'engineer' check (role in ('admin','manager','engineer','field')),
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Yeni kullanıcı için otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== CUSTOMERS ==========
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  short_name text not null,
  title text not null,
  tax_number text,
  tax_office text,
  phone text,
  email text,
  address text,
  city text,
  contact_person text,
  created_at timestamptz default now(),
  created_by uuid references auth.users
);

-- ========== QUOTES ==========
create table if not exists public.quotes (
  id uuid primary key default uuid_generate_v4(),
  number text unique not null,
  customer_id uuid references public.customers,
  customer_name text not null,
  customer_title text,
  title text not null,
  date date not null default current_date,
  valid_until date,
  engineer text,
  status text not null default 'Taslak'
    check (status in ('Taslak','Onay Bekliyor','Müşteriye Gönderildi','Kabul Edildi','Reddedildi','Faturalandırıldı')),
  notes text,
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users
);

create table if not exists public.quote_lines (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references public.quotes on delete cascade,
  line_no int not null,
  poz_id text not null,
  poz_name text not null,
  unit text not null default 'Adet',
  quantity numeric(12,2) not null default 1,
  material_price numeric(12,2) not null default 0,
  install_price numeric(12,2) not null default 0,
  dismantle_price numeric(12,2) not null default 0,
  with_dismantle boolean not null default false,
  overhead_pct numeric(5,2) not null default 10,
  profit_pct numeric(5,2) not null default 15,
  vat_pct numeric(5,2) not null default 20,
  discount_pct numeric(5,2) not null default 0,
  notes text
);

-- ========== WORK ORDERS ==========
create table if not exists public.work_orders (
  id uuid primary key default uuid_generate_v4(),
  number text unique not null,
  customer_id uuid references public.customers,
  customer_name text,
  title text not null,
  description text,
  date date not null default current_date,
  status text not null default 'Servis Açıldı'
    check (status in ('Servis Açıldı','Devam Ediyor','Tamamlandı','Onay Bekliyor','Müşteri Onayı','Faturalandırıldı')),
  engineer text,
  -- GPS / Saha
  start_lat numeric(10,7),
  start_lng numeric(10,7),
  end_lat numeric(10,7),
  end_lng numeric(10,7),
  -- Süreler
  started_at timestamptz,
  finished_at timestamptz,
  -- Onay
  client_signature_url text,
  client_accepted_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users
);

create table if not exists public.work_order_materials (
  id uuid primary key default uuid_generate_v4(),
  work_order_id uuid references public.work_orders on delete cascade,
  name text not null,
  quantity numeric(12,2) not null default 1,
  unit text not null default 'Adet',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (quantity * unit_price) stored
);

create table if not exists public.work_order_photos (
  id uuid primary key default uuid_generate_v4(),
  work_order_id uuid references public.work_orders on delete cascade,
  url text not null,
  caption text,
  taken_at timestamptz default now(),
  uploaded_by uuid references auth.users
);

-- ========== EMPLOYEES & ATTENDANCE ==========
create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  role text,
  daily_wage numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references public.employees on delete cascade,
  date date not null,
  present boolean not null default true,
  notes text,
  unique(employee_id, date)
);

-- ========== EXPENSES ==========
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  category text not null,
  description text,
  amount numeric(12,2) not null,
  receipt_url text,
  work_order_id uuid references public.work_orders,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- ========== STORAGE BUCKETS ==========
-- Manuel oluşturma: Dashboard > Storage > New Bucket
-- 1) "photos"     (public read)
-- 2) "documents"  (private)
-- 3) "signatures" (private)

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles            enable row level security;
alter table public.customers           enable row level security;
alter table public.quotes              enable row level security;
alter table public.quote_lines         enable row level security;
alter table public.work_orders         enable row level security;
alter table public.work_order_materials enable row level security;
alter table public.work_order_photos   enable row level security;
alter table public.employees           enable row level security;
alter table public.attendance          enable row level security;
alter table public.expenses            enable row level security;

-- Yardımcı: kullanıcı rolünü al
-- SECURITY DEFINER + search_path: RLS'i bypass eder → profiles politikası ile sonsuz döngüyü önler
create or replace function public.user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
revoke all on function public.user_role() from public;
grant execute on function public.user_role() to anon, authenticated;

-- Profil: kendi profilini görür ve günceller; admin/manager hepsini görür
drop policy if exists "profiles_select_own_or_manager" on public.profiles;
create policy "profiles_select_own_or_manager" on public.profiles
  for select using (id = auth.uid() or public.user_role() in ('admin','manager'));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Müşteriler: tüm kimliği doğrulanmış kullanıcılar okuyabilir; manager/admin yazar
drop policy if exists "customers_all_read" on public.customers;
create policy "customers_all_read" on public.customers
  for select using (auth.uid() is not null);
drop policy if exists "customers_manager_write" on public.customers;
create policy "customers_manager_write" on public.customers
  for all using (public.user_role() in ('admin','manager'));

-- Teklifler / İş Emirleri: tüm kimliği doğrulanmış okur; sahibi veya manager/admin yazar
drop policy if exists "quotes_all_read" on public.quotes;
create policy "quotes_all_read" on public.quotes
  for select using (auth.uid() is not null);
drop policy if exists "quotes_owner_write" on public.quotes;
create policy "quotes_owner_write" on public.quotes
  for all using (created_by = auth.uid() or public.user_role() in ('admin','manager'));

drop policy if exists "quote_lines_all_read" on public.quote_lines;
create policy "quote_lines_all_read" on public.quote_lines
  for select using (auth.uid() is not null);
drop policy if exists "quote_lines_owner_write" on public.quote_lines;
create policy "quote_lines_owner_write" on public.quote_lines
  for all using (
    exists (select 1 from public.quotes q where q.id = quote_id and (q.created_by = auth.uid() or public.user_role() in ('admin','manager')))
  );

drop policy if exists "wo_all_read" on public.work_orders;
create policy "wo_all_read" on public.work_orders
  for select using (auth.uid() is not null);
drop policy if exists "wo_owner_write" on public.work_orders;
create policy "wo_owner_write" on public.work_orders
  for all using (created_by = auth.uid() or public.user_role() in ('admin','manager'));

drop policy if exists "wo_mat_all_read" on public.work_order_materials;
create policy "wo_mat_all_read" on public.work_order_materials
  for select using (auth.uid() is not null);
drop policy if exists "wo_mat_owner_write" on public.work_order_materials;
create policy "wo_mat_owner_write" on public.work_order_materials
  for all using (
    exists (select 1 from public.work_orders w where w.id = work_order_id and (w.created_by = auth.uid() or public.user_role() in ('admin','manager')))
  );

drop policy if exists "wo_photos_all_read" on public.work_order_photos;
create policy "wo_photos_all_read" on public.work_order_photos
  for select using (auth.uid() is not null);
drop policy if exists "wo_photos_uploader_write" on public.work_order_photos;
create policy "wo_photos_uploader_write" on public.work_order_photos
  for all using (uploaded_by = auth.uid() or public.user_role() in ('admin','manager'));

-- Personel & Puantaj: sadece manager/admin
drop policy if exists "employees_manager" on public.employees;
create policy "employees_manager" on public.employees
  for all using (public.user_role() in ('admin','manager'));
drop policy if exists "attendance_manager" on public.attendance;
create policy "attendance_manager" on public.attendance
  for all using (public.user_role() in ('admin','manager'));

-- Masraf: kullanıcı kendi masrafını ekler, manager hepsini görür
drop policy if exists "expenses_owner_or_manager_read" on public.expenses;
create policy "expenses_owner_or_manager_read" on public.expenses
  for select using (created_by = auth.uid() or public.user_role() in ('admin','manager'));
drop policy if exists "expenses_owner_write" on public.expenses;
create policy "expenses_owner_write" on public.expenses
  for all using (created_by = auth.uid() or public.user_role() in ('admin','manager'));

-- ========== INDEXLER ==========
create index if not exists idx_quotes_customer on public.quotes(customer_id);
create index if not exists idx_quotes_status   on public.quotes(status);
create index if not exists idx_qlines_quote    on public.quote_lines(quote_id);
create index if not exists idx_wo_customer     on public.work_orders(customer_id);
create index if not exists idx_wo_status       on public.work_orders(status);
create index if not exists idx_attendance_date on public.attendance(date);

-- ====================================================================
-- FAZ 2 — KONUM & PERSONEL (POZ-DEV-014, 017, 019, 020)
-- ====================================================================

-- ========== LOCATIONS (canlı + geçmiş GPS) ==========
create table if not exists public.locations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  employee_id uuid references public.employees,
  lat numeric(10,7) not null,
  lng numeric(10,7) not null,
  accuracy numeric(8,2),
  speed numeric(8,2),
  heading numeric(6,2),
  is_mock boolean not null default false,
  battery numeric(5,2),
  recorded_at timestamptz not null default now()
);
create index if not exists idx_locations_user_time on public.locations(user_id, recorded_at desc);
create index if not exists idx_locations_recorded on public.locations(recorded_at desc);

-- En son konum view'i (haritada hızlı çekim)
create or replace view public.latest_locations as
select distinct on (user_id) *
from public.locations
order by user_id, recorded_at desc;

-- ========== SHIFTS (Mesai başlat/bitir + mola) ==========
create table if not exists public.shifts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  employee_id uuid references public.employees,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  start_lat numeric(10,7),
  start_lng numeric(10,7),
  end_lat numeric(10,7),
  end_lng numeric(10,7),
  break_minutes int not null default 0,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_shifts_user on public.shifts(user_id, start_at desc);

-- ========== GEOFENCES (Coğrafi çit) ==========
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

-- ========== QR/NFC LOCATION CHECK-IN ==========
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

-- ========== FAZ 2 — RLS ==========
alter table public.locations         enable row level security;
alter table public.shifts            enable row level security;
alter table public.geofences         enable row level security;
alter table public.geofence_events   enable row level security;
alter table public.location_checkins enable row level security;

-- Kendi konumunu yazar; manager/admin herkesinkini okur
drop policy if exists "locations_self_write" on public.locations;
create policy "locations_self_write" on public.locations
  for insert with check (user_id = auth.uid());
drop policy if exists "locations_self_or_manager_read" on public.locations;
create policy "locations_self_or_manager_read" on public.locations
  for select using (user_id = auth.uid() or public.user_role() in ('admin','manager'));

drop policy if exists "shifts_self_write" on public.shifts;
create policy "shifts_self_write" on public.shifts
  for all using (user_id = auth.uid() or public.user_role() in ('admin','manager'));

-- Tüm kimliği doğrulanmış kullanıcılar mesai listesini okuyabilir.
-- Admin/manager canlı paneli için kritik (user_role() null dönerse bile çalışır).
-- Uygulama tarafında AdminShiftDashboardScreen RoleGuard ile korunur.
drop policy if exists "shifts_all_read" on public.shifts;
create policy "shifts_all_read" on public.shifts
  for select using (auth.uid() is not null);

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

drop policy if exists "checkins_self_write" on public.location_checkins;
create policy "checkins_self_write" on public.location_checkins
  for all using (user_id = auth.uid() or public.user_role() in ('admin','manager'));

-- ====================================================================
-- BİTTİ. Storage bucket'larını ve ilk admin kullanıcısını oluşturmayı unutmayın.
-- ====================================================================


-- ============================================================
-- POZ-DEV-008 & 010 � Faz 1 sonu ek migrasyonlar
-- ============================================================
-- work_orders status enum geni�let (app 'Teklif G�nderildi' kullan�yor)
alter table public.work_orders drop constraint if exists work_orders_status_check;
alter table public.work_orders add constraint work_orders_status_check
  check (status in ('Servis A��ld�','Devam Ediyor','Tamamland�','Onay Bekliyor','Teklif G�nderildi','M��teri Onay�','Faturaland�r�ld�'));

-- work_orders ek alanlar (mobil app �emas�)
alter table public.work_orders add column if not exists service_name text;
alter table public.work_orders add column if not exists materials_json jsonb default '[]'::jsonb;
alter table public.work_orders add column if not exists other_cost numeric(12,2) default 0;
alter table public.work_orders add column if not exists labor_cost numeric(12,2) default 0;
alter table public.work_orders add column if not exists material_cost numeric(12,2) default 0;
alter table public.work_orders add column if not exists quote_amount numeric(12,2) default 0;
alter table public.work_orders add column if not exists profit numeric(12,2) default 0;
alter table public.work_orders add column if not exists before_photo text;
alter table public.work_orders add column if not exists after_photo text;
alter table public.work_orders add column if not exists engineer text;
alter table public.work_orders add column if not exists date date;
alter table public.work_orders add column if not exists notes text;

-- employees ek alanlar
alter table public.employees add column if not exists monthly_wage numeric(12,2) default 0;
alter table public.employees add column if not exists attendance_json jsonb default '{}'::jsonb;

-- ============================================================
-- AUDIT LOG (POZ-DEV-010)
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete set null,
  action text not null,
  table_name text,
  ref_id text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_user on public.audit_log(user_id, created_at desc);
create index if not exists idx_audit_action on public.audit_log(action);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_insert_self on public.audit_log;
create policy audit_log_insert_self on public.audit_log
  for insert with check (auth.uid() = user_id);

drop policy if exists audit_log_manager_read on public.audit_log;
create policy audit_log_manager_read on public.audit_log
  for select using (
    exists(select 1 from public.profiles p
           where p.id = auth.uid() and p.role in ('admin','manager'))
  );

-- ============================================================
-- RLS SMOKE TEST (manuel � Supabase SQL Editor'da �al��t�r�n)
-- ============================================================
-- 1. Demo bir auth.user olu�turun ve profiles sat�r� ekleyin (role='field').
-- 2. Bu user ile ba�ka birinin work_orders kayd�n� UPDATE etmeyi deneyin.
--    -> 0 row returned (RLS engelledi) beklenir.
-- 3. SAME user ile audit_log sat�r�na ba�ka user_id ile INSERT denenirse
--    -> 'new row violates row-level security' hatas� beklenir.
-- 4. Manager rol�ndeki user ile audit_log SELECT yap�n -> t�m kay�tlar gelir.


-- =====================================================
-- FAZ 3 — İş Emri Akışı (POZ-DEV-024..035) Eklenen alanlar
-- =====================================================
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS planned_start timestamptz,
  ADD COLUMN IF NOT EXISTS planned_end timestamptz,
  ADD COLUMN IF NOT EXISTS sla_hours int,
  ADD COLUMN IF NOT EXISTS assigned_to_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_to_name text,
  ADD COLUMN IF NOT EXISTS assignment_status text,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS time_logs_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS actual_labor_minutes int,
  ADD COLUMN IF NOT EXISTS video_uri text,
  ADD COLUMN IF NOT EXISTS audio_uri text,
  ADD COLUMN IF NOT EXISTS signature_uri text,
  ADD COLUMN IF NOT EXISTS template_id text;

ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;
ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (
  status IN (
    'Onay Bekliyor','Teklif Gönderildi','Faturalandırıldı',
    'Bekliyor','Atandı','Yolda','Başladı','Tamamlandı','İptal'
  )
);

CREATE TABLE IF NOT EXISTS recurring_templates (
  id text PRIMARY KEY,
  title text NOT NULL,
  service_name text NOT NULL,
  client text NOT NULL,
  priority text DEFAULT 'Normal',
  interval_days int NOT NULL DEFAULT 30,
  next_run_date date NOT NULL,
  default_engineer text,
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rt_select ON recurring_templates;
DROP POLICY IF EXISTS rt_write ON recurring_templates;
DROP POLICY IF EXISTS rt_select ON recurring_templates;
CREATE POLICY rt_select ON recurring_templates FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS rt_write ON recurring_templates;
CREATE POLICY rt_write ON recurring_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager'))
);

-- ============================================================
-- FAZ 4 � Teklif Geli�mi� (POZ-DEV-036..043)
-- ============================================================

create table if not exists quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  revision int not null,
  snapshot jsonb not null,
  reason text,
  created_at timestamptz default now()
);
create index if not exists idx_qrev_qid on quote_revisions(quote_id);

alter table quotes add column if not exists revision int default 0;
alter table quotes add column if not exists accepted_at timestamptz;
alter table quotes add column if not exists accepted_by text;
alter table quotes add column if not exists accept_signature text;
alter table quotes add column if not exists generated_work_order_id text;
alter table quotes add column if not exists template_id text;
alter table quotes add column if not exists share_token text;


-- ============================================================
-- FAZ 5 — Müşteri & Lokasyon (POZ-DEV-044..048)
-- ============================================================
create table if not exists customer_sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  name text not null,
  address text, city text, lat double precision, lng double precision,
  contact_person text, contact_phone text, notes text,
  created_at timestamptz default now()
);
create index if not exists idx_sites_cust on customer_sites(customer_id);

create table if not exists customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  name text not null, category text,
  uri text not null, storage_path text,
  size_bytes int, mime_type text,
  uploaded_at timestamptz default now(),
  uploaded_by text, notes text
);
create index if not exists idx_docs_cust on customer_documents(customer_id);

create table if not exists customer_ratings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  work_order_id text,
  score int not null check (score between 1 and 5),
  comment text, rated_by text,
  created_at timestamptz default now()
);
create index if not exists idx_ratings_cust on customer_ratings(customer_id);

-- Supabase Storage: 'customer-docs' bucket'ı manuel oluşturulmalı (private).


-- ============================================================
-- FAZ 6 — Form & Kontrol Listeleri (POZ-DEV-049..053)
-- ============================================================
create table if not exists form_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  fields jsonb not null default '[]'::jsonb,
  is_seed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists form_responses (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references form_templates(id) on delete set null,
  template_name text not null,
  work_order_id text,
  customer_id uuid references customers(id) on delete set null,
  filled_by text,
  values jsonb not null default '{}'::jsonb,
  revision int not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_form_responses_wo on form_responses(work_order_id);
create index if not exists idx_form_responses_cust on form_responses(customer_id);

create table if not exists form_response_revisions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references form_responses(id) on delete cascade,
  revision int not null,
  edited_at timestamptz default now(),
  edited_by text,
  reason text,
  values jsonb not null default '{}'::jsonb
);
create index if not exists idx_form_revs_resp on form_response_revisions(response_id);

-- =============================================================
-- FAZ 7 — Stok, Malzeme & Zimmet (POZ-DEV-054..059)
-- =============================================================

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('depo','arac','personel')),
  responsible_id uuid,
  responsible_name text,
  code text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null default 'adet',
  price numeric,
  min_stock numeric,
  category text,
  barcode text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists materials_barcode_idx on public.materials(barcode);

create table if not exists public.stock_balances (
  material_id uuid not null references public.materials(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  qty numeric not null default 0,
  primary key (material_id, warehouse_id)
);
create index if not exists stock_balances_warehouse_idx on public.stock_balances(warehouse_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('giris','cikis','transfer','is-emri','sayim')),
  material_id uuid not null references public.materials(id) on delete cascade,
  material_name text not null,
  material_unit text not null,
  from_warehouse_id uuid references public.warehouses(id) on delete set null,
  to_warehouse_id uuid references public.warehouses(id) on delete set null,
  qty numeric not null,
  unit_price numeric,
  work_order_id uuid,
  user_id uuid,
  user_name text,
  note text,
  created_at timestamptz default now()
);
create index if not exists stock_movements_material_idx on public.stock_movements(material_id);
create index if not exists stock_movements_workorder_idx on public.stock_movements(work_order_id);
create index if not exists stock_movements_created_idx on public.stock_movements(created_at desc);

-- ============================================================
-- FAZ 8 — Araç Takibi (POZ-DEV-060..063)
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL UNIQUE,
  brand text,
  model text,
  year int,
  color text,
  driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  driver_name text,
  km_total numeric DEFAULT 0,
  fuel_type text CHECK (fuel_type IN ('benzin','dizel','lpg','elektrik','hibrit')),
  inspection_due_at date,
  insurance_due_at date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('km','fuel','maintenance','inspection','insurance')),
  km numeric,
  liters numeric,
  unit_price numeric,
  total_cost numeric,
  service_type text,
  due_at date,
  note text,
  performed_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_vehicle ON vehicle_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_kind ON vehicle_logs(kind);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_created ON vehicle_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high')),
  status text NOT NULL CHECK (status IN ('open','in-progress','repaired')) DEFAULT 'open',
  photos jsonb DEFAULT '[]'::jsonb,
  km_at numeric,
  reported_by text,
  reported_at timestamptz DEFAULT now(),
  repaired_at timestamptz,
  repair_cost numeric,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_vehicle_damages_vehicle ON vehicle_damages(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damages_status ON vehicle_damages(status);

CREATE TABLE IF NOT EXISTS vehicle_route_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  speed numeric,
  recorded_at timestamptz DEFAULT now(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_name text
);

CREATE INDEX IF NOT EXISTS idx_vehicle_route_points_vehicle ON vehicle_route_points(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_route_points_recorded ON vehicle_route_points(recorded_at DESC);

-- ============================================================
-- FAZ 9 — Raporlama & Dashboard (POZ-DEV-064..071)
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  generated_at timestamptz DEFAULT now(),
  kpi jsonb NOT NULL,
  by_status jsonb DEFAULT '[]'::jsonb,
  by_engineer jsonb DEFAULT '[]'::jsonb,
  by_customer jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period);
CREATE INDEX IF NOT EXISTS idx_reports_start ON reports(start_date DESC);

CREATE TABLE IF NOT EXISTS report_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  daily_reminder_hour int DEFAULT 18,
  daily_reminder_minute int DEFAULT 0,
  daily_reminder_enabled boolean DEFAULT false,
  weekly_email text,
  updated_at timestamptz DEFAULT now()
);

-- POZ-DEV-071 Edge Function placeholder:
-- supabase functions deploy weekly-report-email
-- Body: { email, reportId } → Resend / SMTP üzerinden gönderim.

-- ============================================================
-- FAZ 10 — Bildirim & İletişim (POZ-DEV-072..077)
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  channels text[] DEFAULT ARRAY[]::text[],
  related_id text,
  recipient text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = false;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  channel_enabled jsonb DEFAULT '{"push":true,"email":false,"sms":false,"whatsapp":false}'::jsonb,
  event_channels jsonb DEFAULT '{}'::jsonb,
  push_token text,
  email text,
  phone text,
  whatsapp text,
  quiet_hours_start text,
  quiet_hours_end text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

-- Edge Function uçları (POZ-DEV-074, 075, 076):
--   supabase functions deploy notify-email      (Resend / SMTP)
--   supabase functions deploy notify-sms        (Netgsm / İletimerkezi)
--   supabase functions deploy notify-whatsapp   (Meta WhatsApp Business)
-- Body imzaları:
--   notify-email     -> { to, subject, html }
--   notify-sms       -> { to, message }
--   notify-whatsapp  -> { to, message }

-- ============================================================
-- FAZ 11 — Finans & Tahsilat (POZ-DEV-078..082)
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'TRY',
  method text NOT NULL CHECK (method IN ('cash','card','transfer','check','other')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','pending','cancelled','refunded')),
  received_at timestamptz DEFAULT now(),
  received_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  received_by_name text,
  receipt_no text UNIQUE,
  vat_rate numeric(5,2),
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_workorder ON payments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('opening','collection','expense','deposit','adjustment')),
  amount numeric(14,2) NOT NULL,
  date timestamptz DEFAULT now(),
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_employee ON cash_entries(employee_id, date DESC);

CREATE TABLE IF NOT EXISTS einvoice_config (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('logo','mikro','nesbilgi','foriba','manual','other')),
  enabled boolean DEFAULT false,
  test_mode boolean DEFAULT true,
  api_url text,
  username text,
  vkn_tckn text,
  company_title text,
  prefix text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS einvoice_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_vkn text,
  total numeric(14,2) NOT NULL,
  vat numeric(14,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('draft','queued','sent','accepted','rejected','error')),
  external_id text,
  error_message text,
  pdf_uri text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_einvoice_status ON einvoice_records(status);
CREATE INDEX IF NOT EXISTS idx_einvoice_payment ON einvoice_records(payment_id);

-- Edge Function ucu (POZ-DEV-082):
--   supabase functions deploy einvoice-submit
--   body: { provider, config, invoice }

-- ============================================================
-- FAZ 12 — Sektörel Modüller (POZ-DEV-083..089)
-- ============================================================

-- Cihazlar / ekipman
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  type text not null check (type in ('meter','panel','transformer','ges_inverter','ges_panel','compensation','machine','other')),
  customer_id uuid references public.customers(id) on delete set null,
  site_id uuid references public.customer_sites(id) on delete set null,
  serial_no text,
  manufacturer text,
  model text,
  power text,
  install_date date,
  warranty_end date,
  location text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_assets_customer on public.assets(customer_id);
create index if not exists idx_assets_code on public.assets(code);

-- Enerji ölçüm kayıtları (sayaç/pano/trafo/GES)
create table if not exists public.energy_readings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('meter','panel','transformer','ges')),
  asset_id uuid references public.assets(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  date timestamptz not null default now(),
  inspector_id uuid references public.profiles(id) on delete set null,
  meter_active_kwh numeric(14,3),
  meter_reactive_kvarh numeric(14,3),
  meter_demand_kw numeric(10,3),
  panel_voltage_l1 numeric(8,2),
  panel_voltage_l2 numeric(8,2),
  panel_voltage_l3 numeric(8,2),
  panel_current_l1 numeric(8,2),
  panel_current_l2 numeric(8,2),
  panel_current_l3 numeric(8,2),
  panel_power_factor numeric(4,3),
  panel_temp_c numeric(6,2),
  trafo_oil_temp_c numeric(6,2),
  trafo_winding_temp_c numeric(6,2),
  trafo_oil_level text,
  trafo_silica_gel text,
  trafo_buchholz_ok boolean,
  trafo_grounding_ok boolean,
  ges_dc_voltage numeric(8,2),
  ges_ac_voltage numeric(8,2),
  ges_power_kw numeric(10,3),
  ges_energy_total_kwh numeric(14,3),
  ges_irradiance numeric(8,2),
  ges_panel_temp_c numeric(6,2),
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_energy_readings_asset on public.energy_readings(asset_id, date desc);

-- Bakım planları
create table if not exists public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('preventive','corrective')),
  asset_id uuid references public.assets(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  frequency_days int not null,
  last_done_at timestamptz,
  next_due_at timestamptz not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_maint_next_due on public.maintenance_plans(next_due_at);
create index if not exists idx_maint_asset on public.maintenance_plans(asset_id);

-- Denetim formları
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('audit','safety','quality','commissioning','periodic')),
  title text not null,
  asset_id uuid references public.assets(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  inspector_id uuid references public.profiles(id) on delete set null,
  date timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb,
  score int not null default 0,
  status text not null default 'draft' check (status in ('draft','completed')),
  notes text,
  created_at timestamptz default now()
);

-- Uygunsuzluklar
create table if not exists public.nonconformities (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references public.inspections(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  description text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','in_progress','closed','cancelled')),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  corrective_action text,
  root_cause text,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_nc_status on public.nonconformities(status);
create index if not exists idx_nc_asset on public.nonconformities(asset_id);

-- Satış ziyaretleri
create table if not exists public.sales_visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  visit_date timestamptz not null default now(),
  salesperson_id uuid references public.profiles(id) on delete set null,
  purpose text,
  summary text,
  next_step text,
  next_step_date date,
  outcome text not null check (outcome in ('opportunity','won','lost','follow_up','no_interest')),
  estimated_amount numeric(14,2),
  competitor jsonb,
  photos text[],
  created_at timestamptz default now()
);
create index if not exists idx_sales_visits_customer on public.sales_visits(customer_id, visit_date desc);

-- =============================================================
-- FAZ 13 — Yapay Zeka (POZ-DEV-090..094)
-- =============================================================

CREATE TABLE IF NOT EXISTS voice_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript text NOT NULL,
  summary text,
  action_items jsonb DEFAULT '[]'::jsonb,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS damage_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text,
  severity text CHECK (severity IN ('low','medium','high','critical')),
  findings jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  estimated_cost numeric(14,2),
  confidence int,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  analyzed_at timestamptz DEFAULT now(),
  analyzed_by uuid REFERENCES profiles(id)
);

-- ai_settings: yerel cihazda AsyncStorage'da saklanır, DB tablosu yok.

-- =============================================================
-- FAZ 14 — Web Admin Paneli (POZ-DEV-095..100)
-- =============================================================

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','manager','engineer','technician','sales','viewer')),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(active);

-- =============================================================
-- FAZ 15 — Entegrasyon & Güvenlik (POZ-DEV-101..108)
-- =============================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  key TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_delivery_at TIMESTAMPTZ,
  last_status TEXT CHECK (last_status IN ('success','failed','pending')),
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS import_history (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('customers','poz','employees')),
  rows_total INT NOT NULL,
  rows_imported INT NOT NULL,
  rows_skipped INT NOT NULL,
  errors JSONB NOT NULL DEFAULT '[]'::JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_adapters (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('logo','netsis','mikro','custom')),
  label TEXT NOT NULL,
  base_url TEXT,
  api_key TEXT,
  username TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sync_customers BOOLEAN NOT NULL DEFAULT TRUE,
  sync_invoices BOOLEAN NOT NULL DEFAULT TRUE,
  sync_products BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success','failed','pending'))
);

CREATE TABLE IF NOT EXISTS kvkk_settings (
  id INT PRIMARY KEY DEFAULT 1,
  current_version TEXT NOT NULL,
  text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS kvkk_consents (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  size_bytes BIGINT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failed','pending','restored')),
  restored_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS two_factor (
  user_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  secret TEXT,
  backup_codes TEXT[] NOT NULL DEFAULT '{}',
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS access_rules (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('ip','device')),
  value TEXT NOT NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_import_history_at ON import_history(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_active ON erp_adapters(active);
CREATE INDEX IF NOT EXISTS idx_kvkk_user ON kvkk_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_at ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_rules_kind ON access_rules(kind, active);

-- =============================================================
-- USER APPROVAL FLOW (yeni kayıtlar için admin onayı zorunlu)
-- =============================================================

-- 1) profiles tablosuna onay alanları
alter table public.profiles
  add column if not exists approval_status text
    not null default 'pending'
    check (approval_status in ('pending','approved','rejected'));

alter table public.profiles
  add column if not exists approved_at      timestamptz;
alter table public.profiles
  add column if not exists approved_by      uuid references public.profiles(id) on delete set null;
alter table public.profiles
  add column if not exists rejection_reason text;

-- Mevcut kullanıcıları geriye dönük olarak onaylı say (ilk göç için)
update public.profiles
   set approval_status = 'approved',
       approved_at     = coalesce(approved_at, now())
 where approval_status = 'pending'
   and created_at < now() - interval '1 minute';

-- 2) handle_new_user trigger'ı güncelle:
--    İlk kullanıcı (profiles boşsa) admin + approved olarak başlar (bootstrap).
--    Sonraki kullanıcılar 'pending' başlar ve admin onayı bekler.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select not exists(select 1 from public.profiles) into is_first;

  insert into public.profiles (id, full_name, role, approval_status, approved_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when is_first then 'admin' else 'engineer' end,
    case when is_first then 'approved' else 'pending' end,
    case when is_first then now() else null end
  );
  return new;
end;
$$;

-- 3) Bekleyen kullanıcıları çekmek için SECURITY DEFINER fonksiyon
--    (view auth.users'a erişemediği için fonksiyon kullanıyoruz; admin/manager kontrolü içeride)
create or replace function public.list_pending_user_approvals()
returns table (
  id uuid,
  full_name text,
  role text,
  approval_status text,
  rejection_reason text,
  created_at timestamptz,
  email text
) language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role not in ('admin','manager') then
    raise exception 'Bu işlem için admin/manager yetkisi gerekli.';
  end if;

  return query
    select p.id,
           p.full_name,
           p.role,
           p.approval_status,
           p.rejection_reason,
           p.created_at,
           u.email::text
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.approval_status = 'pending'
     order by p.created_at desc;
end;
$$;

grant execute on function public.list_pending_user_approvals() to authenticated;

-- Geriye uyum için view'i de tutuyoruz (auth.users join'ı kaldırarak)
drop view if exists public.pending_user_approvals;
create view public.pending_user_approvals as
  select p.id,
         p.full_name,
         p.role,
         p.approval_status,
         p.rejection_reason,
         p.created_at
    from public.profiles p
   where p.approval_status = 'pending'
   order by p.created_at desc;

-- 4) Onay/red işlemi için RPC (admin/manager check'i fonksiyon içinde)
create or replace function public.set_user_approval(
  target_id uuid,
  new_status text,
  reason text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
begin
  if new_status not in ('approved','rejected','pending') then
    raise exception 'Geçersiz onay durumu: %', new_status;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('admin','manager') then
    raise exception 'Bu işlem için admin/manager yetkisi gerekli.';
  end if;

  update public.profiles
     set approval_status   = new_status,
         approved_at       = case when new_status = 'approved' then now() else approved_at end,
         approved_by       = case when new_status = 'approved' then auth.uid() else approved_by end,
         rejection_reason  = case when new_status = 'rejected' then reason else null end,
         updated_at        = now()
   where id = target_id;
end;
$$;

grant execute on function public.set_user_approval(uuid, text, text) to authenticated;
grant select on public.pending_user_approvals to authenticated;

-- 5) Tüm kullanıcıları listele (admin only) — auth.users join'ı için SECURITY DEFINER
create or replace function public.list_all_users()
returns table (
  id uuid,
  full_name text,
  role text,
  approval_status text,
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz,
  email text,
  last_sign_in_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Bu işlem için admin yetkisi gerekli.';
  end if;

  return query
    select p.id,
           p.full_name,
           p.role,
           p.approval_status,
           p.rejection_reason,
           p.approved_at,
           p.created_at,
           u.email::text,
           u.last_sign_in_at
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.created_at desc;
end;
$$;

grant execute on function public.list_all_users() to authenticated;

-- 6) Rol değiştir (admin only)
create or replace function public.set_user_role(
  target_id uuid,
  new_role text
) returns void language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
  admin_count int;
begin
  if new_role not in ('admin','manager','engineer','field') then
    raise exception 'Geçersiz rol: %', new_role;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Bu işlem için admin yetkisi gerekli.';
  end if;

  -- Son admini düşürmeyi engelle
  if new_role <> 'admin' then
    select count(*) into admin_count
      from public.profiles
     where role = 'admin' and approval_status = 'approved' and id <> target_id;
    if admin_count = 0 and (select role from public.profiles where id = target_id) = 'admin' then
      raise exception 'Sistemde başka admin kalmadığı için bu kullanıcının rolü değiştirilemez.';
    end if;
  end if;

  update public.profiles
     set role = new_role,
         updated_at = now()
   where id = target_id;
end;
$$;

grant execute on function public.set_user_role(uuid, text) to authenticated;

-- =============================================================
-- SCHEDULED EMAIL REPORTS (günlük/haftalık/aylık/yıllık rapor maili)
-- =============================================================

create table if not exists public.email_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('daily','weekly','monthly','yearly')),
  report_type text not null default 'summary'
    check (report_type in ('summary','kpi','workorders','collections','custom')),
  recipients text[] not null default '{}'::text[],
  role_filter text[],                                       -- bu roldeki kullanıcılara gönder (admin/manager/...)
  subject_template text,
  body_template text,                                       -- markdown veya HTML; placeholder'lar destekler
  hour_utc int not null default 6 check (hour_utc between 0 and 23),
  day_of_week int check (day_of_week between 0 and 6),     -- weekly (0=Pazar)
  day_of_month int check (day_of_month between 1 and 31),  -- monthly/yearly
  month_of_year int check (month_of_year between 1 and 12),-- yearly
  active boolean not null default true,
  last_run_at timestamptz,
  last_status text check (last_status in ('success','failed','partial')),
  last_error text,
  next_run_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_email_sched_next on public.email_schedules(active, next_run_at);

create table if not exists public.email_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.email_schedules(id) on delete cascade,
  recipients text[] not null,
  subject text,
  status text not null check (status in ('success','failed','partial')),
  error text,
  sent_at timestamptz default now()
);
create index if not exists idx_email_log_sched on public.email_dispatch_log(schedule_id, sent_at desc);

-- next_run_at hesaplayıcı (UTC)
create or replace function public.compute_next_run(
  p_kind text,
  p_hour_utc int,
  p_day_of_week int,
  p_day_of_month int,
  p_month_of_year int,
  p_from timestamptz default now()
) returns timestamptz language plpgsql stable as $$
declare
  base timestamptz;
  candidate timestamptz;
begin
  base := date_trunc('hour', p_from) + make_interval(hours => 0);

  if p_kind = 'daily' then
    candidate := date_trunc('day', p_from) + make_interval(hours => p_hour_utc);
    if candidate <= p_from then
      candidate := candidate + interval '1 day';
    end if;
    return candidate;

  elsif p_kind = 'weekly' then
    -- 0=Pazar..6=Cumartesi (Postgres dow ile uyumlu)
    candidate := date_trunc('day', p_from)
                 + make_interval(hours => p_hour_utc)
                 + ((p_day_of_week - extract(dow from p_from)::int + 7) % 7) * interval '1 day';
    if candidate <= p_from then
      candidate := candidate + interval '7 days';
    end if;
    return candidate;

  elsif p_kind = 'monthly' then
    candidate := date_trunc('month', p_from)
                 + make_interval(days => coalesce(p_day_of_month,1) - 1, hours => p_hour_utc);
    if candidate <= p_from then
      candidate := candidate + interval '1 month';
    end if;
    return candidate;

  elsif p_kind = 'yearly' then
    candidate := make_timestamptz(
      extract(year from p_from)::int,
      coalesce(p_month_of_year, 1),
      coalesce(p_day_of_month, 1),
      p_hour_utc, 0, 0, 'UTC'
    );
    if candidate <= p_from then
      candidate := candidate + interval '1 year';
    end if;
    return candidate;
  end if;

  return null;
end;
$$;

-- Trigger: schedule eklenirken/değiştirilirken next_run_at'i otomatik doldur
create or replace function public.set_schedule_next_run()
returns trigger language plpgsql as $$
begin
  if new.next_run_at is null or
     new.kind is distinct from old.kind or
     new.hour_utc is distinct from old.hour_utc or
     new.day_of_week is distinct from old.day_of_week or
     new.day_of_month is distinct from old.day_of_month or
     new.month_of_year is distinct from old.month_of_year then
    new.next_run_at := public.compute_next_run(
      new.kind, new.hour_utc, new.day_of_week, new.day_of_month, new.month_of_year, now()
    );
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_email_schedule_next on public.email_schedules;
create trigger trg_email_schedule_next
  before insert or update on public.email_schedules
  for each row execute function public.set_schedule_next_run();

-- RLS
alter table public.email_schedules enable row level security;
alter table public.email_dispatch_log enable row level security;

drop policy if exists "sched_admin_all" on public.email_schedules;
create policy "sched_admin_all" on public.email_schedules
  for all using (public.user_role() in ('admin','manager'))
  with check (public.user_role() in ('admin','manager'));

drop policy if exists "sched_log_admin_read" on public.email_dispatch_log;
create policy "sched_log_admin_read" on public.email_dispatch_log
  for select using (public.user_role() in ('admin','manager'));

-- Vadesi gelen tüm scheduleları döndürür (Edge Function için)
create or replace function public.due_email_schedules()
returns setof public.email_schedules language sql security definer set search_path = public as $$
  select * from public.email_schedules
   where active = true and next_run_at <= now();
$$;
grant execute on function public.due_email_schedules() to service_role;

-- Schedule bitişinde Edge Function'ın çağıracağı RPC: state günceller + log basar
create or replace function public.complete_email_dispatch(
  p_schedule_id uuid,
  p_recipients text[],
  p_subject text,
  p_status text,
  p_error text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_dispatch_log(schedule_id, recipients, subject, status, error)
  values (p_schedule_id, p_recipients, p_subject, p_status, p_error);

  update public.email_schedules
     set last_run_at = now(),
         last_status = p_status,
         last_error  = p_error,
         next_run_at = public.compute_next_run(kind, hour_utc, day_of_week, day_of_month, month_of_year, now())
   where id = p_schedule_id;
end;
$$;
grant execute on function public.complete_email_dispatch(uuid, text[], text, text, text) to service_role;


-- =============================================================
-- app_settings � Payla��ml� uygulama ayarlar� (�rn. AI API anahtarlar�)
-- T�m authenticated kullan�c�lar OKUYAB�L�R; yaln�zca admin YAZAB�L�R.
-- Bu sayede admin bir kere anahtarlar� girer, herkes uygulamadan kullan�r.
-- =============================================================
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_all_auth" on public.app_settings;
create policy "app_settings_read_all_auth" on public.app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write" on public.app_settings
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
-- =============================================================
-- inbox_messages — Gmail / WhatsApp / diğer kanallardan gelen mesajlar
-- Edge Functions webhook'ları buraya yazar.
-- Saha Copilot bu tabloyu okur, "atladığım var mı?" taraması yapar.
-- =============================================================
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('gmail','whatsapp','sms','telegram','other')),
  external_id text,                     -- Gmail messageId / WA wamid (idempotency)
  sender text,                          -- "Ahmet Yılmaz <ahmet@x.com>" veya "+9053..."
  subject text,
  body text,
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  processed_at timestamptz,
  user_id uuid references public.profiles(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists idx_inbox_messages_received on public.inbox_messages (received_at desc);
create index if not exists idx_inbox_messages_unprocessed on public.inbox_messages (processed) where processed = false;

alter table public.inbox_messages enable row level security;

drop policy if exists "inbox_read_auth" on public.inbox_messages;
create policy "inbox_read_auth" on public.inbox_messages
  for select using (auth.role() = 'authenticated');

drop policy if exists "inbox_update_auth" on public.inbox_messages;
create policy "inbox_update_auth" on public.inbox_messages
  for update using (auth.role() = 'authenticated');

-- INSERT: yalnızca service_role (edge function) — RLS gereği policy yok.
-- Edge functions service_role anahtarı ile yazar.


-- ====================================================================
-- STORAGE RLS (POZ-FIX 2026-05-24) � photos / signatures / documents / customer-docs
-- ====================================================================
-- Supabase Dashboard > Storage > "photos" bucket'� (Public read) olu�turmu� olman gerek.
-- Bu policy'ler authenticated user'lar�n bucket'a y�kleyebilmesini sa�lar.
-- Aksi halde supabase.storage.from('photos').upload(...) "new row violates RLS" ile reddedilir.

-- photos: yetkili kullan�c� yazabilir, herkes okuyabilir (bucket zaten public)
drop policy if exists "photos_authenticated_insert" on storage.objects;
create policy "photos_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos');

drop policy if exists "photos_authenticated_update" on storage.objects;
create policy "photos_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos');

drop policy if exists "photos_owner_delete" on storage.objects;
create policy "photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (owner = auth.uid() or public.user_role() in ('admin','manager')));

drop policy if exists "photos_public_read" on storage.objects;
create policy "photos_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'photos');

-- signatures / documents / customer-docs: sadece authenticated yazabilir & okuyabilir
drop policy if exists "private_buckets_auth_all" on storage.objects;
create policy "private_buckets_auth_all" on storage.objects
  for all to authenticated
  using (bucket_id in ('signatures','documents','customer-docs'))
  with check (bucket_id in ('signatures','documents','customer-docs'));

-- ====================================================================
-- WORK ORDERS DELETE (POZ-FIX 2026-05-24) � saha kullan�c�s� atand��� i�i silebilsin
-- ====================================================================
-- Eski wo_owner_write created_by + admin/manager'a izin veriyordu.
-- Yeni: assigned_to_id (atanan saha kullan�c�s�) da silebilsin.
drop policy if exists "wo_owner_write" on public.work_orders;
create policy "wo_owner_write" on public.work_orders
  for all using (
    created_by = auth.uid()
    or assigned_to_id = auth.uid()
    or public.user_role() in ('admin','manager')
  );
