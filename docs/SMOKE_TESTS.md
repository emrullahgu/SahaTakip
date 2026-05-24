# SahaTakip — Manuel Smoke Test Matrisi

> POZ-DEV-363..365 Son kullanıcı release öncesi minimal kontrol seti.

## 1. Auth & Oturum

- [ ] Login: doğru e-posta + şifre → Home'a yönlendirir.
- [ ] Login: yanlış şifre → hata toast.
- [ ] Forgot password: e-posta giriş + gönder.
- [ ] Signup: yeni hesap aç.
- [ ] Logout: ProfileScreen → çıkış → Auth stack.

## 2. Müşteri & Teklif

- [ ] CustomersScreen liste açılır, arama çalışır.
- [ ] CustomerFormScreen: yeni müşteri ekle, validation tetiklenir.
- [ ] NewQuoteScreen: kalem ekle / sil, KDV doğru hesap.
- [ ] QuoteDetailScreen → PDF al → cihaz Share sheet.
- [ ] QuoteToOrderScreen: Teklif → Sipariş dönüşümü.

## 3. Sipariş (Ord*, Faz 59)

- [ ] OrdHubScreen KPI'lar doğru.
- [ ] OrdListScreen durum filtre çipleri.
- [ ] OrdFormScreen: yeni sipariş + 3 kalem + Gönder.
- [ ] OrdDetailScreen: durum ilerlet (draft→submitted→…→delivered).
- [ ] OrdRecurringScreen şablon listesi.
- [ ] OrdAnalyticsScreen top 5 ürün barları.

## 4. Saha (Field*, Asset*)

- [ ] FieldTodayScreen: günün işleri.
- [ ] WorkOrderDetailScreen: durum güncelleme.
- [ ] AssetQrScreen: QR kod tarama (cihaz).
- [ ] CheckinScannerScreen: NFC/QR checkin.
- [ ] MapScreen (mobil) harita yüklenir; (web) shim mesajı görünür.
- [ ] GeofencesScreen / LiveTrackingScreen mobilde marker'lar.

## 5. Hata & Bağlantı

- [ ] Uçak modu → ConnectionBanner kırmızı.
- [ ] Bağlantı geri → banner yeşil, sync drain.
- [ ] Beklenmedik exception → ErrorBoundary "Tekrar Dene" ekranı.
- [ ] OfflineQueueScreen kuyruğu görünür.

## 6. Bildirim & Push

- [ ] NotificationsScreen liste.
- [ ] Push permission iste → onay → token görünür (DepStorageScreen).
- [ ] Yerel test bildirimi gönder.

## 7. Yönetici & Raporlar

- [ ] ManagerScreen tüm tile'lar açılır (smoke).
- [ ] ReportsScreen filtreleme.
- [ ] KpiOverviewScreen KPI sayıları yüklenir.
- [ ] AiDailyReportScreen rapor üretimi.

## 8. Multi-tenant & SaaS (Saas*)

- [ ] SaasTenantsScreen tenant değiştirme.
- [ ] SaasBillingScreen lisans bilgisi.
- [ ] SaasUsageLimitsScreen kullanım barları.

## 9. PDF & Paylaşım

- [ ] Teklif PDF → mail eki olarak paylaş.
- [ ] İş emri PDF.
- [ ] Aylık rapor PDF.

## 10. Platform Matrisi

| Akış | Android APK | iOS Build | Web (Chrome) | Web (Safari) |
|------|-------------|-----------|--------------|--------------|
| Login | ⬜ | ⬜ | ⬜ | ⬜ |
| Quote oluştur | ⬜ | ⬜ | ⬜ | ⬜ |
| Sipariş akışı | ⬜ | ⬜ | ⬜ | ⬜ |
| Harita | ⬜ mobil | ⬜ mobil | ⬜ shim | ⬜ shim |
| PDF | ⬜ | ⬜ | ⬜ | ⬜ |
| Bildirim | ⬜ | ⬜ | ⬜ N/A | ⬜ N/A |

## Geri Bildirim Akışı

- Hata bulunca: [GoLiveBugTasksScreen](src/screens/GoLiveBugTasksScreen.tsx) → yeni task → assign + screenshot.
- Crash: cihazdan AuditLogV2Screen / CrashReportsScreen kontrol.
