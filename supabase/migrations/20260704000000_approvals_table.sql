-- =============================================================
-- approvals: onay havuzunu SUNUCUYA taşı (çok-kullanıcılı onay akışı — Kural 8)
-- =============================================================
-- SORUN: governance.ApprovalRequest yalnız AsyncStorage'daydı (gov_approvals_v1). Bir
-- yöneticinin telefonunda oluşan onay talebi BAŞKA cihazda görünmüyordu; "riskli eylem
-- insan onayı" akışı tek cihaza hapsoluyordu. Sunucu tablosu + RLS ile gerçek çok-kullanıcılı
-- onay havuzu sağlanır. (audit_log zaten sunucuda; bu yalnız onaylar içindir.)

create table if not exists public.approvals (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null,            -- delete|discount|bulk_assign|payroll|data_export|permission_change|other
  title              text not null,
  description        text,
  requested_by       uuid,
  requested_by_name  text,
  resource           text,                     -- PermissionResource (opsiyonel)
  resource_id        text,
  payload            jsonb default '{}'::jsonb,
  status             text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_by         uuid,
  decided_by_name    text,
  decision_note      text,
  required_approvals int,
  created_at         timestamptz not null default now(),
  decided_at         timestamptz
);
create index if not exists approvals_status_idx on public.approvals(status, created_at desc);
create index if not exists approvals_requested_by_idx on public.approvals(requested_by);

alter table public.approvals enable row level security;

-- OKUMA: tüm authenticated (iç onay havuzu — talep eden durumunu, onaylayanlar havuzu görür).
drop policy if exists approvals_read on public.approvals;
create policy approvals_read on public.approvals for select to authenticated using (true);

-- OLUŞTURMA: authenticated kendi talebini açar (requested_by = kendisi; sistem/null serbest).
drop policy if exists approvals_insert on public.approvals;
create policy approvals_insert on public.approvals for insert to authenticated
  with check (requested_by is null or requested_by = auth.uid());

-- KARAR (UPDATE): YALNIZ admin/manager onaylayabilir/reddedebilir (Kural 8 — yetkili onay).
drop policy if exists approvals_decide on public.approvals;
create policy approvals_decide on public.approvals for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager')));
