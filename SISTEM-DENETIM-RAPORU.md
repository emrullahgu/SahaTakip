<!--
SahaTakip — Uçtan Uca Sistem Denetimi
Tarih: 2026-06-09 · Yöntem: 14 boyut × çok-ajanlı tarama + adversarial doğrulama
İstatistik: 183 ajan, 145 doğrulanmış bulgu, 23 yanlış pozitif elendi, ~23 dk, 2071 araç kullanımı
Commit: 75f0c59 (main)
-->

# SahaTakip — Sistem Denetim Raporu

## 1. Yönetici Özeti

SahaTakip işlevsel olarak geniş ve mimari temeli sağlam bir saha servis SaaS'i; tip kontrolü temiz, 235 test geçiyor ve teklif/para matematiği büyük ölçüde tek-kaynaktan tutarlı. Ancak üretime (Android APK) çıkış açısından **birbirini besleyen kritik güvenlik ve doğruluk açıkları** mevcut: herhangi bir kullanıcı kendi rolünü `admin` yapabiliyor (RLS yetki yükseltme), 14 tablo RLS olmadan public şemada açık, canlı LLM/Apollo API anahtarları client bundle'a gömülüyor ve `app_settings`'ten tüm kullanıcılara okutuluyor, çok-kiracılık (tenant izolasyonu) pratikte yok. Gereksinim 3'ün (AI kusursuz + asla yalan söyleme) en görünür ihlali: kullanıcıların ana sohbet ekranları (AiChatScreen/CoPilotScreen) ajanı hiç kullanmıyor, model "oluşturdum/tamamladım" diyebilirken DB'ye hiçbir şey yazılmıyor; ayrıca standalone APK'da push token `projectId` daima `undefined` olduğundan bildirim (G7) sessizce çöküyor.

**Net karar: Hazır değil.** Önce güvenlik (yetki yükseltme, RLS, sır rotasyonu) ve AI dürüstlüğü (fire-and-forget yazımlar, sohbet-ajan kopukluğu) kapatılmadan üretime çıkılmamalı. Bu maddeler giderildiğinde sistem "küçük düzeltmelerle hazır" seviyesine gelebilir.

## 2. Kritik & Yüksek Öncelikli Bulgular

