-- ============================================================================
-- GÜVENLİK: notifications + push_tokens → KULLANICI-BAZLI RLS (denetim M8)
-- ----------------------------------------------------------------------------
-- 20260610 hardening'i bu iki tabloya `using (auth.uid() is not null)` (giriş
-- yapmış HERKES) politikası vermişti. Sonuç:
--   • notifications: başkasının bildirimleri okunabiliyor/silinebiliyordu
--     (markRead/deleteNotification yalnız id'ye göre, güvenliği RLS'e bırakıyor).
--   • push_tokens: oturumlu herkes TÜM cihaz push token'larını okuyabiliyordu
--     (Expo push endpoint auth gerektirmez → spoof/spam push riski).
-- Düzeltme: her kullanıcı YALNIZ kendi satırlarını görür/değiştirir. Çapraz
-- erişim (notify-push'un herkese bildirim yazması, herkesin token'ını okuması)
-- service_role ile yapılır ve RLS'i bypass eder → uygulama akışı bozulmaz.
-- ============================================================================

-- notifications: kullanıcı yalnız kendi (user_id) bildirimlerini okur/günceller/siler.
alter table public.notifications enable row level security;
drop policy if exists "notifications_auth_all" on public.notifications;
drop policy if exists "notifications_self" on public.notifications;
create policy "notifications_self" on public.notifications
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- push_tokens: kullanıcı yalnız kendi cihaz token'larını yönetir.
alter table public.push_tokens enable row level security;
drop policy if exists "push_tokens_auth_all" on public.push_tokens;
drop policy if exists "push_tokens_self" on public.push_tokens;
create policy "push_tokens_self" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
