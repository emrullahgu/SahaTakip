# SahaTakip — POZ Numaralı Geliştirme Yol Haritası

> Tüm istenen özellikler **POZ-DEV-XXX** kodlarıyla, **bağımlılık sırasına** göre dizildi.
> Her POZ tek seferde geliştirilebilecek **atomic** bir iş paketidir.
>
> İlerleme: ✅ tamamlandı | 🟡 devam ediyor | ⬜ bekliyor

---

## FAZ 0 — Temel (zaten var)

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-000a | Expo + RN proje iskeleti | ✅ |
| POZ-DEV-000b | Auth ekranları (Login/Signup) | ✅ |
| POZ-DEV-000c | Tab navigation + dark theme | ✅ |
| POZ-DEV-000d | Teklif sistemi (POZ + 4 sütun + demontaj) | ✅ |
| POZ-DEV-000e | Müşteri CRUD (RAM) | ✅ |
| POZ-DEV-000f | İş emri (WorkOrders) (RAM) | ✅ |
| POZ-DEV-000g | Puantaj (ManagerScreen) | ✅ |
| POZ-DEV-000h | PDF teklif çıktısı (basit) | ✅ |
| POZ-DEV-000i | Logo + splash + ikon | ✅ |
| POZ-DEV-000j | EAS APK + Netlify web config | ✅ |

---

## FAZ 1 — Veri Kalıcılığı & Auth (Foundation)

| POZ | İş |
|---|---|
| POZ-DEV-001 ✅ | `.env` örneği + Supabase repo katmanı iskeleti (`src/services/data/`) |
| POZ-DEV-002 ✅ | **Quotes** → Supabase persistence (insert/list/update/delete) |
| POZ-DEV-003 ✅ | **Customers** → Supabase persistence |
| POZ-DEV-004 ✅ | **WorkOrders** → Supabase persistence |
| POZ-DEV-005 ✅ | **Employees** → Supabase persistence |
| POZ-DEV-006 ✅ | Profiles tablosu + `useAuth()` rol bilgisi (admin/manager/engineer/field) |
| POZ-DEV-007 ✅ | Rol bazlı ekran erişimi (RoleGuard component + nav filtreleme) |
| POZ-DEV-008 ✅ | Supabase RLS politikalarının schema.sql'e yazılması ve test edilmesi |
| POZ-DEV-009 ✅ | Şifre değiştirme ekranı |
| POZ-DEV-010 ✅ | Kullanıcı işlem log kaydı (audit_log tablosu) |
| POZ-DEV-011 ✅ | Offline cache (AsyncStorage) + reconnect sync |
| POZ-DEV-012 ✅ | Toast → Banner senkron durum göstergesi (online/offline/syncing) |

## FAZ 2 — Konum & Personel

| POZ | İş |
|---|---|
| POZ-DEV-013 ✅ | Personel profili detay ekranı (telefon/görev/bölge/ekip) |
| POZ-DEV-014 ✅ | `locations` tablosu + canlı konum yazma (her N saniyede) |
| POZ-DEV-015 ✅ | Supabase realtime ile haritada canlı personel pinleri |
| POZ-DEV-016 ✅ | Personel konum geçmişi (gün seçici + polyline) |
| POZ-DEV-017 ✅ | Geofence (bölge çizimi + giriş-çıkış kaydı) |
| POZ-DEV-018 ✅ | Sahte konum (mock location) algılama |
| POZ-DEV-019 ✅ | Mesai başlat/bitir + mola (`shifts` tablosu) |
| POZ-DEV-020 ✅ | QR kod ile lokasyon doğrulama (expo-camera barcode) |
| POZ-DEV-021 ✅ | NFC ile lokasyon doğrulama (stub + manuel kod, EAS dev-build gerekli) |
| POZ-DEV-022 ✅ | Puantaj raporu (aylık Excel/PDF) |
| POZ-DEV-023 ✅ | Konum kapalı uyarısı + mesai dışında takip kapatma toggle |

## FAZ 3 — İş Emri Akışı

| POZ | İş |
|---|---|
| POZ-DEV-024 | ✅ İş emri tam durum akışı (`bekliyor→atandı→yolda→başladı→tamamlandı→iptal`) |
| POZ-DEV-025 | ✅ Öncelik seviyesi (Normal/Yüksek/Acil) + acil flag |
| POZ-DEV-026 | ✅ Planlanan başlangıç/bitiş + SLA |
| POZ-DEV-027 | ✅ Görev devretme & reddetme akışı |
| POZ-DEV-028 | ✅ Toplu görev atama (multi-select) |
| POZ-DEV-029 | ✅ Tekrarlayan görev (periyodik bakım) — cron benzeri |
| POZ-DEV-030 | ✅ En yakın personele otomatik atama (lokasyon + uygunluk) — servis hazır |
| POZ-DEV-031 | ⏳ Video kaydı (expo-camera ile fotoblok hazır; expo-av kısmı sonraki fazda) |
| POZ-DEV-032 | ⏳ Ses kaydı (expo-av paket kurulumu sonraki fazda) |
| POZ-DEV-033 | ⏳ Mobil imza (signature-canvas paket kurulumu sonraki fazda) |
| POZ-DEV-034 | ✅ Görev süre takibi (timer start/stop, dakika hesabı) |
| POZ-DEV-035 | ✅ Görev maliyet takibi (malzeme + süre + recomputeWorkOrderCosts) |

## FAZ 4 — Teklif Gelişmiş

