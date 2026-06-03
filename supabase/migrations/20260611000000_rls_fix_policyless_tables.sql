-- ============================================================================
-- RLS DÜZELTME — RLS açık ama POLİTİKASIZ kalan tablolar.
-- Bu tablolarda authenticated kullanıcı (admin dahil) hiçbir satır yazamıyordu
-- ("new row violates row-level security policy" → 403) çünkü hiçbir permissive
-- policy yoktu. Sonuç: app yerele kaydedip cloud senkronunda veriyi kaybediyordu
-- ("kaydedilmiyor gibi"). Canlı CRUD smoke testiyle tespit edildi.
--
-- Düzeltme: 20260610 ile aynı non-breaking politika — giriş yapmış kullanıcı
-- okur/yazar, anon kapalı, service_role bypass eder.
-- ============================================================================

do $$
declare
  t text;
  tbls text[] := array[
    'materials', 'stock_movements', 'stock_balances',
    'assets', 'energy_readings', 'maintenance_plans',
    'inspections', 'nonconformities', 'sales_visits'
  ];
  pol text;
begin
  foreach t in array tbls loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
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