| Önem | Başlık | Dosya:Satır | Gereksinim | Sorun | Öneri |
|------|--------|-------------|------------|-------|-------|
| critical | Yetki yükseltme: kullanıcı kendi role'ünü admin yapabilir | supabase/schema.sql:206-208 | genel | `profiles_update_own` `for update using (id=auth.uid())` — WITH CHECK ve sütun kısıtı yok; doğrudan UPDATE ile `role='admin'`, `approval_status='approved'` yazılabilir. Self-kayıt açık olduğundan dışarıdan biri kayıt olup admin olabilir. | BEFORE UPDATE trigger ile role/approval_status/approved_by'ın OLD ile aynı kalmasını zorla; değişimi yalnız SECURITY DEFINER RPC'lere bırak. WITH CHECK ekle. |
| critical | 14 tablo RLS olmadan public şemada açık | supabase/schema.sql:1182-1197 | genel | two_factor, access_rules, kvkk_*, backups, app_users, customer_sites/documents/ratings, voice_reports, damage_analyses, reports, report_preferences, form_response_revisions hiç RLS almamış; PostgREST üzerinden anon/authenticated okuyup yazabilir (2FA secret, KVKK rızası sızar). | 14 tabloya `enable row level security` + rol/tenant politikaları; hassas tabloları yalnız service_role/admin'e aç. Migration ile RLS'siz public tablo kalmadığını doğrula. |
| critical | LLM API anahtarları client bundle'a gömülüyor (EXPO_PUBLIC_*) | src/services/ai.ts:74-77,171-174 | 3 | Gerçek OpenAI/Claude/Gemini/Groq anahtarları `EXPO_PUBLIC_*_KEY`'den okunup client'tan doğrudan sağlayıcıya gidiyor; bu prefix web/Android bundle'a derlenir ve trivial çıkarılır. ai-proxy var ama atlanıyor. | Tüm LLM çağrılarını yalnız ai-proxy/ai-tools edge function üzerinden yap; `EXPO_PUBLIC_*_KEY` ve .env fallback'ini kaldır; ifşa olmuş anahtarları rotate et. |
| critical | AI sağlayıcı anahtarları app_settings'te tüm kullanıcılara okunabilir | supabase/schema.sql:1589-1591 | 3 | `app_settings_read_all_auth` `using (auth.role()='authenticated')`; ai.ts düz metin `value.apiKey`/`value.keys` saklıyor. En düşük yetkili hesap `select value from app_settings` ile canlı anahtarları çeker. | Sırları app_settings'ten çıkar; yalnız edge secrets'ta tut. Gerekirse sır satırlarını yalnız admin'e açan ayrı politika/tablo kullan. |
| high | exec_readonly_sql aslında salt-okunur değil | supabase/migrations/20260608000000_ai_sql_regex_fix.sql:7-60 | genel | SECURITY DEFINER (superuser) ile çalışır; SET TRANSACTION READ ONLY / salt-okunur rol / default_transaction_read_only yok. Tek koruma kara-liste regex. | Yalnız SELECT yetkili düşük-ayrıcalıklı rol; `set local default_transaction_read_only=on`; kara-liste yerine beyaz-liste. SECURITY DEFINER kaldır. |
| high | exec_readonly_sql forbidden regex atlatılabilir | supabase/migrations/20260608000000_ai_sql_regex_fix.sql:35-50 | genel | CTE-yazma, dblink, SELECT alt-sorgusundan SECURITY DEFINER yazma RPC çağrısı (`where (select set_user_role(...)) is null`) regex'e takılmaz. | Gerçek salt-okunur rol/transaction + PG parser ile tek SELECT/beyaz-liste tablo doğrulaması; yazma fonksiyonlarının EXECUTE'unu kaldır. |
| high | exec_readonly_sql AI şeması dışındaki TÜM tabloları okuyabilir | supabase/functions/ai-sql/index.ts:159-160 | 3 | SECURITY DEFINER RLS'i bypass ettiğinden auth.users, two_factor, einvoice_config, payments fiziksel olarak okunabilir; AI yalnız prompt ile kısıtlı. | Beyaz-listedeki view'lara sınırla; auth/storage/vault ve hassas public tablolara erişimi engelle. |
| high | profiles_update_own rol/onay değişimini engellemiyor | supabase/schema.sql:206-208 | genel | WITH CHECK yok; set_user_role RPC'si tek yol değil, doğrudan UPDATE ile rol değişir. | Sütun-bazlı kısıt/trigger + WITH CHECK ekle. |
| high | gchat-webhook imza doğrulaması opsiyonel; AI agent kimliksiz tetiklenebilir | supabase/functions/gchat-webhook/index.ts:29,174-181,240-241 | genel | `--no-verify-jwt`; SHARED_TOKEN tanımsızsa doğrulama bloğu komple atlanır. Saldırgan service_role ile DB aksiyonu yapan ai-tools agent'ini serbestçe tetikler. | GCHAT_BOT_TOKEN'i zorunlu kıl veya Google Bearer JWT'yi public key ile doğrula; sabit-zamanlı karşılaştır. |
| high | ai-tools/ai-sql/ai-proxy: sunucu tarafında yetki/rol kontrolü yok | supabase/functions/ai-tools/index.ts:528-543 | 3 | Gerçek DB yazma yapar, service_role ile RLS bypass; yalnız geçerli JWT yeter. Anon key geçerli JWT olduğundan client-side hasPermission tamamen bypass edilir — 'field' rolü teklif/iş emri oluşturup toplu bildirim atabilir. | Her AI fn başında `supabase.auth.getUser` ile doğrula, rol/aksiyon kontrolü yap; anon key (apikey==access_token) çağrılarını reddet. |
| high | Operasyonel/finansal tablolarda owner-bazlı olmayan RLS | supabase/migrations/20260610000000_rls_harden_open_tables.sql:36-39 | genel | payments, cash_entries, einvoice_records, api_keys, webhooks, erp_adapters dahil çoğu tablo `using (auth.uid() is not null)` — her oturum tüm finans/entegrasyon sırrını okuyup yazabilir. | Finansal ve sır içeren tabloları role-bazlı (admin/manager) daralt; field/engineer erişememeli. |
| high | create_customer alan uyumsuzluğu: 'name' yazılıyor, sistem 'shortName' bekliyor | src/services/agent/tools.ts:498-512 | 3 | Customer'da `name` yok; mappers `short_name: c.shortName` → undefined gider. Bozuk müşteri kaydı; ajan "oluşturuldu" der ama kayıt kullanılamaz. | Handler'ı `shortName`/`title` ile doldur; `as any` cast'ini kaldır ki tip yakalasın. |
| high | Write tool'ları fire-and-forget — DB insert sonradan başarısız olsa bile ajan ok:true | src/context/AppContext.tsx:312-321 | 3 | addQuote/addCustomer/setQuoteStatus repo.insert'i await etmeden .catch ile yutar; handler hemen ok:true döner. RLS/ağ reddederse ajan yazılmamış teklifi "oluşturdum" diye raporlar. | Yazımı await edip gerçek sonucu tool sonucuna yansıt; insert hatasında ok:false + açık mesaj. |
| high | Teklif numarası quotes.length ile üretiliyor — silme sonrası çakışma | src/context/AppContext.tsx:306-310 | 3,5 | `quotes.length+1`; silme sonrası aynı numara tekrar üretilir, iki teklif aynı resmi numarayı taşır; hızlı ardışık kayıt aynı numarayı alabilir. | Monoton/benzersiz kaynak (max sıra eki +1 veya DB sequence); DB benzersizlik kısıtı ekle. |
| high | İş emri ID'si workOrders.length ile üretiliyor — kabul akışında çakışma | src/context/AppContext.tsx:387 | 3 | `IE-${yıl}-${workOrders.length+1}`; silme/eşzamanlı kabul ile aynı ID, ikinci insert çakışır/gölgeler, generatedWorkOrderId yanlış bağlanır. | newUuid()/benzersiz sıra kullan; ID üretimini liste uzunluğundan ayır. |
| high | Teklif tekrar-kabul koruması yok — aynı tekliften birden çok iş emri | src/context/AppContext.tsx:380-440 | 3 | acceptQuoteAndCreateWorkOrder zaten kabul edilmiş teklifte de çalışır; paylaşılan link + doğrudan çağrı ile çift iş emri üretir, acceptedAt/generatedWorkOrderId üzerine yazılır. | Başta idempotent guard: `if (q.generatedWorkOrderId || q.status==='Kabul Edildi' || 'Faturalandırıldı') return ...`. |
| high | Timer durunca iş emri malzeme maliyeti/karı iskonto ve marjı yok sayarak bozuluyor | src/services/workOrderFlow.ts:151-162 | 3 | recomputeWorkOrderCosts materialCost'u `price*qty` (iskontosuz) yeniden hesaplar; NewServiceScreen'in doğru kaydettiği materialCost/profit timer durunca yanlış değerle ezilir, discountPct yok sayılır. | recompute'ta `price*qty*(1-discountPct/100)` kullan; quoteAmount kullanıcı-belirlediyse onun üzerinden koru. |
| high | Tahsilat (payments) create/update/delete tamamen audit'siz | src/services/payments.ts:98-159 | 5 | createPayment/updatePayment/deletePayment hiç auditRepo.log çağırmıyor; mali kayıt değişimi denetim izi bırakmadan gerçekleşir. | Üçünde de `payment.create\|update\|delete` audit log'u ekle (amount/status/method meta). |
| high | Tahsilat düzenleme/silme hiç bildirim üretmiyor | src/screens/PaymentFormScreen.tsx:118-142 | 7 | Notify.paymentReceived yalnız yeni+received'da; tutar/durum değişimi veya silmede ekibe bildirim yok. | Güncelleme/silme yollarına da Notify.* (payment_updated/cancelled) ekle. |
| high | Kasa hareketleri (cashRegister) audit ve bildirim bırakmıyor | src/services/cashRegister.ts:73-103 | 5 | addEntry/deleteEntry nakit giriş/çıkış/silme yapar ama audit/Notify yok; mali hareketler izsiz. | `cash.entry.create\|delete` audit log'u ekle. |
| high | Stok hareketleri ve bakiye güncellemeleri audit'siz | src/services/stock.ts:176-227 | 5 | addMovement + applyDelta stok değişimi yapar, audit yok; stok çıkışı/sayım düzeltmesi izsiz. | `stock.movement.<kind>` audit log'u ekle (materialId/qty/warehouse meta). |
| high | Bordro (payroll) ve izin kayıtları audit'siz | src/services/payrollHr.ts:64-131 | 5 | upsertPayrollRecord/createLeaveRequest/deleteLeaveRequest/decideLeaveRequest/linkEmployeeToUser audit'siz; hassas İK işlemleri izsiz. | payroll/leave/employee.link audit log'u ekle; maaşta gross/net meta. |
| high | Denetimsiz mutasyon servisleri sistematik (yapısal boşluk) | src/services/data/auditRepo.ts:27-41 | 5 | auditRepo.log yalnız 4 dosyadan çağrılıyor; insert/update/delete yapan 43 servis var (salesVisits, warehouses, energyReadings, inspections, formResponses, maintenancePlans...). | Audit'i Repository katmanında merkezileştir; en azından mali/operasyonel kritik servislere zorunlu logging. |
| high | Push token kaydı yalnız manuel buton; açılış/login'de otomatik kayıt yok | src/services/pushNotifications.ts:40-72 | 7 | registerForPushNotifications yalnız Tercihler ekranındaki butondan çağrılıyor; App/Auth'ta otomatik kayıt yok. push_tokens çoğu kullanıcıda boş; notifyEveryone sessizce 0 gönderir. | Login sonrası ve foreground'da otomatik registerForPushNotifications + token upsert. |
| high | notifications RLS herkese açık — başkasının bildirimleri okunabilir/silinebilir | supabase/migrations/20260610000000_rls_harden_open_tables.sql:19-41 | 7 | `using (auth.uid() is not null)`, user_id kısıtı yok; markRead/deleteNotification sadece id'ye göre, güvenliği RLS'e bırakıyor — başkasının bildirimi okunup silinebilir. | Per-user RLS: `using (user_id=auth.uid())`. |
| high | push_tokens RLS herkese açık — tüm cihaz token'ları sızıyor | supabase/migrations/20260610000000_rls_harden_open_tables.sql:19-41 | 7 | Oturumlu herkes tüm Expo push token'larını okur; Expo push endpoint auth gerektirmez → spoof/spam push. | SELECT politikasını `user_id=auth.uid()` ile sınırla; cross-user okuma yalnız service_role. |
| high | E-posta yayını tüm auth kullanıcılarına gider, e-posta opt-out yok sayılır | supabase/functions/notify-push/index.ts:121-150 | 7 | notifyEveryone email:true; channelEnabled.email=false (varsayılan kapalı) kontrol edilmez. Herkes her işte spam mail alır, Resend kotası tükenir. | E-postayı opt-in yap; rutin olaylarda toplu mail yerine yalnız kritik (sla_breach). |
| high | Çok sayıda mutasyon bildirim tetiklemiyor (eksik kapsam) | src/context/AppContext.tsx:323-357,454-488,748 | 5,7 | updateQuote, deleteQuote, setQuoteStatus, updateCustomer, deleteCustomer, addOrder/deleteOrder, deleteWorkOrder, updateWage, puantaj — audit var ama Notify yok; silmeler sessizce. | Tüm update/delete'lere Notify.* ekle; silme/güncelleme event tipleri tanımla. |
| high | Teklif kabulünden üretilen iş emri loglanmıyor (work_order.create eksik) | src/context/AppContext.tsx:380-440 | 5 | acceptQuoteAndCreateWorkOrder iş emri insert eder ama yalnız 'quote.accept' loglanır; work_order.create audit + Notify.workOrderCreated yok (manuel addWorkOrder ikisini de yapıyor — tutarsız). | Insert sonrası work_order.create audit + Notify.workOrderCreated ekle. |
| high | ShiftHistory PDF'inde @page margin:0 YOK | src/screens/ShiftHistoryScreen.tsx:243-265 | 4 | Mesai Geçmişi PDF'inde @page kuralı eksik; web print tarayıcı tarih/saat/URL/başlık basar — G4 doğrudan ihlali. | `<style>` başına `@page { size:A4; margin:0; }` ekle. |
| high | Teklif tutar motoru (calcLineTotal/calcQuoteTotals) hiç test edilmemiş | src/context/AppContext.tsx:53-85 | 3 | Tüm tekliflerin parasını hesaplayan ana fonksiyonlar (6+ çağrı + PDF + agent) hiçbir birim testine sahip değil; çarpan/yüzde/KDV regresyonu tüm teklifleri bozar, hiçbir test yakalamaz. | calcLineTotal/calcQuoteTotals için birim testi yaz (iskonto+overhead+kar+KDV, withDismantle, qty>1, boş liste, yuvarlama). |
| high | syncDrain.applyOp (offline→online uzlaştırma) hiç test edilmemiş | src/services/data/syncDrain.ts:54-120 | 5 | keyCol work_orders'ta 'number' diğerlerinde 'id', soft/hard delete dalı, quote_lines sil-ekle, created_by çıkarma — hataya açık ama test yok; regresyon = saha işinin kalıcı kaybı. | Supabase mock ile her tablo+aksiyon için doğru kolon/soft-hard delete/quote_lines/created_by testleri yaz. |
| high | Yıkıcı agent yazma tool'ları (delete_work_order/delete_customer/create_customer) test edilmemiş | src/services/agent/tools.ts:478-573 | 3 | tools.test.ts yalnız match_poz_bulk/set_quote_status/create_quote_draft'ı kapsıyor; gerçek silme/oluşturma tool'ları test dışı — yanlış hedefleme veri kaybı üretir. | Stub context ile doğru callback çağrısı, var olmayan id'de ok:false, eksik alanda hata testleri yaz. |
| high | refresh() boş listeyi yutuyor — sunucu boşaldığında stale state | src/context/AppContext.tsx:179-182 | 1 | `if (q.length) setQuotes(q)`; RLS hepsini gizlerse/temiz hesapta UI önceki oturumun verisini gösterir → silinmiş/erişimsiz veri gerçek sanılır. | Koşulu kaldır; list() başarılıysa boş olsa da set et; hatada eski state korunsun (boş vs hata ayır). |
| high | gmail-webhook imza doğrulaması yok, service_role ile yazar | supabase/functions/gmail-webhook/index.ts:40-59 | genel | `--no-verify-jwt`, Pub/Sub OIDC doğrulanmaz; herkes POST atıp sahte inbox_messages enjekte eder (depolama doldurma). | OIDC token doğrula veya paylaşılan secret header kontrolü ekle. |
| high | Optimistic update geri alma yalnız deleteQuote'ta; insert/update'lerde yok | src/context/AppContext.tsx:312-331 | 3 | addQuote/updateQuote/addWorkOrder/setQuoteStatus başarısızlıkta yalnız toast; state geri alınmaz → bulut yazmadı ama UI "kaydedildi" gösterir. | deleteQuote'taki snapshot+rollback'i diğerlerine uygula veya 'senkron bekliyor' işaretle. |

