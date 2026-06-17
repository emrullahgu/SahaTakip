-- =============================================================
-- app_settings: hassas AI anahtari satirini (key='ai_settings') yalniz admin'e ac.
-- =============================================================
-- SORUN (CRITICAL, canli): "app_settings_read_all_auth" politikasi SELECT'i her
-- authenticated kullaniciya veriyordu. AiSettings.apiKey/keys app_settings.value
-- icinde duz jsonb saklandigindan, en dusuk yetkili 'field' hesabi bile PostgREST ile
--   select value from app_settings where key = 'ai_settings'
-- calistirip parali LLM anahtarini sizdirabiliyordu. App katmani PostgREST'i engelleyemez.
--
-- COZUM: Hassas satir (ai_settings) YALNIZ admin'e okunur; diger ayarlar herkese acik kalir.
-- Non-admin kullanicilarin LLM cagrilari ai-proxy edge fonksiyonu uzerinden gitmeli.
--
-- NOT: Bu migration uygulandiktan sonra ifsa olmus LLM anahtarlari ROTATE EDILMELIDIR
-- (anahtar daha once tum kullanicilara goruntulenmis olabilir).

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_all_auth" on public.app_settings;
drop policy if exists "app_settings_read_nonsecret" on public.app_settings;
create policy "app_settings_read_nonsecret" on public.app_settings
  for select using (auth.role() = 'authenticated' and key <> 'ai_settings');

drop policy if exists "app_settings_read_secret_admin" on public.app_settings;
create policy "app_settings_read_secret_admin" on public.app_settings
  for select using (
    key = 'ai_settings'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Yazma politikasi degismedi: yalniz admin (app_settings_admin_write).
