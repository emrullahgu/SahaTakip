# SENİN YAPMAN GEREKENLER — Operasyonel Kontrol Listesi

> Kod tarafının tamamı bitti ve `main`'e push'landı. Aşağıdakiler **yalnızca senin
> yapabileceğin** işler (canlı veritabanı, dış konsollarda anahtar, imza kimliği).
> Her komut kopyala-yapıştır hazırdır. `PROJE_REF = mdwcasycfssdkogdlbyh`.

Tamamladıkça başına `[x]` koyabilirsin.

---

## 🔴 1. Edge fonksiyon deploy (4 tane) — EN ÖNEMLİ
`ai-proxy` BENİM TARAFIMDAN DEPLOY EDİLDİ ✅ (web AI sohbet+ajan artık çalışır; sunucu
anahtarları OPENAI/ANTHROPIC/GEMINI zaten kurulu). Kalan 4'ü sen deploy et:

```bash
cd "C:/Users/emrul/OneDrive/Masaüstü/SahaTakip"
npx supabase functions deploy ai-rag-worker   --project-ref mdwcasycfssdkogdlbyh
npx supabase functions deploy ai-tools        --project-ref mdwcasycfssdkogdlbyh
npx supabase functions deploy apollo-proxy    --project-ref mdwcasycfssdkogdlbyh
npx supabase functions deploy send-quote-email --project-ref mdwcasycfssdkogdlbyh
```
- **ai-rag-worker**: kimliksiz erişim kapanır (cron service_role + kullanıcı JWT geçer).
- **ai-tools**: AI ajan token maliyet tavanı (12k).
- **apollo-proxy**: kullanıcı başına dk'da 20 istek limiti.
- **send-quote-email**: müşteriye giden PDF eki adı "KOBİNERJİ-KONU-NO.pdf" olur.

> Not: bunlar olmadan da uygulama çalışır; sadece bu iyileştirmeler canlıya yansımaz.

---

## 🔴 2. Migration'ları canlı DB'ye uygula (DB şifresi bende yok)
Bu oturumda eklenen **tekliflere görsel** kolonu + önceki güvenlik (RLS) migration'ları:

```bash
cd "C:/Users/emrul/OneDrive/Masaüstü/SahaTakip"
npx supabase db push            # uygulanmamış tüm migration'ları uygular
```
(Şifre sorarsa Supabase DB şifreni gir. Alternatif: Supabase Dashboard → SQL Editor'da
`supabase/migrations/20260701000000_quote_images.sql` içeriğini çalıştır.)

**Uygulandığını DOĞRULA** (Dashboard → SQL Editor):
```sql
-- tekliflere görsel kolonu geldi mi
select column_name from information_schema.columns
 where table_name='quotes' and column_name='images';
-- RLS açık olmayan tablo kalmış mı (boş dönmeli)
select tablename from pg_tables where schemaname='public' and not rowsecurity;
-- LLM anahtarı admin-only mı
select policyname from pg_policies where tablename='app_settings';
```

---

## 🟠 3. Sızan anahtarları ROTATE et (dış konsollar — bende erişim yok)
1. **Google Maps anahtarı** — `app.json`, `eas.json`, `netlify.toml`,
   `.github/workflows/android-apk.yml` içinde **düz metin** (git'e işlenmiş = açık).
   - Google Cloud Console → eski anahtarı **iptal et**, yeni anahtar üret.
   - Yeni anahtara **kısıt** koy: Android paket adı + SHA-1 (mobil) ve HTTP-referrer (web).
   - Yeni anahtarı aynı 4 dosyada güncelle.
2. **Apollo anahtarı** — daha önce uygulama paketine gömülüyordu (kod tarafı düzeltildi).
   - Apollo panelinden eski anahtarı iptal + yeni üret.
   - Yeni anahtarı uygulama içi **Ayarlar → Harici API Anahtarları**'na gir (artık pakete girmez).
3. **LLM anahtarları (OpenAI/Anthropic/Gemini)** — sunucu sırrı olarak zaten kurulu; ek olarak
   `app_settings` admin-only migration'ı (madde 2) canlıda uygulanmadan önce bir dönem her
   kullanıcıya okunabilir olabildiyse **tedbiren rotate et** (sağlayıcı konsollarından).

---

## 🟡 4. Opsiyonel sırlar (yalnız ilgili özelliği istiyorsan)
```bash
# Apollo'yu sunucu sırrıyla çalıştırmak istersen (kullanıcı kendi anahtarını girmesin diye):
npx supabase secrets set APOLLO_API_KEY=<yeni-apollo-anahtari> --project-ref mdwcasycfssdkogdlbyh

# Paraşüt fatura entegrasyonu (şu an çift-kilitli KAPALI; açmak istersen):
npx supabase secrets set PARASUT_CLIENT_ID=... PARASUT_CLIENT_SECRET=... PARASUT_USERNAME=... PARASUT_PASSWORD=... PARASUT_COMPANY_ID=... --project-ref mdwcasycfssdkogdlbyh
```
> RAG_CRON_TOKEN'a GEREK YOK — ai-rag-worker artık service_role/kullanıcı JWT ile çalışıyor.

---

## 🟡 5. APK üretim imzası (yalnız Play Store / dış dağıtım için)
Şu anki APK debug-keystore ile imzalı → cihaza kurulur (iç kullanım sorunsuz). Play Store'a
yüklemek veya farklı imzayla güncellemek için üretim keystore gerekir:
```bash
keytool -genkeypair -v -keystore kobinerji-release.keystore -alias kobinerji \
  -keyalg RSA -keysize 2048 -validity 10000
```
Sonra `android/app/build.gradle` içinde `release { signingConfig ... }`'i bu keystore'a bağla
(şu an `signingConfigs.debug` kullanıyor). Keystore dosyasını ve şifresini GÜVENLİ sakla
(kaybedersen aynı uygulamayı güncelleyemezsin).

---

## ÖZET — minimum "çalışsın" seti
1. **Madde 1** (4 edge deploy) + **Madde 2** (db push) → tüm yeni özellikler canlı.
2. **Madde 3** (Maps + Apollo anahtar rotasyonu) → güvenlik açığı kapanır.
3. Madde 4–5 ihtiyaca göre.

Bittiğinde haber ver; istersen edge deploy'ları senin yerine yapmam için izin (Bash
permission) ekleyebilirsin, o zaman Madde 1'i ben hallederim.