## 3. Orta & Düşük Bulgular

**AI Ajan (G3) — orta/düşük**
- Ana sohbet ekranları (CoPilotScreen:41-76, AiChatScreen) ajanı kullanmıyor; yalnız düz-metin askCopilot — model "yaptım" der, DB'ye yazmaz. Sistem promptuna "işlem yapamazsın, Ajan Konsolu'na yönlendir" kuralı ekle veya sohbeti tool-calling akışına bağla.
- Destructive tool'larda rol/yetki kontrolü yok (loop.ts:177-188), yalnız UI onayı; AgentContext'e currentUserRole + canPerform geç.
- Prompt-enjeksiyon yüzeyi (webTools.ts:178-208): fetch_url dış içeriği ham olarak loop history'ye girip gmail_send/whatsapp_send tetikleyebilir; untrusted bağlam + onayda tam gövde göster.
- update_work_order_status status normalize etmiyor (tools.ts:515-535); şema gerçek enum/geçişlerle hizalansın, izinli hedefler dönsün.
- set_quote_status/quote değişiklikleri Notify üretmiyor (AppContext:348-357) — G7.
- Boş/yarım LLM yanıtında loop uydurma "final" üretebilir (loop.ts:125-155); finish tool zorunlu kılınsın.
- Agent meta'sı tutulmuyor (tools.ts:1066-1074): AgentConsole ctx'e currentUserName geçmiyor; source:'agent' + tool adı audit'e eklensin.
- aiAssistant.generateQuoteDraft gerçek DB teklifi oluşturmuyor, yalnız AsyncStorage (aiAssistant.ts:249-295); sahte telemetri (random durationMs/cost).

