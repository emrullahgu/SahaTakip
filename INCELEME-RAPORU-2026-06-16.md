<!--
SahaTakip — Detaylı Sistem İncelemesi (taze, mevcut durum)
Tarih: 2026-06-16 · HEAD: 587ad34
Yöntem: mimari haritası + 13 boyut paralel inceleme + her critical/high bulgunun adversarial doğrulaması + sentez
İstatistik: 46 ajan, ~2.6M token, 803 araç kullanımı, ~15 dk
Bağımsız zemin-gerçeği: tsc --noEmit = 0 hata; jest = 261/261 geçti (31 suite)
Karşılaştırma tabanı: SISTEM-DENETIM-RAPORU.md (2026-06-09, commit 75f0c59)
-->

# SahaTakip — Detaylı İnceleme Raporu (2026-06-16)

## Karar: ÜRETİME HAZIR DEĞİL (NO-GO)

2026-06-09 denetiminden bu yana **47 düzeltme commit'i** ile gerçek ve önemli ilerleme kaydedildi; önceki raporun en ağır bloklayıcısı (ayrıcalık yükseltme) dahil çok sayıda madde **gerçekten ve doğru biçimde** kapatıldı. Ancak sistem hâlâ üretime hazır değil. İki temel sebep:

1. **Deploy boşluğu:** En kritik güvenlik düzeltmelerinin büyük bölümü (14 tablonun RLS'i, `notifications`/`push_tokens` kullanıcı-bazlı RLS, `ai_messages` IDOR + `SECURITY DEFINER` `search_path` sertleştirmesi, korumasız edge fonksiyonlarının kimliği) **yalnızca migration dosyalarında veya redeploy bekleyen edge kodunda** yaşıyor. Commit mesajları açıkça "deploy bekliyor"/"uygulama bekliyor" diyor; `schema.sql` bu RLS politikalarını içermiyor ve repoda canlı DB'ye uygulandığına dair kanıt yok. → Canlı sistem için **kapalı sayılamaz**.
2. **Kod-içi (deploy'dan bağımsız) doğrulanmış bloklayıcılar:** `app_settings` üzerinden her authenticated kullanıcının kaydedilmiş LLM anahtarını okuyabilmesi; rol/onay değişikliklerinin hiç denetlenmemesi; agent konsolunun başarısız araçları yeşil ✅ ile göstermesi; PDF imzasının bozuk çıkması; sıfır ekran testi; "herkese bildir"in kanal opt-out'unu yok sayması.

> **Go/no-go ön koşulu:** Canlı Supabase instance'ında `pg_policies` / `pg_tables.rowsecurity` sorgularıyla migration'ların gerçekten uygulandığı **kanıtlanana** ve aşağıdaki kod-içi düzeltmeler yapılana kadar üretime geçilemez.

---

## 1. Sistemin Şekli

| Ölçü | Değer |
|------|-------|
| TS/TSX satır | ~148.000 |
| Ekran | 471 |
| Servis | 108 |
| Edge fonksiyon | 20 |
| Migration | 28 |
| Test (suite/test) | 31 / **261 geçiyor** |
| `tsc --noEmit` | **0 hata** (strict) |

Mimari sağlam: `App → SafeAreaProvider → ErrorBoundary → AuthProvider → AppProvider → AppNavigator`. Tutarlı bir repository katmanı (online/offline kontrat, cache fallback, sync kuyruğu, UUID guard), tek-kaynak para motoru (`quoteMath.ts`) ve paylaşılan tasarım sistemi (`theme.ts`) var. Tek kod tabanı 3 platforma (Android APK / iOS / Web) çıkıyor.

---

## 2. 7 Üretim Gereksinimi Karnesi

| # | Gereksinim | Durum | Özet |
|---|-----------|:-----:|------|
| 1 | Mobil/responsive Android APK | ❌ FAIL | KAV yalnız 34/155 form ekranında ve çoğu `behavior=ios?padding:undefined` (Android'de no-op); 8/9/10px fontlar; NewQuoteScreen'de Save bar klavye altında; APK CI **imzasız** assembleRelease üretiyor (kurulamaz). |
| 2 | Modern + sade UI | ⚠️ PARTIAL | Paylaşılan tasarım sistemi + gerçek dark/light var; ama tema değişimi anlık değil (tam reload zorluyor), 4-kolon fiyat editöründe 8px etiket/~21px dokunma hedefi, `userInterfaceStyle:'dark'` ↔ varsayılan light uyumsuzluğu. |
| 3 | AI ajanı kusursuz / asla yalan söylemez | ⚠️ PARTIAL | Büyük iyileşme (yazma araçları gerçek DB sonucu bekliyor, fiyat uydurmuyor, consultant guardrail). Ama: `loop.ts:193` `ok:true` hardcoded → başarısız araç yeşil ✅; `update_work_order_status` fire-and-forget → DB başarısını bilmeden "Durum güncellendi" diyor. |
| 4 | Markalı temiz PDF | ⚠️ PARTIAL | `@page A4 margin:0` 9 şablonun tümünde, inline logo, escape tutarlı. Ama imza `data:application/json` olarak `<img>`'e gömülü → **her imzalı belgede bozuk görsel**; fotoğraflar uzak URL → native/offline'da boş. |
| 5 | Tam kayıt (denetim + bildirim) | ⚠️ PARTIAL | Finansal/operasyonel çekirdek artık denetleniyor + offline audit kuyruğu düzeldi. Ama **rol/onay değişikliği hiç denetlenmiyor** (en kritik ayrıcalık-verme yolu izsiz); ~33/43 mutasyon servisi hâlâ audit'siz. |
| 6 | Her ekran tek tek test edildi | ❌ FAIL | **471 ekranın 0'ında** render/smoke testi yok; hiçbir test `src/screens`'ten import etmiyor. 261 test tamamen pure-logic. Coverage eşiği yok; testler CI'da çalışmıyor (`workflow_dispatch`-only). |
| 7 | Her aksiyonda herkese bildir | ⚠️ PARTIAL | Çekirdek `notifyEveryone` akışı bağlı (deploy varsayımıyla). Ama broadcast kullanıcı kanal opt-out'unu (`channel_enabled`) **tamamen yok sayıyor**; SLA/quoteSent/quoteAccepted emitter'ları tanımlı ama hiç çağrılmıyor. |

**Hiçbir gereksinim tam "pass" değil.**

---

## 3. Bloklayıcılar (doğrulanmış critical/high)

### Kod-içi (deploy'dan bağımsız — hemen düzeltilebilir)

1. **🔴 CRITICAL — `app_settings` üzerinden LLM API anahtarı sızıntısı** · `supabase/schema.sql:1613-1615`
   `app_settings_read_all_auth` SELECT'i her authenticated kullanıcıya açık; `AiSettings.apiKey` buraya düz `jsonb` yazılıyor. En düşük yetkili 'field' hesabı bile `select value from app_settings` ile paralı anahtarı çeker. **Bağımsız doğrulandı** (schema.sql canlı). App katmanı PostgREST'i engelleyemez.

2. **🟠 HIGH — Rol/onay değişikliği hem client hem server'da denetimsiz** · `src/services/userManagement.ts:33-57` + `schema.sql:1328-1430`
   `setUserRole/approveUser/rejectUser` ve RPC gövdeleri `audit_log`'a hiçbir şey yazmıyor. Kim kime admin verdi, kim hangi hesabı onayladı — kayıt yok. Maaş/finans işleyen sistemde Req#5 bloklayıcısı.

3. **🟠 HIGH — Agent konsolu başarısız araçları yeşil ✅ gösteriyor** · `src/services/agent/loop.ts:192-193`
   Handler throw etmedikçe `ok:true` yayılıyor; oysa `create_quote_draft/set_quote_status/gmail_send` vb. başarısızlığı `{ok:false}` döndürüyor. Kaydedilemeyen teklif / gönderilemeyen e-posta kullanıcıya başarı görünüyor. Req#3 ihlali.

4. **🟠 HIGH — `update_work_order_status` DB yazımı çözülmeden "Durum güncellendi"** · `src/context/AppContext.tsx:580-599`
   Senkron boolean; `persistWorkOrder` fire-and-forget. RLS reddi/offline'da bulut yazımı olmasa da ajan başarı iddia ediyor.

5. **🟠 HIGH — Teklif kabul metadata'sı hiç persist edilmiyor** · `src/services/data/mappers.ts:45-60`
   `quoteToRow` `generated_work_order_id, share_token, accepted_at/by, accept_signature, revision`'ı serialize etmiyor. Refresh/relogin sonrası **WO linki ve yasal imza kanıtı sessizce kayboluyor**; idempotency anahtarı dayanıksız.

6. **🟠 HIGH — İmza her servis PDF'inde bozuk; fotoğraflar native/offline'da boş** · `src/services/workOrderPdf.ts:151, 37-42`
   SignaturePad `data:application/json` (stroke koordinat) üretiyor ama `<img src>`'e konuyor → bozuk-görsel; SVG/PNG'ye çevrilmiyor. Müşteriye giden belge eksik.

### Deploy-pending (canlıda uygulandığı kanıtlanmalı)

7. **🔴 CRITICAL — 14 hassas tablonun RLS'i yalnızca migration'da** · `20260623000000_rls_remaining_14_tables.sql` (vs `schema.sql`)
   `two_factor` (düz metin secret), `kvkk_consents`, `access_rules`, `backups`, `app_users` **`schema.sql`'de hiç tanımlı/RLS-enable değil**. Canlı DB schema.sql'den kurulup migration uygulanmadıysa 2FA secret/KVKK kayıtları PostgREST'e dünyaya açık. **Bağımsız doğrulandı: bu tablolar schema.sql'de yok.**

8. **🔴 CRITICAL — `notifications`/`push_tokens` kullanıcı-bazlı RLS yalnızca migration'da** · `20260624000000`
   Düzeltme doğru ama `schema.sql`'de yok. Canlı hâlâ eski gevşek politikadaysa her kullanıcı tüm push token'larını okur, başkalarının bildirimlerini siler (IDOR).

9. **🟠 HIGH — `ai_messages` IDOR + `SECURITY DEFINER` `search_path`** · `20260626000000` (commit "henüz UYGULANMADI" diyor)
10. **🟠 HIGH — Korumasız/maliyetli edge fonksiyonları** · `gmail-send/gchat-send/whatsapp-send` kodunda HİÇ auth yok (818a5a4 atladı); `ai-vision/ai-voice/ai-insights` kimliksiz paralı OpenAI çağırıyor; `apollo-proxy`/`ai-rag` açık. `supabase/config.toml` yok.

---

## 4. 2026-06-09'dan Bu Yana Gerçekten Kapatılanlar (12)

- ✅ **Ayrıcalık yükseltme** — `protect_profile_privileged_cols` BEFORE UPDATE trigger'ı role/approval'ı OLD'a sabitliyor; privileged kolonlar yalnızca admin/manager kontrollü `SECURITY DEFINER` RPC'lerle değişir; son-admin demote koruması dahil. *(hem migration hem schema.sql)*
- ✅ **LLM anahtarları client bundle'dan kaldırıldı** — `ai.ts`'den tüm `EXPO_PUBLIC_*_KEY` okumaları silindi; yalnız runtime cache. `.env` git history'ye **hiç** commit edilmemiş.
- ✅ **AI ajan yazma dürüstlüğü** — `addQuote/setQuoteStatus/addCustomer` await+optimistic rollback ile `WriteResult` döndürüyor; `create_customer` name→shortName bug'ı düzeldi; `create_quote_draft` fiyat uydurmuyor.
- ✅ **Para matematiği tek kaynak** — `quoteMath.ts`; NewQuoteScreen/pdf/agent aynı modülü kullanıyor; `grandTotal=subtotal+vat` invariantı test edildi (30 hedefli test).
- ✅ **ID çakışması** — `quotes.number`/`work_orders.number` `text unique not null`; üreteçler max-sequence+1; idempotent re-accept guard.
- ✅ **`refresh()` boş listeyi yutmuyor** (Promise.allSettled); `syncDrain.applyOp` idempotent + test edildi.
- ✅ **PDF `@page` + escape + inline logo** 9 şablonda tutarlı.
- ✅ **Push pipeline'ı standalone APK için onarıldı** (projectId Constants'tan, login'de otomatik kayıt, anon broadcast kapalı).
- ✅ **exec_readonly_sql** public/anon'dan REVOKE; ai-sql edge'inde requireUser arkasında.
- ✅ **Edge kimlik katmanı** `requireUser` (gerçek JWT + rol + approval) en tehlikeli yazma fonksiyonlarına bağlandı; webhook'lar fail-closed (HMAC/constant-time).
- ✅ **UTC tarih kayması** `localDateISO()` 28 dosyada; tehlikeli desen production'dan kalktı.
- ✅ **`tsc` strict 0 hata; 261 test geçiyor**; ManagerScreen/ProductCatalog perf (useMemo + debounce).

---

## 5. Hâlâ Açık / Yeni Tespitler (öne çıkanlar)

- **KVKK "sil" hakkı kod düzeyinde yok** — `locations` UPDATE/DELETE politikası yok, hiçbir kod yolu erasure yapmıyor.
- **`acceptQuoteAndCreateWorkOrder` hâlâ fire-and-forget** — DB unique constraint yok; iki cihaz iki WO basabilir.
- **Mock `offline.ts` `runSync()` canlı** — OfflineQueue ekranı sahte "Senkron Tamamlandı" gösteriyor (yanıltıcı).
- **`notify-push` kanal opt-out'unu yok sayıyor** — herkes her rutin aksiyonda push+email.
- **`chat-attachments` storage IDOR** — conversation-participant kontrolü yok.
- **employees offline delete = HARD, online = soft** — divergent semantik + poison-op riski.
- **`ai-tools find_customer`** LLM girdisini PostgREST `.or()` filtresine ham interpolasyon (filter-grammar injection).
- **Maps anahtarı 4+ tracked dosyada düz metin** (`app.json`, `eas.json`, `netlify.toml`, GitHub Actions) — **bağımsız doğrulandı**.
- **Testler CI'da hiç çalışmıyor**, coverage eşiği yok.
- **Ölü kod** — logger/analytics sink, i18n modülü %100 ölü; ortak para formatlama helper'ı hâlâ yok (~472 manuel yer); `as any` **326** (denetimde 311 idi).

---

## 6. Öncelikli Aksiyon Planı

1. **DEPLOY DOĞRULAMASI (ön koşul):** Canlı instance'ta `pg_policies` + `pg_tables.rowsecurity` ile 14 tablo, notifications, push_tokens, ai_messages WITH CHECK ve DEFINER fonksiyon `search_path`'lerinin **gerçekten uygulandığını kanıtla**; edge fonksiyonlarını yalnız anon key ile çağırıp 401/403 aldığını doğrula.
2. **`app_settings_read_all_auth`'u admin-only'ye daralt** (veya secret'ları ayrı tabloya/edge env'e taşı) ve mevcut anahtarları **rotate et**.
3. **`set_user_role/set_user_approval`'a server-taraflı `audit_log` INSERT** + client wrapper'lara `auditRepo` ekle.
4. **`loop.ts`'de `ok = !(result?.ok === false)`** yap; `update_work_order_status`'ü async `WriteResult`+rollback'e çevir ve tool handler'da await et.
5. **`quoteToRow/quoteFromRow`'a kabul metadata'sını** ekle; `generated_work_order_id` için DB unique constraint veya atomik accept RPC.
6. **PDF imzasını üretimden önce SVG/PNG'ye çevir**; fotoğrafları `FileSystem` ile base64 data-URI'ye indirip göm; web print'te `img.decode()` bekle.
7. **`gmail-send/gchat-send/whatsapp-send/ai-vision/ai-voice/ai-insights/apollo-proxy`'ye `requireUser`** + `max_tokens` cap; `supabase/config.toml` commit'le `verify_jwt`'yi versiyonla.
8. **`notify-push`'ta `notification_preferences` join** → kapalı kanalları düşür; e-postayı kritik tiplere ayır.
9. **`quoteSent/quoteAccepted`'i durum geçişlerine bağla**; SLA için `pg_cron` + edge fonksiyon.
10. **schema.sql ↔ migration tek kaynağa indirge** (`supabase db dump` ile regenerate veya CI'da `db push`); uygulanmış-migration ledger'ı commit'le.
11. **CI'da `npm test`'i PR'larda çalıştır** + modest coverage gate; para/sync/auth dokunan ~15 ekran için smoke-render testi.
12. **Android klavye:** NewQuoteScreen'i gerçek KAV'e sar; `typography.xs >= 12`; küçük butonlara `hitSlop`; APK CI'da **release signing** (kurulabilir artefakt); mock `offline.ts runSync`'i gerçek pipeline'a bağla veya butonu gizle.
