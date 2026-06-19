<!--
SahaTakip — Yapılacaklar Listesi (taze inceleme)
Tarih: 2026-06-19 · HEAD: e85e813 · Dal: main (temiz)
Yöntem: 6 paralel boyut taraması + çelişkili bulguların doğrudan kodla doğrulanması
Zemin gerçeği: tsc --noEmit = 0 hata · jest = 345/345 geçti (43 suite)
Önceki temel: INCELEME-RAPORU-2026-06-16.md (NO-GO, 06-16)
-->

# SahaTakip — Yapılacaklar Listesi (2026-06-19)

## Genel durum
2026-06-16 incelemesinden bu yana **2 büyük oturum** (ef6e279, 1e201bf) ile o raporun
**kod-içi bloklayıcılarının tamamı** kapatıldı. Geriye kalan ana risk artık koddan çok
**deploy doğrulaması** ve **anahtar rotasyonu** (operasyonel). Mobil/UI cilası ve test
kapsamı hâlâ eksik. Zemin: `tsc` 0 hata, jest 345/345.

> **Karar:** Kod tarafı üretime çok yakın. **Bloklayıcı = canlı DB/edge deploy'unun
> kanıtlanması + sızan anahtarların rotasyonu.** Bunlar yapılmadan GO denemez.

---