**Güvenlik (RLS/SQL/Edge) — orta/düşük**
- ai-sql edge fonksiyonu kimlik/yetki doğrulamıyor, CORS '*' (ai-sql/index.ts:141-160).
- channel_messages/ai_documents authenticated herkese açık — tenant sızıntısı (ai_rag.sql:122-141).
- exec_readonly_sql statement_timeout yok, pahalı sorgu DoS (regex_fix.sql:53-57).
- Sahip/rol kontrolleri tenant içermez — cross-read (schema.sql:211-272).
- locations UPDATE/DELETE politikası yok — sessiz başarısızlık, KVKK silme çalışmaz (schema.sql:366-371).
- ai_messages/inbox_messages `with check (true)` — başkasının conversation'ına yazma (ai_rag.sql:133-137).
- apollo-proxy açık proxy, body.apiKey, path whitelist yok (apollo-proxy/index.ts:30-65).
- gmail-send/gchat-send `--no-verify-jwt` ile açık — kimliksiz mail/mesaj (gmail-send/index.ts:21,146-152).
- WhatsApp webhook varsayılan verify token koda gömülü, X-Hub-Signature yok (whatsapp-webhook/index.ts:20,30-33).
- Google Maps API anahtarı netlify.toml'da hardcoded, repoda commit'li (netlify.toml:16) — low.

