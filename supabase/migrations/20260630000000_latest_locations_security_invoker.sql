-- ====================================================================
-- GÜVENLİK: latest_locations view RLS sızıntısı + locations realtime
-- ====================================================================
-- latest_locations view'i security_invoker DEĞİLDİ → view owner (postgres)
-- hakkıyla çalışıp altındaki locations RLS'ini BYPASS ediyordu. Sonuç: field
-- rolü `select * from latest_locations` ile HERKESİN son GPS konumunu görebilir
-- (PII sızıntısı). security_invoker=on ile view artık sorgulayan kullanıcının
-- RLS'ini uygular: field yalnız kendi konumu, admin/manager hepsi.

alter view public.latest_locations set (security_invoker = on);

-- Canlı harita (subscribeRealtime) için locations INSERT'lerinin realtime
-- yayınlanması gerekir. supabase_realtime publication'ına idempotent ekle.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'locations'
     )
  then
    execute 'alter publication supabase_realtime add table public.locations';
  end if;
end $$;
