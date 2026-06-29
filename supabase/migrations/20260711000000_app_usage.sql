-- =============================================================
-- app_usage: uygulama kullanım takibi (kim ne kadar kullanmış) + skor
-- =============================================================
-- Kullanıcı başına GÜNLÜK sayaçlar (ekran görüntüleme, aksiyon, oturum). İstemci
-- yerelde tamponlar, periyodik olarak bump_app_usage RPC ile ATOMİK artırır.
-- GİZLİLİK: yönetici/müdür HERKESİ görür (leaderboard); kullanıcı yalnız kendini.

create table if not exists public.app_usage (
  user_id      uuid not null,
  date         date not null default current_date,
  user_name    text,
  screen_views integer not null default 0,
  actions      integer not null default 0,
  sessions     integer not null default 0,
  last_active  timestamptz not null default now(),
  primary key (user_id, date)
);
create index if not exists app_usage_date_idx on public.app_usage(date desc);

alter table public.app_usage enable row level security;

-- OKUMA: yönetici/müdür herkesi; diğerleri yalnız kendi.
drop policy if exists app_usage_read on public.app_usage;
create policy app_usage_read on public.app_usage for select to authenticated using (
  public.is_payroll_manager() or user_id = auth.uid()
);
-- YAZMA yalnız RPC üzerinden (security definer) — doğrudan tabloya yazma politikası yok.

-- Atomik günlük artış. auth.uid() null ise no-op. SECURITY DEFINER: RLS'i atlar ama
-- DAİMA auth.uid() satırına yazar (başkasının verisi değiştirilemez).
create or replace function public.bump_app_usage(
  p_screens integer, p_actions integer, p_sessions integer, p_name text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.app_usage (user_id, date, user_name, screen_views, actions, sessions, last_active)
  values (auth.uid(), current_date, p_name, greatest(coalesce(p_screens,0),0), greatest(coalesce(p_actions,0),0), greatest(coalesce(p_sessions,0),0), now())
  on conflict (user_id, date) do update set
    screen_views = public.app_usage.screen_views + excluded.screen_views,
    actions      = public.app_usage.actions + excluded.actions,
    sessions     = public.app_usage.sessions + excluded.sessions,
    last_active  = now(),
    user_name    = coalesce(excluded.user_name, public.app_usage.user_name);
end; $$;

grant execute on function public.bump_app_usage(integer, integer, integer, text) to authenticated;
