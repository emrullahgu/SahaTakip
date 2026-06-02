-- 20260604000000_ai_usage_log.sql
-- AI çağrı kullanım/maliyet izleme tablosu.

create table if not exists public.ai_usage_log (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete set null,
  function_name text not null,
  model         text,
  input_tokens  int,
  output_tokens int,
  cost_usd      numeric(10, 6),
  duration_ms   int,
  status        text not null default 'ok' check (status in ('ok', 'error')),
  error_message text,
  meta          jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists ai_usage_log_user_idx
  on public.ai_usage_log(user_id, created_at desc);

create index if not exists ai_usage_log_fn_idx
  on public.ai_usage_log(function_name, created_at desc);

-- Günlük özet view (dashboard için)
create or replace view public.ai_usage_daily as
select
  date_trunc('day', created_at) as day,
  function_name,
  count(*) as calls,
  sum(coalesce(input_tokens, 0)) as input_tokens,
  sum(coalesce(output_tokens, 0)) as output_tokens,
  round(sum(coalesce(cost_usd, 0))::numeric, 4) as cost_usd,
  round(avg(coalesce(duration_ms, 0))::numeric, 0) as avg_ms,
  sum(case when status = 'error' then 1 else 0 end) as errors
from public.ai_usage_log
where created_at >= now() - interval '30 days'
group by 1, 2
order by 1 desc, 4 desc;

-- RLS: kullanıcı kendi kayıtlarını görsün, service_role her şey.
alter table public.ai_usage_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_usage_log' and policyname='ai_usage_self_read') then
    create policy ai_usage_self_read on public.ai_usage_log
      for select to authenticated using (user_id = auth.uid() or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_usage_log' and policyname='ai_usage_service_all') then
    create policy ai_usage_service_all on public.ai_usage_log
      for all to service_role using (true) with check (true);
  end if;
end $$;