**Doğruluk / Veri & Offline — orta/düşük**
- Periyodik şablonlar mount'ta tetikleniyor, çift üretim yarışı (AppContext:203-210).
- customersRepo offline insert cache'e yazmıyor (customersRepo.ts:37-45).
- Offline'da audit_log ve notifications hiç yazılmıyor (auditRepo.ts:28-30) — G5 offline ihlali.
- Drain'de non-uuid dışı kalıcı hatalar sonsuz retry (syncDrain.ts:35-46); attempts/backoff yok.
- İki paralel offline sistem; mock runSync yalan başarı verir (offline.ts:76-98) — low.
- enqueueSync idempotent değil — çift DB satırı (repository.ts:146-150) — low.
- Quote/WO update offline'da cache güncellemiyor (quotesRepo.ts:74-78) — low.
- Para hesaplarında yuvarlama yok, float artıkları grandTotal'e sızıyor (AppContext:53-85) — low.
- WorkOrderDetail AI hedefinde wo.customerName çoğu zaman boş (WorkOrderDetailScreen.tsx:415) — low.
- Teklif edit'inde recordRevision çağrılmadan revision++ (NewQuoteScreen.tsx:158-176) — low.
- NewServiceScreen bağımsız yuvarlama → quoteAmount-maliyet≠profit (NewServiceScreen.tsx:325-373) — low.
- delete optimistik snapshot stale closure'dan (AppContext:333-346) — low.

**Kayıt Bütünlüğü (G5) — orta/düşük**
- assets CRUD audit/Notify bırakmıyor (assets.ts:87-129).
- vehicleDamages audit'siz (vehicleDamages.ts:89-114).
- materials upsert/delete audit'siz, fiyat değişimi izsiz (materials.ts:85-111).
- toggleAttendance loglanmıyor, bordroyu etkiler (AppContext:264-284).
- add_suggestion audit/Notify dışında (tools.ts:706-716) — low.

