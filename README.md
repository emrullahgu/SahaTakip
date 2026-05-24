# SahaTakip 📱

> **SAHADA · TAKİPTE · KONTROLDE**
> Mobil + Web saha takip platformu (Android APK + iOS + PWA Web)

SahaTakipiçin geliştirilen saha mühendisleri, ekip yöneticileri ve müşteri portalı için
hibrit takip uygulaması. Expo / React Native ile yazılmıştır, tek kod tabanı 3 platforma
çıkar: **Android APK, iOS IPA, Web (Netlify)**. Veriler **Supabase** (Postgres + Auth + Storage)
üzerinde tutulur.

---

## 📚 Dokümantasyon

- **[Modül haritası](docs/MODULE_MAP.md)** — Ekran prefiksleri, navigation, servis katmanı
- **[Smoke test matrisi](docs/SMOKE_TESTS.md)** — Manuel kontrol listesi
- **[Yol haritası](POZ_ROADMAP.md)** — Faz geçmişi (1..21)
- **[Değişiklik günlüğü](CHANGELOG.md)** — Sürüm notları

---

## 🎯 Özellikler

### v1 (Mevcut)
- ✅ İş emri açma + servis tamamlama akışı
- ✅ Müşteri onayı + faturalama
- ✅ Puantaj (günlük yevmiye + arşiv)
- ✅ Masraf takibi
- ✅ Yönetici Onay paneli (AI analizi + sapma uyarısı)
- ✅ **🆕 Tekliflendirme modülü** (4 sütunlu fiyat editörü, ~60 hazır poz)
  - Malzeme B.F. + Montaj B.F. + Demontaj (opsiyonel) + Genel Gider %
  - Otomatik kâr / KDV / iskonto hesabı
  - Durum akışı: Taslak → Onay Bekliyor → Müşteriye Gönderildi → Kabul → Fatura
- ✅ Koyu tema, Türkçe UI, logo brand renkleri (lacivert + yeşil)

### v2 (Yol Haritası)
- 🚧 Supabase entegrasyonu (Auth + RT senkronizasyon)
- 🚧 GPS check-in/check-out + harita
- 🚧 PDF teklif çıktısı + imza
- 🚧 Stok / zimmet takibi
- 🚧 Rol bazlı erişim (admin / yönetici / mühendis / saha)
- 🚧 Web sürümü (Netlify deploy)

---

## 🚀 Hızlı Başlangıç

```bash
# 1) Bağımlılıkları kur
npm install --legacy-peer-deps

# 2) .env oluştur (örnekten kopyala)
cp .env.example .env
# içeriği aç ve Supabase URL+anon key gir

# 3) Geliştirme sunucusunu başlat
npm start             # Metro + Expo Dev Tools
npm run android       # Android emülatör / fiziksel cihaz
npm run ios           # iOS simülatör (sadece macOS)
npm run web           # Tarayıcı (http://localhost:8081)
```

> **Expo Go uygulaması:** Android/iOS cihazınıza Expo Go yükleyip QR okutarak hızlı önizleme yapabilirsiniz.

---

## 📦 Android APK Build

```bash
# EAS CLI kurulumu (ilk seferde)
npm install -g eas-cli
eas login

# APK (test dağıtımı için)
npm run build:apk
# → Bulutta build başlar, link verilir, .apk indirebilirsiniz

# AAB (Google Play için)
npm run build:aab
```

Yapılandırma: [eas.json](eas.json) — `preview` profili APK üretir, `production` profili AAB.

---

## 🌐 Web Build & Netlify Deploy

### Lokal test
```bash
npm run build:web
# → dist/ klasörü oluşur
npx serve dist
```

### Netlify deploy
1. GitHub'a push edin.
2. https://app.netlify.com → **Add new site → Import from Git**
3. Build ayarları (zaten [netlify.toml](netlify.toml) içinde tanımlı):
   - Build command: `npm run build:web`
   - Publish directory: `dist`
4. **Environment variables** sekmesine ekleyin:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. **Deploy site** → hazır. Otomatik HTTPS, custom domain ve PR preview ücretsiz.

---

## 🗄️ Supabase Kurulumu

### 1. Proje oluştur
- https://app.supabase.com → **New Project**
- Region: `eu-central-1` (Frankfurt) — en düşük gecikme TR için
- Database password'u kaydedin

### 2. Şemayı yükle
- Dashboard → **SQL Editor** → **New query**
- [supabase/schema.sql](supabase/schema.sql) dosyasının tamamını yapıştırın
- **Run** → Tablolar, RLS, trigger'lar otomatik oluşur.

### 3. Storage bucket'larını oluştur
Dashboard → **Storage** → **New bucket**:

| İsim         | Public | Açıklama                  |
| ------------ | ------ | ------------------------- |
| `photos`     | ✅ Yes  | Saha fotoğrafları         |
| `documents`  | ❌ No   | PDF teklif/raporlar       |
| `signatures` | ❌ No   | Müşteri imzaları          |

### 4. .env dosyanızı doldurun
Dashboard → **Settings → API**:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 5. İlk admin kullanıcısı
Authentication → Users → **Add user** ile kullanıcı oluşturup,
SQL Editor'da rolü güncelleyin:
```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

---

## 🏗️ Proje Yapısı

```
SahaTakip/
├── App.tsx                     # Giriş noktası
├── app.json                    # Expo konfigürasyon
├── eas.json                    # EAS Build profilleri
├── netlify.toml                # Web deploy yapılandırması
├── .env.example                # Çevre değişkenleri şablonu
├── assets/                     # icon, splash, logo
├── src/
│   ├── theme.ts                # Brand renkler + spacing + typography
│   ├── components/             # Toast, StatusBadge
│   ├── context/AppContext.tsx  # Global state + quote calc helpers
│   ├── data/
│   │   ├── initialData.ts      # Demo iş emirleri/personel
│   │   └── pozCatalog.ts       # ~60 poz fiyat kataloğu
│   ├── navigation/index.tsx    # Tab + Stack navigation
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── WorkOrdersScreen.tsx
│   │   ├── NewServiceScreen.tsx
│   │   ├── ServicesScreen.tsx
│   │   ├── QuotesScreen.tsx        # 🆕 Teklif listesi
│   │   ├── NewQuoteScreen.tsx      # 🆕 4 sütunlu teklif editörü
│   │   ├── QuoteDetailScreen.tsx   # 🆕 Teklif detay + durum akışı
│   │   ├── ManagerScreen.tsx
│   │   ├── CompanyScreen.tsx
│   │   └── ExpensesScreen.tsx
│   ├── services/supabase.ts    # Supabase client + CRUD helper
│   └── types/index.ts          # TS tipler (Quote, Customer, ...)
└── supabase/schema.sql         # DB şeması + RLS politikaları
```

---

## 💰 Teklif Fiyatlandırma Formülü

```
unitBase       = malzeme + montaj + (demontaj_dahil ? demontaj : 0)
lineRaw        = unitBase × miktar
afterDiscount  = lineRaw × (1 − iskonto%/100)
withOverhead   = afterDiscount × (1 + genel_gider%/100)
withProfit     = withOverhead × (1 + kâr%/100)         ← KDV Hariç toplam
vat            = withProfit × KDV%/100
total          = withProfit + vat                       ← Genel toplam
```

Varsayılan değerler: **Genel gider %10, Kâr %15, KDV %20**.

---

## 🧪 Test (TypeScript)

```bash
npx tsc --noEmit
```

---

## 📄 Lisans

SahaTakipMühendislik © 2025 — Tüm hakları saklıdır.
