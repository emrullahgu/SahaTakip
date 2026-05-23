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
create or replace function public.user_role()
returns text language sql stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profil: kendi profilini görür ve günceller; admin/manager hepsini görür
create policy "profiles_select_own_or_manager" on public.profiles
  for select using (id = auth.uid() or public.user_role() in ('admin','manager'));
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Müşteriler: tüm kimliği doğrulanmış kullanıcılar okuyabilir; manager/admin yazar
create policy "customers_all_read" on public.customers
  for select using (auth.uid() is not null);
create policy "customers_manager_write" on public.customers
  for all using (public.user_role() in ('admin','manager'));

-- Teklifler / İş Emirleri: tüm kimliği doğrulanmış okur; sahibi veya manager/admin yazar
create policy "quotes_all_read" on public.quotes
  for select using (auth.uid() is not null);
create policy "quotes_owner_write" on public.quotes
  for all using (created_by = auth.uid() or public.user_role() in ('admin','manager'));

create policy "quote_lines_all_read" on public.quote_lines
  for select using (auth.uid() is not null);
create policy "quote_lines_owner_write" on public.quote_lines
  for all using (
    exists (select 1 from public.quotes q where q.id = quote_id and (q.created_by = auth.uid() or public.user_role() in ('admin','manager')))
  );

create policy "wo_all_read" on public.work_orders
  for select using (auth.uid() is not null);
create policy "wo_owner_write" on public.work_orders
  for all using (created_by = auth.uid() or public.user_role() in ('admin','manager'));

create policy "wo_mat_all_read" on public.work_order_materials
  for select using (auth.uid() is not null);
create policy "wo_mat_owner_write" on public.work_order_materials
  for all using (
    exists (select 1 from public.work_orders w where w.id = work_order_id and (w.created_by = auth.uid() or public.user_role() in ('admin','manager')))
  );

create policy "wo_photos_all_read" on public.work_order_photos
  for select using (auth.uid() is not null);
create policy "wo_photos_uploader_write" on public.work_order_photos
  for all using (uploaded_by = auth.uid() or public.user_role() in ('admin','manager'));

-- Personel & Puantaj: sadece manager/admin
create policy "employees_manager" on public.employees
  for all using (public.user_role() in ('admin','manager'));
create policy "attendance_manager" on public.attendance
  for all using (public.user_role() in ('admin','manager'));

-- Masraf: kullanıcı kendi masrafını ekler, manager hepsini görür
create policy "expenses_owner_or_manager_read" on public.expenses
  for select using (created_by = auth.uid() or public.user_role() in ('admin','manager'));
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
-- BİTTİ. Storage bucket'larını ve ilk admin kullanıcısını oluşturmayı unutmayın.
-- ====================================================================