| POZ | İş |
|---|---|
| POZ-DEV-036 | ✅ PDF teklifte **POZ + Genel Gider** kırılımlı tablo |
| POZ-DEV-037 | ✅ Teklifi e-posta ile gönderme (Edge Fn + mailto fallback) |
| POZ-DEV-038 | ✅ Teklif revizyon geçmişi (`quote_revisions` + ekran) |
| POZ-DEV-039 | ✅ Teklif kabulü → iş emrine otomatik dönüşüm |
| POZ-DEV-040 | ✅ Müşteri imzalı kabul ekranı (paylasılabilir token) |
| POZ-DEV-041 | ✅ Teklif şablonları (3 hazır + CRUD) |
| POZ-DEV-042 | ✅ Hızlı POZ ekleme — "son kullandığım pozlar" listesi |
| POZ-DEV-043 | ✅ Teklif arama + filtre (durum/müşteri/tarih aralığı) |

## FAZ 5 — Müşteri & Lokasyon

| POZ | İş |
|---|---|
| POZ-DEV-044 | ✅ Müşteri sahaları/lokasyonları (`sites` tablosu) |
| POZ-DEV-045 | ✅ Müşteri belge/sözleşme yükleme (Supabase Storage) |
| POZ-DEV-046 | ✅ Müşteri geçmişi (timeline: teklif + iş emri + ziyaret) |
| POZ-DEV-047 | ✅ Müşteri memnuniyet puanı (post-job rating) |
| POZ-DEV-048 | ✅ Müşteri portal ekranı (kendi teklifleri/işleri) |

## FAZ 6 — Form & Kontrol Listeleri

| POZ | İş |
|---|---|
| POZ-DEV-049 | ✅ Dinamik form modeli + render (text/number/photo/signature/select) |
| POZ-DEV-050 | ✅ Form builder ekranı (admin) |
| POZ-DEV-051 | ✅ Hazır şablonlar: Denetim, Bakım, Arıza Tespit, Montaj, Teslimat |
| POZ-DEV-052 | ✅ Form doldurma akışı (iş emrine bağlı) |
| POZ-DEV-053 | ✅ Form revizyon geçmişi |

## FAZ 7 — Stok, Malzeme & Zimmet

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-054 | `materials` + `warehouses` tabloları + CRUD | ✅ |
| POZ-DEV-055 | Stok hareketi (giriş/çıkış/transfer) | ✅ |
| POZ-DEV-056 | Zimmet (personel/araç üzeri malzemeler) | ✅ |
| POZ-DEV-057 | Barkod/QR ile stok okuma | ✅ |
| POZ-DEV-058 | Minimum stok uyarısı + bildirim | ✅ |
| POZ-DEV-059 | İş emrinde kullanılan malzeme bildirimi → otomatik stok düşme | ✅ |

## FAZ 8 — Araç Takibi

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-060 | `vehicles` tablosu + personel eşleştirme | ✅ |
| POZ-DEV-061 | Km + yakıt + bakım/muayene tarihleri | ✅ |
| POZ-DEV-062 | Araç hasar bildirimi (fotoğrafı) | ✅ |
| POZ-DEV-063 | Araç rota geçmişi (lokasyon × araç) | ✅ |

## FAZ 9 — Raporlama & Dashboard

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-064 | Günlük saha raporu (otomatik 18:00 oluşum) | ✅ |
| POZ-DEV-065 | Haftalık / aylık rapor şablonları | ✅ |
| POZ-DEV-066 | PDF dışa aktarma (mevcut pdf.ts genişlet) | ✅ |
| POZ-DEV-067 | Excel dışa aktarma (xlsx kütüphanesi) | ✅ |
| POZ-DEV-068 | Yönetici dashboard — canlı KPI kartları | ✅ |
| POZ-DEV-069 | Grafikler (Victory Native — line/bar/pie) | ✅ |
| POZ-DEV-070 | SLA durumu + geciken işler raporu | ✅ |
| POZ-DEV-071 | Otomatik e-posta raporu (haftalık özet) | ✅ |

## FAZ 10 — Bildirim & İletişim

| POZ | İş |
|---|---|
| POZ-DEV-072 | Expo Push Notification kurulum + token kayıt |
| POZ-DEV-073 | Bildirim olay akışı (yeni iş, gecikme, onay vs.) |
| POZ-DEV-074 | E-posta (Resend) Edge Function |
| POZ-DEV-075 | SMS entegrasyonu (Netgsm/İletimerkezi) |
| POZ-DEV-076 | WhatsApp Business API webhook |
| POZ-DEV-077 | Bildirim tercihleri ekranı (kullanıcı bazlı) |

## FAZ 11 — Finans & Tahsilat

| POZ | İş |
|---|---|
| POZ-DEV-078 | `payments` tablosu — nakit/kart/havale |
| POZ-DEV-079 | Makbuz oluşturma (PDF) |
| POZ-DEV-080 | Müşteri bakiye + borç/alacak |
| POZ-DEV-081 | Saha personeli kasa takibi |
| POZ-DEV-082 | E-fatura (Logo/Mikro) entegrasyon arayüzü |

## FAZ 12 — Sektörel Modüller

| POZ | İş |
|---|---|
| POZ-DEV-083 | Enerji modülü — sayaç okuma + pano kontrol formu |
| POZ-DEV-084 | Trafo bakım formu + GES saha kontrolü |
| POZ-DEV-085 | Periyodik bakım planı (önleyici/düzeltici) |
| POZ-DEV-086 | Cihaz/ekipman geçmişi (asset tracking) |
| POZ-DEV-087 | Denetim formu + uygunsuzluk kaydı |
| POZ-DEV-088 | Kalite puanlama + düzeltici faaliyet |
| POZ-DEV-089 | Satış ziyaret formu + rakip bilgisi |

