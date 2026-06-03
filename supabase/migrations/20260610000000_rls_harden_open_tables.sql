-- ============================================================================
-- RLS sertleştirme — schema.sql'de RLS'siz (public anon key'e açık) kalan
-- operasyonel tablolar. Veri kaydı garanti (login'li kullanıcı tam erişim),
-- yönetici/herkes okur, ama PUBLIC anon key ile dışarıdan erişim kapanır.
--
-- Politika: `to authenticated ... using (auth.uid() is not null)` — yani
--   • Giriş yapmış her kullanıcı okur/yazar (uygulama akışları aynen çalışır;
--     bu tablolarda owner kolonu set edilmediği için owner-bazlı kısıt KULLANILMAZ).
--   • anon (giriş yapmamış) erişemez → veri sızıntısı kapanır.
--   • service_role (Edge Functions) RLS'i bypass eder → notify-push vb. etkilenmez.
--
-- Not: Finansal tabloları (payments/cash_entries) role-bazlı (sadece manager)
-- daraltmak ayrı bir adımdır; burada amaç anon açığını kapatıp kaydı garantilemek.
-- ============================================================================

do $$
declare
  t text;
  tbls text[] := array[
    'notifications', 'notification_preferences', 'push_tokens',
    'payments', 'cash_entries', 'einvoice_config', 'einvoice_records',
    'vehicles', 'vehicle_logs', 'vehicle_damages', 'vehicle_route_points',
    'warehouses', 'form_templates', 'form_responses', 'quote_revisions',
    'erp_adapters', 'webhooks', 'import_history', 'api_keys'
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
