# SENİN YAPMAN GEREKENLER — Operasyonel Kontrol Listesi

> Güncelleme: Edge deploy'ların TAMAMINI ben yaptım + migration'ların canlıda uygulandığını
> doğruladım. Geriye **yalnızca dış konsollarda anahtar rotasyonu** (bende erişim yok) ve
> birkaç opsiyonel iş kaldı. `PROJE_REF = mdwcasycfssdkogdlbyh`.

---

## ✅ TAMAMLANDI (ben yaptım / doğruladım)
- **5 edge fonksiyonu canlıya deploy edildi:** ai-proxy (v16), ai-tools (v11), ai-rag-worker
  (v7), apollo-proxy (v2), send-quote-email (v2). → web AI sohbet+ajan, maliyet cap, auth
  gate, rate-limit, PDF eki adı hepsi CANLI.
- **Migration'lar canlıda uygulanmış (doğrulandı):** 35 migration, en son `20260701` (teklif
  görsel kolonu). `quotes.images` var ✓ · `app_settings` admin-only ✓ · RLS'siz tablo: 0 ✓ ·
  notifications/push_tokens per-user RLS ✓ · ayrıcalık-yükseltme trigger'ı ✓.
  → Tüm denetimlerin #1 bloklayıcısı **"deploy boşluğu" KAPANDI**.

---

## 🔴 KALAN ZORUNLU İŞ: Sızan anahtarları ROTATE et (dış konsollar — bende erişim yok)
Bunları yalnızca sen yapabilirsin (OpenAI/Google/Apollo hesaplarına giriş gerekiyor):

1. **Google Maps anahtarı** — `app.json`, `eas.json`, `netlify.toml`,
   `.github/workflows/android-apk.yml` içinde **düz metin** (git'e işlenmiş = herkese açık).
   - Google Cloud Console → eski anahtarı **iptal et**, yeni üret.
   - Yeni anahtara **kısıt** koy: Android paket adı + SHA-1 (mobil), HTTP-referrer (web).
   - Yeni anahtarı bu 4 dosyada güncelle, commit'le.
2. **Apollo anahtarı** — eskiden uygulama paketine gömülüydü (kod düzeltildi).
   - Apollo panelinden eski anahtarı iptal + yeni üret.
   - Yeni anahtarı uygulama içi **Ayarlar → Harici API Anahtarları**'na gir (artık pakete girmez).
3. **LLM anahtarları (OpenAI/Anthropic/Gemini)** — sunucu sırrı olarak kurulu ve çalışıyor.
   `app_settings` artık admin-only (canlıda doğrulandı) ama bir dönem açık olabildiyse
   **tedbiren** sağlayıcı konsollarından yenile (zorunlu değil, güvenlik hijyeni).

---

## 🟡 OPSİYONEL (yalnız ilgili özelliği istiyorsan)
```bash
# Apollo'yu sunucu sırrıyla çalıştırmak istersen (kullanıcı kendi anahtarını girmesin diye):
npx supabase secrets set APOLLO_API_KEY=<yeni-apollo-anahtari> --project-ref mdwcasycfssdkogdlbyh

# Paraşüt fatura entegrasyonu (şu an çift-kilitli KAPALI; açmak istersen):
npx supabase secrets set PARASUT_CLIENT_ID=... PARASUT_CLIENT_SECRET=... PARASUT_USERNAME=... PARASUT_PASSWORD=... PARASUT_COMPANY_ID=... --project-ref mdwcasycfssdkogdlbyh
```

## 🟡 OPSİYONEL: APK üretim imzası (yalnız Play Store / dış dağıtım için)
Şu anki APK debug-keystore ile imzalı → cihaza kurulur (iç kullanım sorunsuz). Play Store
veya farklı-imzayla güncelleme için üretim keystore gerekir:
```bash
keytool -genkeypair -v -keystore kobinerji-release.keystore -alias kobinerji \
  -keyalg RSA -keysize 2048 -validity 10000
```
Sonra `android/app/build.gradle` → `release { signingConfig ... }`'i bu keystore'a bağla
(şu an `signingConfigs.debug`). Keystore + şifreyi GÜVENLİ sakla (kaybedersen güncelleyemezsin).

---

## ÖZET
Uygulamanın çalışması için **yapman gereken zorunlu bir şey kalmadı** — kod, edge ve DB hazır.
Tek gerçek güvenlik ödevi: **Maps + Apollo anahtarlarını rotate etmek** (yukarıda madde 1–2).
Gerisi tamamen opsiyonel.