## FAZ 13 — Yapay Zeka

| POZ | İş |
|---|---|
| POZ-DEV-090 | Görev açıklamasından **otomatik POZ önerisi** (OpenAI/Claude) |
| POZ-DEV-091 | Fotoğraftan hasar/arıza analizi |
| POZ-DEV-092 | Ses kaydından otomatik rapor metni |
| POZ-DEV-093 | Rota optimizasyonu (TSP solver / OR-Tools API) |
| POZ-DEV-094 | Anomali tespiti (gecikme/performans) |

## FAZ 14 — Web Admin Paneli

| POZ | İş |
|---|---|
| POZ-DEV-095 | Web-only admin layout (responsive — geniş ekran tablo görünümü) |
| POZ-DEV-096 | Toplu işlem (multi-select bulk update/delete) |
| POZ-DEV-097 | Gelişmiş filtre + arama bar (her listede) |
| POZ-DEV-098 | Kullanıcı & rol yönetim ekranı |
| POZ-DEV-099 | Form tasarım ekranı (web) |
| POZ-DEV-100 | Canlı takip ekranı (büyük harita + yan panel) |

## FAZ 15 — Entegrasyon & Güvenlik

| POZ | İş |
|---|---|
| POZ-DEV-101 | REST API (Supabase Edge Functions) + API anahtarı |
| POZ-DEV-102 | Webhook çıktıları (yeni iş/teklif kabul vs.) |
| POZ-DEV-103 | Excel içe aktarma (müşteri/poz/personel) |
| POZ-DEV-104 | ERP/CRM entegrasyon adaptör katmanı (Logo/Netsis/Mikro) |
| POZ-DEV-105 | KVKK aydınlatma metni + onay akışı |
| POZ-DEV-106 | Veri yedekleme cron + restore betiği |
| POZ-DEV-107 | 2FA (TOTP) |
| POZ-DEV-108 | IP/cihaz kısıtlama (admin için) |


## FAZ 16 — Mevcut Temel Yapı

Uygulamada halihazırda bulunan temel modüller:

Expo + React Native proje iskeleti
Login / Signup auth ekranları
Tab navigation
Dark theme
Teklif sistemi
POZ + 4 sütun + demontaj yapısı
Müşteri CRUD
İş emri yapısı
Puantaj ekranı
Basit PDF teklif çıktısı
Logo, splash screen ve ikon
EAS APK ve Netlify web config


## FAZ 17 — Veri Kalıcılığı ve Auth

Bu faz, uygulamanın gerçek veritabanına bağlanması ve kullanıcı/rol yapısının oturtulması için kullanılır.

Eklenecek işler:

Supabase bağlantı yapısı
.env örneği
src/services/data/ repo katmanı
Tekliflerin Supabase’e kaydedilmesi
Müşterilerin Supabase’e kaydedilmesi
İş emirlerinin Supabase’e kaydedilmesi
Personellerin Supabase’e kaydedilmesi
Profiles tablosu
useAuth() ile rol bilgisi
Admin / manager / engineer / field rolleri
Rol bazlı ekran erişimi
RoleGuard component
Navigation filtreleme
Supabase RLS politikaları
Şifre değiştirme ekranı
Kullanıcı işlem logları
Audit log tablosu
Offline cache
AsyncStorage desteği
İnternet gelince otomatik senkronizasyon
Online / offline / syncing durum göstergesi


## FAZ 18 — Konum ve Personel Takibi

Bu faz, canlı saha takibi ve personel hareketlerinin izlenmesi için kullanılır.

Eklenecek işler:

Personel profil detay ekranı
Telefon, görev, bölge ve ekip bilgisi
locations tablosu
Belirli aralıklarla canlı konum yazma
Supabase Realtime ile haritada canlı personel pinleri
Gün seçici ile konum geçmişi
Haritada rota çizimi
Polyline gösterimi
Geofence alanları
Bölge çizimi
Bölgeye giriş-çıkış kaydı
Sahte konum / mock location algılama
Mesai başlat / bitir
Mola başlat / bitir
shifts tablosu
QR kod ile lokasyon doğrulama
NFC ile lokasyon doğrulama
Aylık puantaj raporu
Excel / PDF puantaj çıktısı
Konum kapalı uyarısı
Mesai dışında konum takibini kapatma



## FAZ 19— İş Emri Akışı

Bu faz, görevlerin sahada gerçek operasyon akışına uygun ilerlemesini sağlar.

Eklenecek işler:

İş emri durum akışı
Bekliyor
Atandı
Yolda
Başladı
Tamamlandı
İptal edildi
Normal / yüksek / acil öncelik
Acil iş flag’i
Planlanan başlangıç tarihi
Planlanan bitiş tarihi
SLA takibi
Görev devretme
Görev reddetme
Toplu görev atama
Multi-select görev seçimi
Tekrarlayan görevler
Periyodik bakım görevleri
En yakın personele otomatik görev atama
Video kaydı ekleme
Ses kaydı ekleme
Mobil imza
Görev bazlı süre takibi
Timer sistemi
Görev maliyet takibi
Malzeme + süre maliyeti



## FAZ 20 — Gelişmiş Teklif Sistemi

Bu faz, mevcut teklif modülünü profesyonel satış ve operasyon akışına bağlar.

Eklenecek işler:

PDF teklifte POZ + 4 sütun kırılımlı tablo
Teklifi e-posta ile gönderme
Supabase Edge Function
Resend entegrasyonu
Teklif revizyon geçmişi
quote_revisions tablosu
Teklif kabulünden otomatik iş emri oluşturma
Müşteri imzalı kabul ekranı
Paylaşılabilir teklif kabul linki
Teklif şablonları
Kompanzasyon şablonu
YG şablonu
Kablo tava şablonu
Son kullanılan POZ listesi
Hızlı POZ ekleme
Teklif arama
Duruma göre filtreleme
Müşteriye göre filtreleme
Tarih aralığına göre filtreleme

## FAZ 21 — Müşteri ve Lokasyon Yönetimi

Bu faz, müşterilerin saha, lokasyon, geçmiş işlem ve belge yapısını güçlendirir.

Eklenecek işler:

Müşteri sahaları
sites tablosu
Lokasyon kayıtları
Müşteri belge yükleme
Sözleşme yükleme
Supabase Storage
Müşteri geçmişi
Timeline görünümü
Teklif geçmişi
İş emri geçmişi
Ziyaret geçmişi
İş sonrası müşteri memnuniyet puanı
Müşteri portal ekranı
Müşterinin kendi tekliflerini görmesi
Müşterinin kendi işlerini takip etmesi



## FAZ 22— Form ve Kontrol Listeleri

Bu faz, sahadaki tüm denetim, bakım, montaj ve teslimat formlarını dinamik hale getirir.

Eklenecek işler:

Dinamik form modeli
Text alanı
Number alanı
Fotoğraf alanı
İmza alanı
Select alanı
Form render sistemi
Admin form builder ekranı
Hazır form şablonları
Denetim formu
Bakım formu
Arıza tespit formu
Montaj formu
Teslimat formu
İş emrine bağlı form doldurma
Form revizyon geçmişi



## FAZ 23 Stok, Malzeme ve Zimmet

Bu faz, iş emirlerinde kullanılan malzemenin stoktan düşülmesini ve zimmet takibini sağlar.

Eklenecek işler:

materials tablosu
warehouses tablosu
Malzeme CRUD
Depo CRUD
Stok giriş hareketi
Stok çıkış hareketi
Depolar arası transfer
Personel üzerindeki zimmetler
Araç üzerindeki zimmetler
Barkod / QR ile stok okuma
Minimum stok uyarısı
Minimum stok bildirimi
İş emrinde kullanılan malzeme bildirimi
Kullanılan malzemenin stoktan otomatik düşmesi



## FAZ 24 — Araç Takibi

Bu faz, saha operasyonundaki araçları personel ve görevlerle ilişkilendirir.

Eklenecek işler:

vehicles tablosu
Araç CRUD
Araç-personel eşleştirme
Kilometre takibi
Yakıt takibi
Araç bakım tarihleri
Araç muayene tarihleri
Fotoğraflı araç hasar bildirimi
Araç rota geçmişi
Araç lokasyon geçmişi



## FAZ 25— Raporlama ve Dashboard

Bu faz, yönetici tarafında ölçülebilir performans ve saha görünürlüğü sağlar.

Eklenecek işler:

Günlük saha raporu
Her gün otomatik 18:00 rapor oluşumu
Haftalık rapor şablonları
Aylık rapor şablonları
PDF dışa aktarma
Mevcut pdf.ts yapısının genişletilmesi
Excel dışa aktarma
xlsx kütüphanesi
Canlı KPI kartları
Yönetici dashboard ekranı
Grafikler
Line chart
Bar chart
Pie chart
SLA durumu
Geciken işler raporu
Haftalık otomatik e-posta raporu




## FAZ 26 — Bildirim ve İletişim

Bu faz, saha ve yönetim arasındaki anlık iletişim altyapısını kurar.

Eklenecek işler:

Expo Push Notification kurulumu
Push token kayıt sistemi
Yeni iş bildirimi
Gecikme bildirimi
Onay bildirimi
E-posta bildirimleri
Resend Edge Function
SMS entegrasyonu
Netgsm entegrasyonu
İletimerkezi entegrasyonu
WhatsApp Business API webhook
Kullanıcı bazlı bildirim tercihleri ekranı




## FAZ 27— Finans ve Tahsilat

Bu faz, saha personelinin tahsilat yapabildiği ve finansal kayıt tutabildiği yapıyı ekler.

Eklenecek işler:

payments tablosu
Nakit ödeme kaydı
Kart ödeme kaydı
Havale ödeme kaydı
PDF makbuz oluşturma
Müşteri bakiye takibi
Borç / alacak takibi
Saha personeli kasa takibi
E-fatura entegrasyon arayüzü
Logo entegrasyonu
Mikro entegrasyonu



## FAZ 28— Sektörel Modüller

Bu faz, uygulamayı enerji, bakım, denetim ve satış operasyonlarına özel hale getirir.

Eklenecek işler:

Enerji modülü
Sayaç okuma
Pano kontrol formu
Trafo bakım formu
GES saha kontrolü
Periyodik bakım planı
Önleyici bakım
Düzeltici bakım
Cihaz / ekipman geçmişi
Asset tracking
Denetim formu
Uygunsuzluk kaydı
Kalite puanlama
Düzeltici faaliyet
Satış ziyaret formu
Rakip bilgisi kaydı




## FAZ 29 — Yapay Zeka

Bu faz, saha verilerinden otomatik öneri ve analiz çıkarılmasını sağlar.

Eklenecek işler:

Görev açıklamasından otomatik POZ önerisi
OpenAI / Claude entegrasyonu
Fotoğraftan hasar analizi
Fotoğraftan arıza analizi
Ses kaydından otomatik rapor metni oluşturma
Rota optimizasyonu
TSP solver
OR-Tools API
Gecikme anomali tespiti
Performans anomali tespiti