**Bildirimler (G7) — orta/düşük**
- notify-push 'all:true' opt-out tercihlerini yok sayar (notify-push:88-117).
- Tanımlı ama hiç çağrılmayan emitter: quoteSent/quoteAccepted/slaBreach (notifications.ts:351-366); SLA için cron yok.
- notify-push'ta yetki yok — herhangi oturumlu kullanıcı herkese yayın yapar (notify-push:67-94).
- userNames ile hedefleme full_name eşleşmesine dayanır — yanlış/sessiz yönlendirme (notify-push:79-85).
- Yeni mesaj bildirimleri opt-out'a tabi değil, generic 'custom' tipi (messaging.ts:224-233).
- Atanan kişi çift bildirim alıyor (notifications.ts:323-342) — low.
- excludeUserId getCurrentUser hatasında çalışmaz (notifications.ts:302-312) — low.

**PDF (G4) — orta/düşük**
- ManagerCommandCenter raporu @page yok (ManagerCommandCenterScreen.tsx:396-420).
- AttendanceReport ekran PDF'inde @page yok — pdf.ts varyantıyla tutarsız (AttendanceReportScreen.tsx:123-139).
- Servis Formu öncesi/sonrası foto + imza uzak URL gömüyor → native print'te boş/kırık (workOrderPdf.ts:107-108,118).
- Web print sabit 400ms timeout, görseller yüklenmeden basabilir (pdf.ts:32).
- Regresyon testi yalnız 1/9 şablonu kapsıyor (pdfBrand.test.ts:26-48).
- activityPdf firma adı esc'siz (activityPdf.ts:61) — low.
- Servis Formu fotoğraflarında page-break-inside:avoid yok (workOrderPdf.ts:49-51) — low.
- ManagerCommandCenter pgbrk var ama @page yok — çok sayfada kirli (ManagerCommandCenterScreen.tsx:417) — low.

**Mobil & UI (G1,G2) — orta/düşük**
- Sistemik: 102 form ekranında KeyboardAvoidingView yok — klavye input/Kaydet'i kapatıyor (NewServiceScreen/TaskFormScreen/PaymentFormScreen).
- NewQuoteScreen 4-sütun fiyat editöründe 8-9px okunamaz yazı + dar dokunma (NewQuoteScreen.tsx:1157-1172).
- NewQuoteScreen alt-sheet aramaları klavye ile kapanabilir (1353-1362) — low.
- Yaygın 8-10px yazı tipleri okunabilirlik altında (theme.ts:115) — low.
- İkon-buton dokunma hedefleri <44px, hitSlop yok (NewQuoteScreen.tsx:494-496 vd.) — low.
- Tema modül-yüklemede donuyor, anlık geçiş yok (theme.ts:38-58) — low.
- Alt-sheet modalları inset hesaba katmıyor (NewQuoteScreen.tsx:1353-1362) — low.
- Multiline başlık tek-satır görünüyor, textAlignVertical yok (NewQuoteScreen.tsx:308-317) — low.
- Sabit genişlikli etiket sütunları dar grafiklerde sıkışır (KpiOverviewScreen.tsx:173) — low.

**Tip Güvenliği — orta/düşük**
- quote→workOrder materials `as any` ile zorlanıyor (AppContext:394-400) — eksik alan riski gizleniyor.
- AI yanıtları `json:any` parse, tool çağrıları şekil doğrulamasız (ai.ts:1017-1099).
- useAppContext()/useNavigation() `as any` 17+ ekranda (VisionScannerScreen.tsx:32 vd.).
- aiRouter/ai.ts proxy yanıtı `as any` (aiRouter.ts:216, ai.ts:250).
- create_quote_draft Number() ile NaN riski (tools.ts:1020-1049).
- ChatbotFAB @ts-ignore route param (ChatbotFAB.tsx:71-72); webTools @ts-ignore env (webTools.ts:19-33).

**Performans — orta/düşük**
- AppContext value her render'da yeniden üretiliyor — 87 tüketici toptan re-render (AppContext:777-820).
- Toast state veri provider'ında — her 3.5sn'de iki render dalgası (AppContext:149-163).
- AuthContext value memoize değil (AuthContext.tsx:263-281).
- WorkOrdersScreen/ManagerScreen ağır filter/reduce memoize edilmemiş (WorkOrdersScreen.tsx:47-76; ManagerScreen.tsx:93-113).
- WorkOrdersScreen renderItem'da O(n) find (171-234).
- messaging.getOrCreateDirect N+1 (messaging.ts:132-135); recurringTasks N+1 upsert (recurringTasks.ts:131-135); upsert/delete tüm tabloyu çekiyor (68-85); listMessages tüm profilleri çekiyor (170-173).
- Her aksiyonda çift/üçlü bildirim sevkiyatı (notifications.ts:318-345); refresh delta'sız tam-tablo (AppContext:166-188).

**Test Kapsamı (G6) — orta/düşük**
- CRUD→audit+bildirim zincirini doğrulayan test yok (AppContext:259-471).
- *FromRow mappers test edilmemiş (mappers.ts:11-147).
- fx.getFxRates async yol test edilmemiş (fx.ts:104-148).
- enqueueSync/getSyncQueue/isOnlineMode test edilmemiş (repository.ts:146-164).
- NewServiceScreen kar hesabı saf fonksiyona çıkarılmamış/test yok (NewServiceScreen.tsx:325-330).
- expenses.ts/vehicles.ts test edilmemiş (expenses.ts genel).
- Agent loop runtime (runAgent) test edilmemiş (loop.ts:84-209).
- Repo online create/update yolları test edilmemiş (quotesRepo.ts genel).
- Coverage gate yok (package.json) — low.

