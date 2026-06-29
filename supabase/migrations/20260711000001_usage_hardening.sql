-- =============================================================
-- Sertleştirme: is_payroll_manager search_path + bump_app_usage p_date
-- =============================================================
-- (1) RLS yetki kararı veren fonksiyonun search_path'ini sabitle (savunma derinliği —
--     niteliksiz nesne/çağıran search_path değişikliklerine karşı).
create or replace function public.is_payroll_manager()
returns boolean language sql stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  );
$$;

-- (2) bump_app_usage'a p_date ekle: gün dönümünde/offline tamponlanan sayaçlar DOĞRU güne
--     yazılsın (istemci tamponun gerçek tarihini geçer). Eski 4-argümanlı imza kaldırılır.
drop function if exists public.bump_app_usage(integer, integer, integer, text);
create or replace function public.bump_app_usage(
  p_screens integer, p_actions integer, p_sessions integer, p_name text, p_date date default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.app_usage (user_id, date, user_name, screen_views, actions, sessions, last_active)
  values (auth.uid(), coalesce(p_date, current_date), p_name, greatest(coalesce(p_screens,0),0), greatest(coalesce(p_actions,0),0), greatest(coalesce(p_sessions,0),0), now())
  on conflict (user_id, date) do update set
    screen_views = public.app_usage.screen_views + excluded.screen_views,
    actions      = public.app_usage.actions + excluded.actions,
    sessions     = public.app_usage.sessions + excluded.sessions,
    last_active  = now(),
    user_name    = coalesce(excluded.user_name, public.app_usage.user_name);
end; $$;

grant execute on function public.bump_app_usage(integer, integer, integer, text, date) to authenticated;
