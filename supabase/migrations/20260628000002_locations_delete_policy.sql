-- ====================================================================
-- KVKK silme/unutulma hakkı — locations DELETE policy
-- ====================================================================
-- locations'ta RLS açık ama yalnız INSERT + SELECT policy'si vardı; DELETE policy
-- olmadığı için TÜM roller (admin dahil) için DELETE sessizce reddediliyordu →
-- GPS PII (lat/lng/batarya/hız) hiçbir kod yolundan silinemiyordu. kvkk_erase_user
-- RPC'si bu policy ile çalışır. Yetki modeli locations SELECT ile simetrik.

drop policy if exists "locations_self_or_manager_delete" on public.locations;
create policy "locations_self_or_manager_delete" on public.locations
  for delete using (user_id = auth.uid() or public.user_role() in ('admin','manager'));
