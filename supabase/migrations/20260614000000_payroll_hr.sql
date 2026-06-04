-- ====================================================================
-- Bölüm 4: Bordro / İK temeli — payroll_records + leave_requests
-- + Maaş Gizliliği RLS: personel YALNIZ kendi bordrosunu/izinlerini görür;
--   yönetici (admin/manager) herkesi görür.
-- Güvenli eşleme: employees.user_id = auth.uid() (isim eşleştirme DEĞİL).
-- ====================================================================

-- 1) Personel kaydını login kullanıcısına bağla (self-view için). Null = bağsız.
alter table public.employees
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_employees_user_id on public.employees(user_id);

-- Yardımcı: bu auth kullanıcısı verilen employee_id'nin SAHİBİ mi?
create or replace function public.is_own_employee(emp_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees e where e.id = emp_id and e.user_id = auth.uid());
$$;
revoke all on function public.is_own_employee(uuid) from public;
grant execute on function public.is_own_employee(uuid) to authenticated;

-- 2) Bordro kayıtları
create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  period text not null,                 -- 'YYYY-MM'
  gross numeric not null default 0,     -- brüt
  deductions numeric not null default 0,-- kesintiler
  advances numeric not null default 0,  -- avanslar
  net numeric not null default 0,       -- net (gross - deductions - advances)
  status text not null default 'draft', -- draft | approved | paid
  paid_at timestamptz,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (employee_id, period)
);
alter table public.payroll_records enable row level security;
-- Maaş gizliliği: kendi bordrosu VEYA yönetici/admin
drop policy if exists "payroll_self_or_manager_read" on public.payroll_records;
create policy "payroll_self_or_manager_read" on public.payroll_records
  for select using (public.is_own_employee(employee_id) or public.user_role() in ('admin','manager'));
-- Yazma yalnız yönetici/admin (bordroyu personel düzenleyemez)
drop policy if exists "payroll_manager_write" on public.payroll_records;
create policy "payroll_manager_write" on public.payroll_records
  for all using (public.user_role() in ('admin','manager'))
  with check (public.user_role() in ('admin','manager'));

-- 3) İzin talepleri
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type text not null default 'annual', -- annual | sick | unpaid | other
  reason text,
  status text not null default 'pending',    -- pending | approved | rejected
  approved_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.leave_requests enable row level security;
-- Personel kendi taleplerini görür+oluşturur; yönetici hepsini görür+karar verir
drop policy if exists "leave_self_or_manager_read" on public.leave_requests;
create policy "leave_self_or_manager_read" on public.leave_requests
  for select using (public.is_own_employee(employee_id) or public.user_role() in ('admin','manager'));
drop policy if exists "leave_self_insert" on public.leave_requests;
create policy "leave_self_insert" on public.leave_requests
  for insert with check (public.is_own_employee(employee_id) or public.user_role() in ('admin','manager'));
-- Karar (onay/ret) yalnız yönetici/admin
drop policy if exists "leave_manager_decide" on public.leave_requests;
create policy "leave_manager_decide" on public.leave_requests
  for update using (public.user_role() in ('admin','manager'))
  with check (public.user_role() in ('admin','manager'));