**Ölü Kod & Tutarlılık — orta/düşük**
- AI ajanı başarısız DB yazımında bile başarı diyor (tools.ts:498-511,553-557) — G3.
- AppContext approveReport/clientAccept koşulsuz başarı toast'ı (AppContext:215-243) — G3.
- Merkezi logger sink ölü, ~100 ham console.warn (logger.ts:18,22,60).
- formatCurrency kullanılmıyor, 180 dosyada elle tekrar (i18n/index.ts:67).
- localDateISO ölü, ~25 yerde UTC-kayması buggy desen (date.ts:8; NewQuoteScreen:184 vd.).
- 36 boş catch ile sessiz hata yutma (FinanceHubScreen.tsx:61).
- i18n modülü tamamen ölü (i18n/index.ts:1-77) — low.
- silenceWarnings.ts ölü (silenceWarnings.ts:21) — low.
- triggerWeeklyEmail ölü stub (reportSchedule.ts:69-75) — low.
- tsconfig noUnusedLocals kapalı (tsconfig.json) — low.

**Build & Dağıtım — orta/düşük**
- .env'de canlı LLM/Apollo anahtarları, "iptal et" notu mevcut (.env:25-36) — high.
- Google Maps anahtarı app.json/eas/netlify vs .env tutarsız, düz metin gömülü (app.json:29, .env:17).
- EXPO_PUBLIC_SITE_URL eas.json'da yok — APK auth-redirect native scheme'a düşer (eas.json:20-36).
- expo-updates kurulu/reloadAsync çağrılıyor ama runtimeVersion/updates yapılandırması yok (app.json) — low.
- Sürüm kaynakları çelişiyor (app.json 1.0.4/vc5, package.json 1.0.0, android/ vc1) — low.
- .env.example bazı EXPO_PUBLIC değişkenlerini belgelemiyor (.env.example) — low.
- Mikrofon izni iki kaynaktan (app.json:25,74-79) — low.

## 4. 7 Üretim Gereksinimi Durum Karnesi

1. **Mobil uyumlu/responsive (Android APK)** — ⚠️ Eksik var — Tema/safe-area/FlatList temeli sağlam ama 102 form ekranında KeyboardAvoidingView yok (klavye input/Kaydet'i kapatıyor); refresh() boş listeyi yutarak stale veri gösteriyor.
2. **Modern + basit UI** — ⚠️ Eksik var — Tutarlı token'lar var ama yaygın 8-10px okunamaz yazılar, <44px dokunma hedefleri, NewQuoteScreen fiyat editöründe ciddi okunabilirlik sorunu.
3. **AI agent kusursuz / asla yalan söylememe** — ❌ Sorunlu — Ana sohbet ekranları ajanı hiç kullanmıyor (model "yaptım" der, yazmaz); write tool'ları fire-and-forget ok:true döner; create_customer bozuk kayıt yazar; tutar motoru test edilmemiş; numara/ID çakışmaları + tekrar-kabul; client'a gömülü anahtarlar.
4. **PDF markalı + temiz** — ⚠️ Eksik var — Servis katmanı şablonları doğru ama 3 ekran PDF'inde @page margin:0 yok (tarayıcı tarih/URL basar), Servis Formu foto/imzayı uzak URL gömüyor.
5. **Eksiksiz kayıt (audit + notifications)** — ❌ Sorunlu — auditRepo.log yalnız 4 dosyada; payments/cash/stock/payroll dahil 43 servis audit'siz; offline'da audit/notification hiç yazılmıyor; teklif-kabul iş emri loglanmıyor.
6. **Her ekran tek tek test** — ❌ Sorunlu — 652 kaynağa 28 test; calcQuoteTotals, syncDrain, yıkıcı agent tool'ları, CRUD→audit zinciri test edilmemiş; coverage gate yok.
7. **Yapılan her işte herkese bildirim** — ❌ Sorunlu — Standalone APK'da projectId undefined → push sessizce çöker; otomatik token kaydı yok; çoğu update/delete Notify üretmiyor; notifications/push_tokens RLS herkese açık.

## 5. Öncelikli Aksiyon Planı

1. **Yetki yükseltmeyi kapat** (schema.sql:206-208): profiles UPDATE'e WITH CHECK + BEFORE UPDATE trigger ile role/approval_status/approved_by'ı kilitle. *Etki: kritik kimlik/yetki açığını tamamen kapatır; sistemin en tehlikeli açığı.*
2. **14 RLS'siz tabloyu kapat + sırları çıkar** (schema.sql:1182-1197, 1589-1591): enable RLS + rol/tenant politikaları; AI anahtarlarını app_settings'ten çıkarıp edge secrets'a taşı. *Etki: kitlesel veri/PII sızıntısını ve sır ifşasını durdurur.*
3. **İfşa olmuş tüm anahtarları rotate et + client'tan kaldır** (.env:25-36, ai.ts:74-77): EXPO_PUBLIC_*_KEY sil, tüm LLM çağrılarını ai-proxy'ye al. *Etki: canlı LLM/Apollo anahtarlarının kötüye kullanımını engeller.*
4. **AI dürüstlüğünü garanti et** (AppContext:312-321, tools.ts:498-512): write tool'larını await edip gerçek sonucu döndür (ok=repo başarısı); create_customer'ı shortName ile düzelt. *Etki: G3'ün "yapmadığını yaptım deme" çekirdek kuralını kodda zorlar.*
5. **Sohbet-ajan kopukluğunu gider** (CoPilotScreen:41-76): sohbeti tool-calling akışına bağla veya sistem promptuna "işlem yapamazsın" kuralı ekle. *Etki: en görünür hallucination/yalan yüzeyini kapatır.*
6. **Numara/ID üretimini ve tekrar-kabulü düzelt** (AppContext:306-310,387,380-440): monoton/UUID numara + idempotent kabul guard'ı + DB unique kısıt. *Etki: çift teklif/iş emri ve fatura çakışmalarını önler.*
7. **Edge function yetkilendirmesi + webhook imzaları** (ai-tools/ai-sql, gchat/gmail/whatsapp-webhook): her fn'de getUser + rol kontrolü; webhook imza/secret doğrulaması zorunlu. *Etki: service_role yazma yollarının kimliksiz tetiklenmesini durdurur.*
8. **Push'u çalışır hale getir** (pushNotifications.ts:55-60,40-72): projectId'yi Constants'tan geç; login/foreground'da otomatik token kaydı. *Etki: G7'nin standalone APK'da sessizce çökmesini giderir.*
9. **Audit kapsamını mali/operasyonel servislere genişlet** (payments/cash/stock/payroll + Repository merkezi): zorunlu logging. *Etki: G5 eksiksiz kayıt; mali su-istimal izlenebilirliği.*
10. **Kritik para/sync yollarına test + 3 PDF'e @page** (calcQuoteTotals, syncDrain.applyOp, agent delete tool'ları; ShiftHistory/ManagerCommandCenter/AttendanceReport). *Etki: regresyon ağı ve G4 temizliği.*

