-- ============================================================================
-- GÜVENLİK: RLS olmadan public şemada açık kalan SON 14 tablo
-- ----------------------------------------------------------------------------
-- 20260610/20260611 hardening'lerinden sonra hâlâ RLS'siz kalan tablolar.
-- Anon/authenticated PostgREST üzerinden okunup yazılabiliyorlardı; bunların
-- bir kısmı HASSAS (2FA secret, KVKK rızası/metni, erişim kuralları, yedek
-- meta, kullanıcı dizini). Detay: SISTEM-DENETIM-RAPORU.md (Madde 2).
--
-- Not: two_factor/kvkk/backups/access_rules client tarafında AsyncStorage ile
-- tutuluyor (security.ts) — bu tablolara sıkı politika app akışını KIRMAZ,
-- yalnız doğrudan PostgREST açığını kapatır. service_role (Edge) bypass eder.
-- ============================================================================

-- 1) Operasyonel tablolar: anon kapat, giriş yapmış kullanıcı okur/yazar
--    (20260610/11 ile aynı non-breaking kalıp).
do $$
declare
  t text;
  pol text;
  tbls text[] := array[
    'customer_sites', 'customer_documents', 'customer_ratings',
    'damage_analyses', 'voice_reports', 'reports', 'form_response_revisions'
  ];
begin
  foreach t in array tbls loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security', t);
      pol := t || '_auth_all';
      execute format('drop policy if exists %I on public.%I', pol, t);
      execute format(
        'create policy %I on public.%I for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)',
        pol, t
      );
    end if;
  end loop;
end $$;

-- 2) report_preferences: kullanıcı kendi tercihini yönetir; admin/manager hepsini görür
alter table public.report_preferences enable row level security;
drop policy if exists "report_prefs_self_or_mgr" on public.report_preferences;
create policy "report_prefs_self_or_mgr" on public.report_preferences
  for all to authenticated
  using (user_id = auth.uid() or public.user_role() in ('admin','manager'))
  with check (user_id = auth.uid() or public.user_role() in ('admin','manager'));

-- 3) app_users: kullanıcı dizini — herkes okur (atama/listeleme), yalnız admin/manager yazar
alter table public.app_users enable row level security;
drop policy if exists "app_users_read" on public.app_users;
create policy "app_users_read" on public.app_users
  for select to authenticated using (auth.uid() is not null);
drop policy if exists "app_users_write" on public.app_users;
create policy "app_users_write" on public.app_users
  for all to authenticated
  using (public.user_role() in ('admin','manager'))
  with check (public.user_role() in ('admin','manager'));

-- 4) two_factor: 2FA sırları — yalnız kendi satırı (başkasının secret'i okunamaz)
alter table public.two_factor enable row level security;
drop policy if exists "two_factor_self" on public.two_factor;
create policy "two_factor_self" on public.two_factor
  for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- 5) kvkk_consents: kendi rızasını ekler/okur; admin/manager hepsini okur; admin yönetir
alter table public.kvkk_consents enable row level security;
drop policy if exists "kvkk_consents_select" on public.kvkk_consents;
create policy "kvkk_consents_select" on public.kvkk_consents
  for select to authenticated
  using (user_id = auth.uid()::text or public.user_role() in ('admin','manager'));
drop policy if exists "kvkk_consents_insert" on public.kvkk_consents;
create policy "kvkk_consents_insert" on public.kvkk_consents
  for insert to authenticated
  with check (user_id = auth.uid()::text);
drop policy if exists "kvkk_consents_admin" on public.kvkk_consents;
create policy "kvkk_consents_admin" on public.kvkk_consents
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

-- 6) kvkk_settings: aydınlatma metni — herkes okur, yalnız admin yazar
alter table public.kvkk_settings enable row level security;
drop policy if exists "kvkk_settings_read" on public.kvkk_settings;
create policy "kvkk_settings_read" on public.kvkk_settings
  for select to authenticated using (auth.uid() is not null);
drop policy if exists "kvkk_settings_admin" on public.kvkk_settings;
create policy "kvkk_settings_admin" on public.kvkk_settings
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

-- 7) access_rules: IP/cihaz erişim kuralları — yalnız admin
alter table public.access_rules enable row level security;
drop policy if exists "access_rules_admin" on public.access_rules;
create policy "access_rules_admin" on public.access_rules
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

-- 8) backups: yedek meta — yalnız admin
alter table public.backups enable row level security;
drop policy if exists "backups_admin" on public.backups;
create policy "backups_admin" on public.backups
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');
