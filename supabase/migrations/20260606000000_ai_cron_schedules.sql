-- pg_cron tabanlı otomatik AI işleri.
-- Gereksinimler:
--   1) Supabase Dashboard → Database → Extensions → "pg_cron" ve "pg_net" aktif olmalı.
--   2) Aşağıdaki iki secret Supabase Vault / Dashboard → Project Settings → Vault'a girilmelidir:
--        ai_project_url        → https://<project-ref>.supabase.co
--        ai_service_role_key   → service_role JWT  (gizli!)
--      Migration burada vault.decrypted_secrets'ı kullanır.
--
-- Bu migration sadece job'ları tanımlar; vault secret'ları olmadan job'lar ilk çalıştırmada hata loglar — gerçek tetikleme için secret'ları eklemeden migrate etmeyin.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Helper: vault'tan değer çek
create or replace function public._ai_vault(name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = _ai_vault.name limit 1;
$$;

-- Helper: edge fonksiyona POST gönder
create or replace function public._ai_invoke_edge(fn text, body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
as $$
declare
  base text := public._ai_vault('ai_project_url');
  key  text := public._ai_vault('ai_service_role_key');
  req_id bigint;
begin
  if base is null or key is null then
    raise notice 'ai_project_url veya ai_service_role_key vault secret eksik';
    return null;
  end if;
  select net.http_post(
    url     := base || '/functions/v1/' || fn,
    body    := body,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || key
    )
  ) into req_id;
  return req_id;
end;
$$;

-- Eski job'ları kaldır (idempotent)
do $$
begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('ai_rag_worker_hourly','ai_insights_weekly');
exception when others then null;
end $$;

-- 1) RAG ingest queue worker — her saat başı (UTC)
select cron.schedule(
  'ai_rag_worker_hourly',
  '0 * * * *',
  $$select public._ai_invoke_edge('ai-rag-worker', jsonb_build_object('batch_size', 50));$$
);

-- 2) Haftalık AI insights raporu — Pazartesi 06:00 UTC ≈ 09:00 TR
select cron.schedule(
  'ai_insights_weekly',
  '0 6 * * 1',
  $$select public._ai_invoke_edge('ai-insights', jsonb_build_object('period_days', 7, 'send_email', true, 'send_gchat', true));$$
);

-- Yararlı görünüm: aktif job'lar
create or replace view public.ai_cron_jobs as
  select jobname, schedule, command, active, jobid
  from cron.job
  where jobname like 'ai\_%' escape '\';