## ⚡ Bu oturumda TAMAMLANDI (2026-06-19, kod tarafı — 7 commit)
Aşağıdaki P1/P2/P3 kod maddeleri uygulandı, doğrulandı (tsc 0, jest **360/360** + **test:render 10/10**), commit'lendi:
- ✅ **P1.6** `ai-rag-worker` auth gate (allowServiceRole'lü `requireUser` — pg_cron service_role + kullanıcı JWT geçer, anon reddedilir; öz-incelemede yakalanan cron-kırılması düzeltildi) + **P1.8** `ai-tools` token cap (12k) + `apollo-proxy` rate-limit (`b7377fe`, fix)
- ✅ **P1.5** schema.sql drift: `ai_conversations`/`ai_messages` eklendi (`82b9603`)
- ✅ **P1.7** SLA ihlali PROAKTİF bildirimi: `slaWatcher.ts` + AppContext.refresh() + 5 test; ölü `i18n` kaldırıldı (`33287ee`)
- ✅ **P0.3 (kod kısmı)** Apollo anahtarı client bundle'dan kaldırıldı (`3f3b4a5`)
- ✅ **P2.11/P2.12** 8/9px fontlar → 10 (40 ekran) + HomeScreen dokunma hedefleri (`b95a2ae`)
- ✅ **P3.14** Ekran smoke-render harness + 10 ekran + CI'a bağlandı (`9dd761f`)

**KALAN (hâlâ yapılacak):** P0 operasyonel (migration+edge deploy doğrulama, anahtar rotasyonu, Paraşüt secrets) — kullanıcıda. P2.9 APK production keystore, P2.10 Android KAV cihaz testi, P2.13 anlık tema. P3.15 audit kapsamı genişletme, P3.16 console→logger, P3.17 formatTRY yaygınlaştırma, ekran-render kapsamını artırma (KvkkScreen timer'ı hariç).

---

## ✅ 06-16'dan bu yana GERÇEKTEN kapatılanlar (kodla doğrulandı)
- Agent `loop.ts` `ok` artık handler sonucundan türetiliyor (başarısız araç ❌)
- `update_work_order_status` async + `WriteResult` + await (sahte "güncellendi" yok)
- Teklif kabul metadata'sı persist ediliyor (`mappers.ts quoteToRow`) **+** `acceptQuoteAndCreateWorkOrder` idempotent guard + `sourceQuoteId` + 23505 yarış işleme + state/DB senkron — **tam düzeltilmiş**
- PDF imzası JSON-stroke → inline SVG (`workOrderPdf.signatureToSvg`); fotoğraflar base64 gömülü
- AI HTTP 400 "content null" fix (`sanitizeOpenAiMessages` + loop.ts boş mesaj eklemiyor)
- `app_settings` ai_settings satırı **admin-only** okuma (schema.sql + migration 20260627)
- `latest_locations` view `security_invoker=on` (GPS sızıntısı kapandı)
- 19/21 edge fonksiyonu `requireUser` korumalı; webhook'lar fail-closed; `ai-rag` **korumalı**
- KVKK gerçek erasure RPC + secCenter hook; chat-attachments participant RLS; locations DELETE policy
- notify-push kanal opt-out; quoteSent/quoteAccepted emitter'ları durum geçişine bağlı
- CI (`ci.yml`) PR'larda tsc+jest çalıştırıyor; `.env` gitignore'da + git geçmişinde yok

---

## 🔴 P0 — Üretim bloklayıcıları (çoğu operasyonel, kullanıcı yapmalı)

1. **Migration'ları canlı DB'ye uygula + KANITLA.** 20260622→20260630 arası (RLS, privilege-escalation trigger, app_settings, kvkk, latest_locations, source_quote unique). Doğrula:
   - `select tablename from pg_tables where schemaname='public' and not rowsecurity;`
   - `select * from pg_policies where tablename in ('app_settings','notifications','push_tokens','ai_messages','two_factor');`
   - Edge fonksiyonlarını yalnız anon key ile çağırıp 401/403 aldığını doğrula.
2. **Edge fonksiyonlarını deploy et:** parasut-proxy, notify-push, ai-tools, apollo-proxy, ai-route, ai-rag, ai-rag-worker, dispatch-email-reports (+`REPORTS_CRON_TOKEN`).
3. **Anahtar ROTASYONU (sızıntı kapatma):**
   - LLM anahtarları (OpenAI/Claude/Gemini): `app_settings` migration öncesi her authenticated kullanıcıya okunabilirdi → **rotate et**.
   - **Google Maps anahtarı 4 izlenen dosyada düz metin** (`app.json`, `eas.json`, `netlify.toml`, `.github/workflows/android-apk.yml`) → rotate + **paket/SHA-1 ve HTTP-referrer kısıtı** uygula (Maps anahtarı zaten client'a gömülür; kısıtlama şart).
   - **Apollo anahtarı client bundle'a giriyor** (`externalApiKeys.ts:45` `EXPO_PUBLIC_APOLLO_API_KEY` referansı) → rotate + yalnız `apollo-proxy` edge üzerinden kullan, client referansını kaldır.
4. **Paraşüt secrets** (fatura entegrasyonu isteniyorsa): `supabase secrets set PARASUT_CLIENT_ID/SECRET/USERNAME/PASSWORD/COMPANY_ID`. (Fatura kesme şu an çift-kilitli kapalı — sistem oturana kadar kapalı kalabilir.)

---

## 🟠 P1 — Kod düzeltmeleri (üretimden önce yapılmalı)

5. **`schema.sql` ↔ migration drift'ini kapat (tek kaynak).** `ai_messages`/`ai_conversations` ve `two_factor`/`kvkk_consents`/`access_rules`/`backups`/`app_users` CREATE TABLE'ları schema.sql'de yok — RLS DO-block'ları tablo yoksa atlanır. Sıfırdan kurulan DB'de bu tablolar korumasız/eksik kalır. `supabase db dump` ile schema.sql'i yeniden üret veya eksik tanımları ekle.
6. **`ai-rag-worker` inbound auth gate ekle.** Şu an kimliksiz POST kuyruk işleme/embedding maliyeti tetikleyebilir; `dispatch-email-reports` kalıbıyla `RAG_CRON_TOKEN` Bearer kontrolü ekle.
7. **SLA ihlali proaktif bildirimi (Req#7 boşluğu).** `Notify.slaBreach()` tanımlı ama **hiç çağrılmıyor**; SLA yalnız raporda görünüyor. `updateWorkOrderStatus`'a kontrol ekle **veya** pg_cron job (her 15 dk açık iş emirlerini tara → edge fn).
8. **Maliyet cap sertleştirme (orta):** `ai-tools` döngüsünde kümülatif token bütçesi; `apollo-proxy` istek-sayısı rate-limit (şu an yalnız 25s timeout).

---

## 🟡 P2 — Mobil / UI (Req#1, Req#2)

9. **APK production keystore.** `android/app/build.gradle:115` release **debug.keystore** ile imzalı. Cihaza kurulabilir (test OK) ama Play Store'a yüklenemez / farklı imzayla OTA güncellenemez. Üretim keystore üret (keytool) + GitHub Secrets (base64) + workflow'a bağla. Ayrıca `versionCode` auto-increment.
10. **Android klavye davranışı.** ~105 form `behavior={ios?'padding':undefined}` (Android no-op). Çoğu ekranda `adjustResize` kurtarır ama NewQuoteScreen gibi sabit alt-bar olanları cihazda test et; gerekirse Android'de `behavior="height"`/`"position"`.
11. **Küçük fontlar:** 30+ yerde hardcoded `fontSize: 8/9/10` (tab bar, rozet, meta). Minimum 12px'e çek (`typography.sm`).
12. **Dokunma hedefleri:** `HomeScreen` logoutBtn 36×36, activityIcon 38×38 vb. <44px butonlara `hitSlop` veya boyut artışı.
13. **Tema değişimi anlık değil** — `themeMode.ts` tam app reload zorluyor. Dinamik theme context (reload'suz) — orta öncelik UX.

---

## 🟢 P3 — Test / kalite / teknik borç

14. **Ekran smoke testleri (Req#6):** 473 ekranın 0'ında render testi yok; testler pure-logic. Para/sync/auth dokunan ~15 ekran için render-smoke + `jest.config.js`'e `coverageThreshold`.
15. **Audit kapsamı (Req#5):** ~13/109 serviste `auditRepo`. Kritik yollar (rol/onay/finans/iş emri/teklif) loglanıyor; kalan CREATE/UPDATE/DELETE mutasyonlarına genişlet.
16. **Ölü kod:** `src/i18n` %100 kullanılmıyor → kaldır. `console.*` 112 yerde doğrudan; `logger`/`crashReporter` sink'e bağla.
17. **Para formatı tutarlılığı:** `utils/money.formatTRY` var ama yalnız ~6 yerde; 100+ inline `toLocaleString`/`toFixed`/`₺` kaldı → helper'a geçir.
18. **Küçük:** `reportSchedule.ts:73` TODO (weekly-report-email edge çağrısı); `offline.ts runSync()` hâlâ mock (dürüst "DEMO-ONLY" etiketli) → OfflineQueue ekranını `drainSyncQueue()`'ye bağla veya butonu gizle.

---

## Öncelik özeti
| P | Konu | Sahip | Bloklayıcı? |
|---|------|-------|:-:|
| P0 | Migration+edge deploy doğrulama, anahtar rotasyonu, Paraşüt secrets | Kullanıcı (+ ufak kod) | ✅ |
| P1 | schema drift, ai-rag-worker gate, SLA bildirimi, maliyet cap | Kod | Kısmen |
| P2 | APK keystore, klavye, font, dokunma hedefi, tema | Kod | Hayır (cila) |
| P3 | Ekran testi, audit kapsamı, ölü kod, para formatı | Kod | Hayır |