## FAZ 30 — Web Admin Paneli

Bu faz, mobil uygulamanın yanında güçlü bir web yönetim paneli oluşturur.

Eklenecek işler:

Web-only admin layout
Responsive geniş ekran tablo görünümü
Toplu işlem desteği
Multi-select bulk update
Multi-select bulk delete
Her listede gelişmiş filtre
Her listede arama barı
Kullanıcı ve rol yönetim ekranı
Web form tasarım ekranı
Büyük haritalı canlı takip ekranı
Harita yanında detay paneli


## FAZ 31 — Entegrasyon ve Güvenlik

Bu faz, uygulamanın dış sistemlerle konuşmasını ve kurumsal güvenlik gereksinimlerini tamamlar.

Eklenecek işler:

REST API
Supabase Edge Functions
API anahtarı sistemi
Webhook çıktıları
Yeni iş webhook’u
Teklif kabul webhook’u
Excel içe aktarma
Müşteri içe aktarma
POZ içe aktarma
Personel içe aktarma
ERP / CRM entegrasyon adaptör katmanı
Logo adaptörü
Netsis adaptörü
Mikro adaptörü
KVKK aydınlatma metni
KVKK onay akışı
Veri yedekleme cron’u
Restore betiği
2FA / TOTP
Admin için IP kısıtlama
Admin için cihaz kısıtlama
---


## FAZ 32 —
Teklif modülleri
YG trafo işletme sorumlusu teklif hesaplama
Periyodik kontrol fiyatlandırma
Keşif/Metraj (ürün, kablo, hizmet kalemleri)
GES teklif hesaplama
Teklif kaydetme/yükleme (Supabase proposals)
Dashboard: ürün/fiyat verisi analizi, istatistik ekranı
Görev Takip: görev CRUD, durum/öncelik, filtreleme (gorevler)
İş Takip: çalışan-lokasyon-malzeme + iş kayıtları (is_takip_*)
Akaryakıt Takip: araç/sürücü/yakıt kayıtları, dönemsel rapor (vehicles, drivers, fuel_records)
Ürün Takip: envanter, lokasyon, seri no, filtre + PDF (urun_takip)
Haftalık Raporlama: OSOS Excel import, grafik, haftalık rapor (haftalik_raporlar)
OSOS modülü: OSOS raporu + canlı izleme + KOSBI/OSOS entegrasyonu
Bordro (mavi yaka + beyaz yaka): puantaj, avans/gider/prim, aylık hesap, güvenlik odaklı kayıt yönetimi (bordro_*, beyaz_yaka_*)

## FAZ 33 —
Kimlik doğrulama: Kayıt, giriş, email doğrulama, şifre değiştirme/unutma/sıfırlama akışları.
Görev yönetimi: Görev oluşturma, listeleme, güncelleme, silme, detay görüntüleme.
Kanban akışı: Görevler sürükle-bırak ile durum kolonları arasında taşınır (Bekliyor / Devam Ediyor / Tamamlandı vb.).
Öncelik ve termin yönetimi: Düşük–Acil öncelikler, son tarih takibi, gecikmiş görev analizi.
Yorum ve işbirliği: Görev altında yorumlar, @kullanıcı mention sistemi.
Dosya ekleri: Görevlere görsel/PDF/video yükleme.
Email bildirimleri:
görev atama bildirimi,
yorum/mention bildirimi,
yeni kullanıcı kaydı bildirimi,
takvim etkinliği davet ve hatırlatma emailleri.
Analitik dashboard: Toplam görev, durum/öncelik dağılımı, tamamlanma trendi, kullanıcı performans metrikleri.
Takvim modülü: Özel/genel takvimler, etkinlik oluşturma, katılımcı ekleme, hatırlatma zamanlama.
Kullanıcı profili ve yönetimi: Profil güncelleme + admin tarafında kullanıcı listeleme/silme.
Ek yardımcı özellik: Arayüzde entegre SahaTakip chatbot bileşeni.

## FAZ 34 — Kalite, Test ve Yayına Hazırlık

Bu faz, uygulamanın canlı kullanıma güvenli ve stabil şekilde hazırlanmasını sağlar.

Eklenecek işler:

Test altyapısı
Unit test kurulumu
Component testleri
E2E test senaryoları
Kritik iş akışları için test planı
Login / teklif / iş emri / stok / puantaj testleri
Hata yakalama sistemi
Crash reporting entegrasyonu
Performans ölçümleme
Yavaş ekranların tespiti
Supabase sorgu optimizasyonu
Mobil build kontrol listesi
Web build kontrol listesi
Production environment ayrımı
Staging environment ayrımı
Versiyonlama sistemi
Release notları ekranı
Kullanıcı geri bildirim toplama ekranı

## FAZ 35 — Yetkilendirme, Denetim ve Kurumsal Yönetim

Bu faz, uygulamanın şirket içinde farklı rol ve departmanlara güvenli şekilde açılmasını sağlar.

Eklenecek işler:

Gelişmiş rol matrisi
Departman bazlı yetkilendirme
Şube / bölge bazlı veri erişimi
Ekran bazlı izin yönetimi
İşlem bazlı izin yönetimi
Admin onay akışları
Kritik işlemler için çift onay
Silme işlemlerinde onay mekanizması
Kullanıcı aktivite geçmişi
Detaylı audit log ekranı
Veri değişiklik geçmişi
Eski / yeni değer karşılaştırması
KVKK veri erişim logları
Kullanıcı oturum geçmişi
Şüpheli giriş bildirimi