## 6. Boyut Bazlı Özet

- **AI Ajan Bütünlüğü (G3):** ❌ Gerçek ajan AgentConsole'da çoğunlukla sağlam ama en çok kullanılan sohbet ekranları ajansız; fire-and-forget yazımlar ve bozuk create_customer dürüstlüğü kırıyor.
- **Güvenlik — RLS & SQL:** ❌ 14 tablo RLS'siz, tenant izolasyonu yok, exec_readonly_sql gerçekten salt-okunur değil — kritik.
- **Güvenlik — Sırlar/Auth/EdgeFn:** ❌ Yetki yükseltme + client'a gömülü/okutulan anahtarlar + kimliksiz edge/webhook'lar; production için yetersiz.
- **Doğruluk — Çekirdek Akışlar:** ⚠️ Para matematiği tutarlı ama numara/ID çakışması, tekrar-kabul, timer-recompute iskonto kaybı materyal hatalar.
- **Doğruluk — Veri & Offline:** ⚠️ İki paralel offline sistem, mock yalan başarı, offline audit/notification kaybı, idempotency eksik.
- **Kayıt Bütünlüğü (G5):** ❌ Audit yalnız 4 dosyada; mali/operasyonel servislerin çoğu izsiz; offline tamamen atlanıyor.
- **Bildirimler (G7):** ❌ Push standalone'da çöküyor, otomatik kayıt yok, RLS herkese açık, çoğu mutasyon sessiz.
- **PDF Markalama (G4):** ⚠️ Servis şablonları temiz, 3 ekran PDF'inde @page eksik, Servis Formu görselleri uzak URL.
- **Mobil & UI (G1,G2):** ⚠️ Sağlam temel; sistemik KAV eksikliği ve küçük yazı/dokunma hedefleri son kullanıcıyı zorluyor.
- **Tip Güvenliği:** ⚠️ Typecheck temiz ama 311 `as any`; AI yanıt parse ve quote→WO dönüşümünde riskli kaçaklar.
- **Performans:** ⚠️ Listeler iyi; iki global context memoize edilmemiş (87 tüketici toptan re-render), birkaç N+1.
- **Test Kapsamı (G6):** ❌ 28 test/652 dosya; kritik para/sync/agent/audit yolları kapsamsız, coverage gate yok.
- **Ölü Kod & Tutarlılık:** ⚠️ Navigasyon temiz; ölü altyapı (i18n/logger/localDateISO) ve koşulsuz başarı toast'ları (G3) var.
- **Build & Dağıtım:** ⚠️ EAS/sürüm uyumu çalışır; push projectId, Maps anahtar tutarsızlığı ve .env sır ifşası üretim kalitesini bozuyor.
