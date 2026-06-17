-- ====================================================================
-- KVKK silme/unutulma hakki — GERCEK erasure RPC (Faz 49 dogrulugu)
-- ====================================================================
-- Onceki durum: DataErasureScreen "Tam Silme" yalniz AsyncStorage'a 'queued'
-- bir kayit ekliyordu; hicbir Supabase verisi silinmiyordu (Req#3 ihlali —
-- kullaniciya islem baslatildi gosteriliyor ama hicbir sey olmuyor).
--
-- Bu RPC bir veri sahibinin (p_user) konum/vardiya PII'sini ATOMIK siler.
-- SECURITY DEFINER + admin guard: istemci PII tablolarina dogrudan toplu DELETE
-- atmamali; tek noktadan kontrol + en az ayricalik.

create or replace function public.kvkk_erase_user(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc int := 0;
  v_shift int := 0;
  v_chk int := 0;
  v_geo int := 0;
begin
  -- Yalniz admin calistirabilir.
  if public.user_role() <> 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.locations where user_id = p_user;          get diagnostics v_loc = row_count;
  delete from public.shifts where user_id = p_user;             get diagnostics v_shift = row_count;
  delete from public.location_checkins where user_id = p_user;  get diagnostics v_chk = row_count;
  delete from public.geofence_events where user_id = p_user;    get diagnostics v_geo = row_count;

  return jsonb_build_object(
    'locations', v_loc,
    'shifts', v_shift,
    'checkins', v_chk,
    'geofence_events', v_geo
  );
end;
$$;

revoke all on function public.kvkk_erase_user(uuid) from public;
grant execute on function public.kvkk_erase_user(uuid) to authenticated;