## FAZ 36 — Mobil Saha Deneyimi ve Offline Operasyon

Bu faz, saha personelinin internet zayıfken bile uygulamayı kesintisiz kullanmasını sağlar.

Eklenecek işler:

Offline iş emri görüntüleme
Offline form doldurma
Offline fotoğraf ekleme
Offline imza alma
Offline stok hareketi kaydı
Bağlantı gelince otomatik senkronizasyon
Çakışma çözüm ekranı
Senkronizasyon geçmişi
Saha personeli için sade mod
Tek elle kullanım optimizasyonu
Hızlı işlem butonları
Favori işlemler
Konum doğruluğu göstergesi
Pil tüketimi optimizasyonu
Düşük internet modu

## FAZ 37 — Müşteri Deneyimi ve Dış Paylaşım

Bu faz, müşterilerin teklif, iş emri ve rapor süreçlerine kontrollü şekilde dahil edilmesini sağlar.

Eklenecek işler:

Müşteri portalı geliştirme
Müşteri kullanıcı hesapları
Müşteri bazlı yetki sınırları
Teklif görüntüleme linki
Teklif onay / red akışı
İş emri durum takip linki
Müşteri yorum alanı
Müşteri belge indirme alanı
Servis sonrası memnuniyet anketi
Müşteri bildirim tercihleri
Müşteriye otomatik rapor gönderimi
Paylaşımlı PDF rapor linkleri
Link süre sınırı
Link erişim logları

## FAZ 38 — Gelişmiş Raporlama, BI ve Karar Destek

Bu faz, toplanan saha verilerinin yönetime anlamlı karar desteği sunmasını sağlar.

Eklenecek işler:

Gelişmiş yönetici dashboard
Departman bazlı KPI görünümü
Personel performans analizi
Araç maliyet analizi
Yakıt tüketim analizi
Stok tüketim analizi
Teklif kazanma / kaybetme analizi
Müşteri kârlılık analizi
İş emri tamamlanma süreleri
SLA başarı oranı
Bölge bazlı yoğunluk haritası
Excel pivot uyumlu dışa aktarım
Planlanan / gerçekleşen maliyet karşılaştırması
Aylık yönetim özeti

## FAZ 39 — Kurumsal Entegrasyonların Derinleştirilmesi

Bu faz, uygulamanın muhasebe, ERP, CRM ve dış servislerle gerçek operasyon seviyesinde entegre olmasını sağlar.

Eklenecek işler:

Logo ERP veri aktarımı
Mikro ERP veri aktarımı
Netsis ERP veri aktarımı
Cari hesap senkronizasyonu
Stok kartı senkronizasyonu
Fatura taslak aktarımı
Tekliften sipariş oluşturma
CRM müşteri aktarımı
Webhook yönetim paneli
Webhook deneme ekranı
API anahtarı yönetimi
API kullanım logları
Harici sistem hata kayıtları
Entegrasyon sağlık durumu ekranı

## FAZ 40 — Ölçeklenebilirlik, Bakım ve Ürünleşme

Bu faz, uygulamanın tek şirket içi araçtan sürdürülebilir ve ürünleşebilir bir platforma dönüşmesini sağlar.

Eklenecek işler:

Çoklu firma desteği
Tenant yapısı
Firma bazlı veri ayrımı
Firma bazlı ayarlar
Modül aç / kapat sistemi
Paket bazlı özellik yönetimi
Lisans yönetimi
Kullanım limiti takibi
Veritabanı indeks optimizasyonu
Arşivleme politikası
Eski kayıtları arşive taşıma
Backup izleme ekranı
Restore test prosedürü
Sistem sağlık paneli
Bakım modu


## FAZ 41 — AI Destekli Akıllı Saha Asistanı

Bu faz, uygulamanın sadece kayıt tutan değil, saha operasyonunu yönlendiren akıllı asistana dönüşmesini sağlar.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-109 | AI servis katmanı: Supabase Edge Function üzerinden OpenAI/Claude bağlantısı | ⬜ |
| POZ-DEV-110 | Kullanıcı rolüne göre AI yetki kontrolü | ⬜ |
| POZ-DEV-111 | Kobinerji AI sohbet paneli: web ve mobil ortak bileşen | ⬜ |
| POZ-DEV-112 | Görev açıklamasından otomatik POZ önerisi geliştirme | ⬜ |
| POZ-DEV-113 | AI teklif taslağı oluşturma: müşteri + keşif + POZ + malzeme | ⬜ |
| POZ-DEV-114 | AI iş emri özetleme ve günlük saha raporu metni üretme | ⬜ |
| POZ-DEV-115 | AI müşteri geçmişi özeti: teklif, iş emri, ziyaret, tahsilat | ⬜ |
| POZ-DEV-116 | AI risk analizi: gecikme, SLA, düşük stok, araç bakım uyarısı | ⬜ |
| POZ-DEV-117 | AI işlem logları ve token/maliyet takip ekranı | ⬜ |
| POZ-DEV-118 | AI cevaplarında kaynak gösterme ve kullanıcı onayı zorunluluğu | ⬜ |


## FAZ 42 — Saha Operasyon Mükemmelleştirme

