-- =============================================================
-- bordro_aylik: birleşik net-maaş bordrosu (aylık, personel başına)
-- =============================================================
-- Hesap motoru uygulamada (bordroEngine): Toplam = anlaşılan net + pazar/tatil +
-- mesai + gider + prim + ek ödeme − gelmedi kesintisi − avans. SGK/vergi NET'i etkilemez.
-- GİZLİLİK: kişi YALNIZ kendi bordrosunu görür (employees.user_id eşleşmesi);
-- yönetici/müdür HERKESİ görür. Yazma yalnız yönetici/müdür (Kural: maaş gizliliği).

create or replace function public.is_payroll_manager()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  );
$$;

create table if not exists public.bordro_aylik (
  id                   uuid primary key default gen_random_uuid(),
  employee_id          uuid references public.employees(id) on delete cascade,
  period               text not null,                 -- YYYY-MM
  full_name            text not null default '',
  national_id          text default '',               -- TC
  agreed_net           numeric not null default 0,    -- anlaşılan net
  worked_days          numeric not null default 0,    -- gün
  overtime_hours       numeric not null default 0,    -- mesai (saat)
  sunday_holiday_days  numeric not null default 0,    -- pazar/resmi tatil gün
  absent_days          numeric not null default 0,    -- gelmedi gün
  advance              numeric not null default 0,    -- avans
  expense              numeric not null default 0,    -- gider
  bonus                numeric not null default 0,    -- prim
  official_salary      numeric not null default 0,    -- resmi maaş
  extra_payment        numeric not null default 0,    -- ek ödeme
  status               text not null default 'taslak' check (status in ('taslak','onaylandi','odendi')),
  created_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists bordro_aylik_period_idx on public.bordro_aylik(period);
create index if not exists bordro_aylik_employee_idx on public.bordro_aylik(employee_id);

alter table public.bordro_aylik enable row level security;

-- OKUMA: yönetici/müdür herkesi; diğerleri yalnız kendi (employees.user_id = auth.uid()).
drop policy if exists bordro_read on public.bordro_aylik;
create policy bordro_read on public.bordro_aylik for select to authenticated using (
  public.is_payroll_manager()
  or exists (
    select 1 from public.employees e
    where e.id = bordro_aylik.employee_id and e.user_id = auth.uid()
  )
);

-- YAZMA (insert/update/delete): yalnız yönetici/müdür.
drop policy if exists bordro_write on public.bordro_aylik;
create policy bordro_write on public.bordro_aylik for all to authenticated
  using (public.is_payroll_manager())
  with check (public.is_payroll_manager());
