-- =============================================================
-- Faz 2: Public web botu altyapısı — müşteri talep kutusu + kalıcı IP rate-limit
-- =============================================================
-- Public web botu (anon ziyaretçi) DB'ye YAZMAZ; yalnız bu iki yapıyı kullanır:
--   (1) web_requests: ziyaretçinin bıraktığı talep/iletişim → operatör onay kutusu.
--       Anon OKUYAMAZ/yazamaz (PII); insert YALNIZ edge fn (service_role); okuma personel.
--   (2) public_rate_hit RPC + tablo: edge instance'lar arası KALICI IP rate-limit (in-memory
--       sayaç edge'de güvenilmez). Açık LLM rölesinin abuse/fatura suistimaline karşı.

-- ── (1) Müşteri talep kutusu ────────────────────────────────
create table if not exists public.web_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  contact     text,                       -- telefon/e-posta (ziyaretçinin verdiği)
  message     text not null,
  summary     text,                        -- bot özeti
  source      text not null default 'web',
  status      text not null default 'new'
    check (status in ('new','reviewed','converted','closed')),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists web_requests_status_idx on public.web_requests(status, created_at desc);

alter table public.web_requests enable row level security;
-- Okuma + güncelleme: yalnız personel (admin/manager/engineer). Anon ve düşük yetkili kapalı.
drop policy if exists web_requests_staff_read on public.web_requests;
create policy web_requests_staff_read on public.web_requests for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','engineer')));
drop policy if exists web_requests_staff_update on public.web_requests;
create policy web_requests_staff_update on public.web_requests for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','engineer')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','engineer')));
-- INSERT politikası YOK → yalnız service_role (public-chat edge fn) yazabilir (RLS bypass).

-- ── (2) Kalıcı IP rate-limit ────────────────────────────────
create table if not exists public.public_rate_limit (
  bucket       text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.public_rate_limit enable row level security;
-- Politika YOK → yalnız SECURITY DEFINER RPC / service_role erişir.

-- Atomik artır + pencere sıfırla; limit aşılmadıysa true döner.
create or replace function public.public_rate_hit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into public.public_rate_limit(bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when public.public_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
                 then 1 else public.public_rate_limit.count + 1 end,
    window_start = case when public.public_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
                 then now() else public.public_rate_limit.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.public_rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.public_rate_hit(text, int, int) to service_role;