Bu faz, saha personelinin günlük işlerini en hızlı, en az hatayla ve en az ekran gezerek yapmasını sağlar.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-119 | Saha personeli ana ekranı: bugün yapılacak işler, rota, uyarılar | ⬜ |
| POZ-DEV-120 | Tek tıkla mesai başlat, işe git, işi başlat, işi bitir akışı | ⬜ |
| POZ-DEV-121 | Akıllı görev sıralama: konum, öncelik, SLA ve müsaitliğe göre | ⬜ |
| POZ-DEV-122 | Saha checklist zorunlulukları: fotoğraf, imza, form, konum doğrulama | ⬜ |
| POZ-DEV-123 | İş bitirme kalite kontrol ekranı | ⬜ |
| POZ-DEV-124 | Eksik veriyle iş kapatmayı engelleme | ⬜ |
| POZ-DEV-125 | Saha personeli performans puanı: zamanında iş, kalite, müşteri puanı | ⬜ |
| POZ-DEV-126 | Bölge bazlı ekip yönetimi ve vardiya planı | ⬜ |
| POZ-DEV-127 | Acil iş modu: en yakın uygun personele anlık yönlendirme | ⬜ |
| POZ-DEV-128 | Operasyon komuta ekranı: canlı işler, ekipler, araçlar, gecikmeler | ⬜ |


## FAZ 43 — Akıllı Teklif, Keşif ve Metraj Sistemi

Bu faz, teklif sürecini klasik manuel girişten çıkarıp yarı otomatik satış mühendisliği aracına dönüştürür.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-129 | Keşif/metraj form modeli: ürün, kablo, pano, hizmet, işçilik | ⬜ |
| POZ-DEV-130 | Keşiften otomatik teklif kalemi üretme | ⬜ |
| POZ-DEV-131 | POZ kütüphanesi: kategori, birim, işçilik, malzeme, açıklama | ⬜ |
| POZ-DEV-132 | Fiyat listesi versiyonlama | ⬜ |
| POZ-DEV-133 | Kâr oranı, iskonto, genel gider ve risk payı hesaplama | ⬜ |
| POZ-DEV-134 | YG trafo işletme sorumluluğu teklif hesap motoru | ⬜ |
| POZ-DEV-135 | Periyodik kontrol teklif hesap motoru | ⬜ |
| POZ-DEV-136 | GES teklif hesap motoru | ⬜ |
| POZ-DEV-137 | Kompanzasyon teklif hesap motoru | ⬜ |
| POZ-DEV-138 | Teklif karşılaştırma: revizyonlar arası fiyat ve kapsam farkı | ⬜ |
| POZ-DEV-139 | Kazanılan/kaybedilen teklif sebep analizi | ⬜ |
| POZ-DEV-140 | AI destekli teklif iyileştirme önerileri | ⬜ |

## FAZ 44 — Akıllı Harita, Rota ve Canlı Operasyon

Bu faz, saha takibini sadece konum izleme değil, gerçek zamanlı operasyon planlama aracına dönüştürür.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-141 | Canlı operasyon haritası: personel, araç, iş emri, müşteri sahası | ⬜ |
| POZ-DEV-142 | İş emri yoğunluk haritası | ⬜ |
| POZ-DEV-143 | Personel uygunluk durumu: müsait, görevde, molada, offline | ⬜ |
| POZ-DEV-144 | Akıllı rota önerisi: çoklu iş emri için sıralama | ⬜ |
| POZ-DEV-145 | Trafik ve mesafe bazlı tahmini varış süresi | ⬜ |
| POZ-DEV-146 | Rota dışına çıkma uyarısı | ⬜ |
| POZ-DEV-147 | Sahaya varış otomatik algılama | ⬜ |
| POZ-DEV-148 | Sahadan ayrılma otomatik algılama | ⬜ |
| POZ-DEV-149 | Harita üzerinde ekip performans katmanı | ⬜ |
| POZ-DEV-150 | Harita geçmiş oynatma: gün içi operasyon replay | ⬜ |


## FAZ 45 — Kurumsal Kalite, Denetim ve Uygunsuzluk Yönetimi

Bu faz, uygulamayı kalite, iş güvenliği, denetim ve düzeltici faaliyet yönetimi için güçlü hale getirir.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-151 | Uygunsuzluk kayıt modülü | ⬜ |
| POZ-DEV-152 | Düzeltici/önleyici faaliyet yönetimi | ⬜ |
| POZ-DEV-153 | İş güvenliği kontrol listeleri | ⬜ |
| POZ-DEV-154 | Risk değerlendirme formu | ⬜ |
| POZ-DEV-155 | Denetim planlama takvimi | ⬜ |
| POZ-DEV-156 | Denetim puanlama sistemi | ⬜ |
| POZ-DEV-157 | Fotoğraflı uygunsuzluk kanıtları | ⬜ |
| POZ-DEV-158 | Sorumlu atama ve kapanış takibi | ⬜ |
| POZ-DEV-159 | Kalite dashboard: açık uygunsuzluk, kapanma süresi, tekrar oranı | ⬜ |
| POZ-DEV-160 | PDF denetim raporu oluşturma | ⬜ |

## FAZ 46 — Ekipman, Varlık ve Bakım Yönetimi

Bu faz, müşteri sahalarındaki cihaz, pano, trafo, sayaç ve ekipman geçmişini izlenebilir hale getirir.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-161 | Asset/equipment tablosu ve CRUD ekranları | ⬜ |
| POZ-DEV-162 | Ekipman QR kodu oluşturma ve okutma | ⬜ |
| POZ-DEV-163 | Ekipman bakım geçmişi | ⬜ |
| POZ-DEV-164 | Ekipman arıza geçmişi | ⬜ |
| POZ-DEV-165 | Garanti ve servis süresi takibi | ⬜ |
| POZ-DEV-166 | Periyodik bakım planı oluşturma | ⬜ |
| POZ-DEV-167 | Bakım zamanı yaklaşan ekipman uyarısı | ⬜ |
| POZ-DEV-168 | Ekipman bazlı maliyet analizi | ⬜ |
| POZ-DEV-169 | Trafo, pano, sayaç, inverter gibi enerji ekipman tipleri | ⬜ |
| POZ-DEV-170 | Ekipman dijital servis karnesi | ⬜ |


## FAZ 47 — Üst Düzey Yönetim ve Stratejik Dashboard

Bu faz, uygulamayı patron/yönetici seviyesinde karar alma ekranına dönüştürür.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-171 | CEO/Yönetici özet ekranı | ⬜ |
| POZ-DEV-172 | Günlük operasyon sağlık skoru | ⬜ |
| POZ-DEV-173 | Gelir, maliyet, kârlılık KPI kartları | ⬜ |
| POZ-DEV-174 | En kârlı müşteriler analizi | ⬜ |
| POZ-DEV-175 | En maliyetli iş emirleri analizi | ⬜ |
| POZ-DEV-176 | Personel verimlilik sıralaması | ⬜ |
| POZ-DEV-177 | Araç maliyet/verimlilik sıralaması | ⬜ |
| POZ-DEV-178 | Stok devir hızı analizi | ⬜ |
| POZ-DEV-179 | Teklif dönüşüm oranı analizi | ⬜ |
| POZ-DEV-180 | AI yönetici özeti: “Bugün dikkat edilmesi gerekenler” | ⬜ |

## FAZ 48 — Müşteri Portalı 2.0 ve Profesyonel Dış Deneyim

Bu faz, müşteriye kurumsal, güvenilir ve self-servis bir deneyim sunar.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-181 | Müşteri giriş ekranı | ⬜ |
| POZ-DEV-182 | Müşteri dashboard: açık işler, teklifler, raporlar, borç durumu | ⬜ |
| POZ-DEV-183 | Müşteri teklif onay/red ekranı | ⬜ |
| POZ-DEV-184 | Müşteri iş emri takip ekranı | ⬜ |
| POZ-DEV-185 | Müşteri servis talebi oluşturma | ⬜ |
| POZ-DEV-186 | Müşteri belge ve rapor arşivi | ⬜ |
| POZ-DEV-187 | Müşteri memnuniyet ve şikayet kayıtları | ⬜ |
| POZ-DEV-188 | Müşteri bildirim merkezi | ⬜ |
| POZ-DEV-189 | Müşteri portalı marka özelleştirme | ⬜ |
| POZ-DEV-190 | Paylaşımlı link güvenliği: süre, token, erişim logu | ⬜ |

## FAZ 49 — Güvenlik, KVKK ve Kurumsal Dayanıklılık

Bu faz, uygulamanın kurumsal seviyede güvenli, denetlenebilir ve sürdürülebilir olmasını sağlar.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-191 | Hassas veri sınıflandırması | ⬜ |
| POZ-DEV-192 | KVKK veri talep yönetimi | ⬜ |
| POZ-DEV-193 | Kullanıcı verisi dışa aktarma | ⬜ |
| POZ-DEV-194 | Kullanıcı verisi silme/anonimleştirme | ⬜ |
| POZ-DEV-195 | Oturum cihaz yönetimi | ⬜ |
| POZ-DEV-196 | Şüpheli işlem tespiti | ⬜ |
| POZ-DEV-197 | Admin kritik işlem bildirimleri | ⬜ |
| POZ-DEV-198 | Veritabanı yedek doğrulama raporu | ⬜ |
| POZ-DEV-199 | Felaket kurtarma prosedürü | ⬜ |
| POZ-DEV-200 | Güvenlik sağlık skoru ekranı | ⬜ |

## FAZ 50 — Ürünleşme, SaaS ve Çoklu Firma Altyapısı

Bu faz, SahaTakip’i sadece şirket içi uygulama değil, satılabilir profesyonel SaaS ürünü haline getirir.

| POZ | İş | Durum |
|---|---|---|
| POZ-DEV-201 | Tenant/firma yapısı | ⬜ |
| POZ-DEV-202 | Firma bazlı kullanıcı, müşteri, iş emri veri ayrımı | ⬜ |
| POZ-DEV-203 | Firma bazlı modül aç/kapat sistemi | ⬜ |
| POZ-DEV-204 | Paket yönetimi: Basic, Pro, Enterprise | ⬜ |
| POZ-DEV-205 | Lisans başlangıç/bitiş tarihi takibi | ⬜ |
| POZ-DEV-206 | Kullanım limiti: kullanıcı, iş emri, depolama, AI token | ⬜ |
| POZ-DEV-207 | Firma bazlı tema/logo ayarları | ⬜ |
| POZ-DEV-208 | SaaS abonelik ve ödeme entegrasyonu | ⬜ |
| POZ-DEV-209 | Süper admin paneli | ⬜ |
| POZ-DEV-210 | Firma sağlık ve kullanım dashboard’u | ⬜ |


## Çalışma Şekli

1. Her POZ **tek mesaj turunda** bitirilir.
2. Tamamlanan POZ’un karşısına ✅ yazılır.
3. Bağımlılık varsa POZ açıklamasında belirtilir.
4. Bir POZ’u atlamak/öncelemek için: **"POZ-DEV-NNN yap"** denir.

Şu an çalışılan: **Faz 1 ✅ + Faz 2 ✅ + Faz 3 ✅ + Faz 4 ✅ + Faz 5 ✅ + Faz 6 ✅ + Faz 7 ✅ + Faz 8 ✅ + Faz 9 ✅ (POZ-DEV-064..071). Sıradaki: Faz 10 — Bildirim & İletişim**
