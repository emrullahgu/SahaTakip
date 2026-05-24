// Faz 56 — Sistem Kapsam Denetimi (Coverage Audit) — static matrix of 23 categories
import type { CovCategory, CovStatus, CovSummary, CovItem } from '../types';

export const COV_STATUS_LABEL: Record<CovStatus, string> = {
  done: 'Tamamlandı', partial: 'Kısmen', planned: 'Planlandı', missing: 'Eksik',
};
export const COV_STATUS_COLOR: Record<CovStatus, string> = {
  done: '#22c55e', partial: '#f59e0b', planned: '#3b82f6', missing: '#ef4444',
};
export const COV_STATUS_ICON: Record<CovStatus, string> = {
  done: 'checkmark-circle', partial: 'remove-circle', planned: 'time', missing: 'close-circle',
};

const d = (text: string, faz?: number): CovItem => ({ text, status: 'done', faz });
const p = (text: string, note?: string, faz?: number): CovItem => ({ text, status: 'partial', note, faz });
const pl = (text: string, note?: string): CovItem => ({ text, status: 'planned', note });

const CATEGORIES: CovCategory[] = [
  { id: 'c1', no: 1, title: 'Kullanıcı ve Rol Yönetimi', icon: 'people', items: [
    d('Kayıt / giriş ekranları', 1), d('Rol bazlı yetkilendirme (admin/manager/field/customer)', 12),
    d('Profil yönetimi', 1), d('Şifre sıfırlama', 1), d('İki faktörlü doğrulama (2FA)', 47),
    d('Cihaz yönetimi', 47), d('Audit log', 22),
  ]},
  { id: 'c2', no: 2, title: 'Müşteri Yönetimi (CRM)', icon: 'people-circle', items: [
    d('Müşteri kartları', 2), d('Müşteri formu (CRUD)', 2), d('Müşteri detayı'),
    d('Müşteri arama / filtreleme', 18), d('Müşteri segmentasyonu', 33), d('Cari bakiye görüntüleme', 10),
    d('Müşteri belge yönetimi', 19), d('Müşteri memnuniyet (NPS)', 35),
  ]},
  { id: 'c3', no: 3, title: 'Konum Takibi ve Bölge Yönetimi', icon: 'location', items: [
    d('Personel konum takibi', 6), d('Harita ekranı', 6), d('Bölge tanımı / sınırları', 25),
    d('Bölge dışı ziyaret uyarısı', 25), p('Minimum ziyaret süresi kontrolü', 'Saha vardiyası ile entegre'),
    d('Ziyaret verimlilik skoru', 26), d('Yakındaki müşteri önerisi', 26),
  ]},
  { id: 'c4', no: 4, title: 'Ziyaret ve Aktivite Yönetimi', icon: 'calendar', items: [
    d('Ziyaret planlama', 11), d('Görev atama', 11), d('Aktivite tipleri (arama/toplantı/teklif/tahsilat/servis)', 11),
    d('Aktivite tarihi/saati/sonucu', 11), d('Takip tarihi oluşturma', 11), d('Dosya/fotoğraf ekleme', 19),
    d('Yönetici görev atama', 11), d('Tamamlandı/ertelendi/iptal durumları', 11),
    d('Otomatik tekrar eden görevler', 32), d('Takvim görünümü', 11),
    pl('Google Calendar / Outlook entegrasyonu', 'Faz 57 — Entegrasyonlar'),
    d('Otomatik hatırlatma', 15), d('Geciken görev bildirimi', 15), d('Son temas tarihi uyarısı', 15),
  ]},
  { id: 'c5', no: 5, title: 'Rota ve Planlama Yönetimi', icon: 'map', items: [
    d('Günlük rota oluşturma', 24), d('Harita üzerinden müşteri seçimi', 24), d('Personel bazlı rota atama', 24),
    d('Planlanan/gerçekleşen karşılaştırma', 24), d('Ziyaret sıralaması', 24),
    d('Mesafe ve süre hesaplama', 24), d('En verimli rota önerisi', 26),
    p('Trafik yoğunluğuna göre rota', 'API entegrasyonu opsiyonel'),
    d('Yakıt/mesafe maliyeti', 24), d('Rota performans analizi', 24),
    d('Bölge bazlı gruplama', 25), d('Plan dışı ziyaret takibi', 25),
  ]},
  { id: 'c6', no: 6, title: 'Teklif Yönetimi', icon: 'document-text', items: [
    d('Teklif oluşturma', 3), d('Ürün/hizmet seçimi', 3), d('Fiyat/iskonto/KDV/toplam', 3),
    d('Müşteri bazlı özel fiyat', 33), d('Teklif durumu', 3), d('PDF teklif çıktısı', 3),
    p('E-posta / WhatsApp gönderim', 'E-posta var; WhatsApp Business API ileride'),
    d('Teklif revizyon geçmişi', 3), d('Tekliften siparişe', 36), d('Onay mekanizması', 32),
    d('Kârlılık analizi', 16), d('Minimum fiyat uyarısı', 16), d('Dövizli teklif', 33),
    d('Çoklu para birimi', 33), d('Teklif şablonları', 3), d('E-imza entegrasyonu', 19),
    d('Görüntülendi bildirimi', 15),
  ]},
  { id: 'c7', no: 7, title: 'Sipariş Yönetimi', icon: 'cart', items: [
    d('Mobil sipariş oluşturma', 36), d('Ürün seçimi', 36), d('Stok kontrolü', 8),
    d('Fiyat/iskonto', 36), d('Sipariş onay süreci', 36), d('Sipariş durumu', 36),
    d('Siparişten irsaliye/fatura', 41), d('Müşteri sipariş geçmişi', 36),
    d('Barkod ile ürün ekleme', 8), d('Kampanyalı ürün önerisi', 33),
    d('Minimum sipariş tutarı', 36), d('Limit aşımı uyarısı', 10),
    d('Tekrarlayan sipariş', 36), d('En çok alınanlar hızlı ekleme', 36),
    d('Mobil imza ile teslimat', 19),
  ]},
  { id: 'c8', no: 8, title: 'Stok ve Depo Yönetimi', icon: 'cube', items: [
    d('Ürün kartları', 8), d('Stok miktarı', 8), d('Depo bazlı stok', 8),
    d('Kritik stok seviyesi', 8), d('Stok hareketleri', 8), d('Barkod/QR desteği', 8),
    d('Seri numarası / lot', 8), d('Depolar arası transfer', 8), d('Sayım işlemleri', 8),
    d('Mobil stok sayımı', 8), d('Araç stoğu / plasiyer stoğu', 9),
    d('Teknik servis yedek parça', 9), d('Otomatik satın alma önerisi', 8),
    p('Raf/adres bazlı depo yönetimi', 'Faz 57 — Detaylı depo'),
    d('Stok yaşlandırma raporu', 16), d('Fire/kayıp/hasarlı takibi', 8),
  ]},
  { id: 'c9', no: 9, title: 'Teknik Servis ve İş Emri', icon: 'construct', items: [
    d('Servis talebi oluşturma', 9), d('İş emri atama', 9), d('Arıza açıklaması', 9),
    d('Servis tipi (kurulum/bakım/arıza/keşif/garanti)', 9), d('Teknisyen atama', 9),
    d('Servis durumu', 9), d('Kullanılan malzeme', 9), d('Fotoğraf ve belge', 19),
    d('Müşteri imzası', 9), d('Servis formu PDF', 9), d('Periyodik bakım planı', 9),
    d('Garanti kontrolü', 9), d('Cihaz seri numarası takibi', 9), d('SLA süre takibi', 9),
    d('Geciken servis uyarısı', 15), d('Teknisyen performans raporu', 14),
    d('Servisten otomatik faturalama', 41),
  ]},
  { id: 'c10', no: 10, title: 'Tahsilat ve Finans Takibi', icon: 'cash', items: [
    d('Cari bakiye', 10), d('Tahsilat kaydı', 10), d('Ödeme türleri', 10),
    d('Tahsilat makbuzu', 10), d('Vadesi geçmiş borçlar', 10), d('Risk limiti kontrolü', 10),
    d('Müşteri ödeme geçmişi', 10), p('Mobil POS', 'Faz 57 — Sanal POS entegrasyonu'),
    pl('Banka entegrasyonu', 'Faz 57'), p('Otomatik mutabakat', 'Excel import var; SOAP banka entegrasyonu yok'),
    d('Geciken ödeme bildirimi', 15), d('Tahsilat hedefi', 14),
    d('Çek/senet vade takibi', 10), d('Cari ekstresi paylaşımı', 10),
  ]},
  { id: 'c11', no: 11, title: 'Fatura, İrsaliye ve E-Belge', icon: 'receipt', items: [
    d('Siparişten fatura', 41), d('İrsaliye yönetimi', 41), d('Fatura durumu', 41),
    d('E-fatura / e-arşiv', 41), d('E-irsaliye', 41), d('Vergi/KDV/tevkifat', 41),
    d('PDF çıktı ve e-posta', 41), p('ERP entegrasyonları (Logo/Mikro/Netsis/Paraşüt)', 'Faz 57'),
    d('GİB entegrasyonu', 41), d('Otomatik fatura kuralları', 32),
    d('Fatura iptal/iade', 41), d('Proforma fatura', 3), d('Dövizli fatura', 41),
  ]},
  { id: 'c12', no: 12, title: 'Ürün, Fiyat ve Kampanya', icon: 'pricetags', items: [
    d('Ürün/hizmet kartları', 8), d('Kategori/marka/model/birim', 8), d('Liste fiyatı', 33),
    d('Müşteri/bayi bazlı fiyat', 33), d('İskonto tanımları', 33), d('KDV oranı', 33),
    d('Aktif/pasif durum', 8), d('Kampanya yönetimi', 33), d('Bölgeye özel fiyat', 33),
    d('Miktara göre fiyatlandırma', 33), d('Bayi seviyesi bazlı fiyat', 13),
    d('Dövizli fiyat listesi', 33), d('Geçerlilik tarihli fiyat', 33),
    pl('Rakip fiyat takibi', 'Faz 57 — Pazar zekası'),
  ]},
  { id: 'c13', no: 13, title: 'Bayi, Şube ve Ekip', icon: 'business', items: [
    d('Bayi/şube kartları', 13), d('Bayi kullanıcıları', 13), d('Bayi satışları', 13),
    d('Bayi stokları', 13), d('Bayi hedefleri', 14), d('Bölge-temsilci eşleştirme', 13),
    d('Şube bazlı raporlama', 16), d('Bayi portalı', 13),
    d('Bayi sipariş sistemi', 13), d('Bayi prim hesaplama', 14),
    d('Bayi performans skoru', 14), d('Bayi limit ve bakiye', 13), d('Bayi eğitim alanı', 54),
  ]},
  { id: 'c14', no: 14, title: 'Hedef, Prim ve Performans', icon: 'trophy', items: [
    d('Personel satış hedefi', 14), d('Ziyaret hedefi', 14), d('Tahsilat hedefi', 14),
    d('Teklif hedefi', 14), d('Sipariş hedefi', 14), d('Hedef/gerçekleşen karşılaştırma', 14),
    d('Günlük/haftalık/aylık rapor', 16), d('Prim hesaplama', 14),
    d('Skor kartı', 14), d('Bölge performansı', 16), d('Ürün bazlı hedef', 14),
    d('Müşteri kazanım hedefi', 14), d('Aktivite kalitesi puanı', 14), d('Liderlik tablosu', 14),
  ]},
  { id: 'c15', no: 15, title: 'Bildirim ve Hatırlatma', icon: 'notifications', items: [
    d('Görev hatırlatmaları', 15), d('Geciken ziyaret bildirimi', 15), d('Yeni görev bildirimi', 15),
    d('Teklif takip bildirimi', 15), d('Tahsilat vadesi', 15), d('Stok kritik bildirimi', 15),
    d('Onay bekleyen bildirim', 15), d('Mobil push bildirim', 15), d('E-posta bildirimi', 15),
    p('WhatsApp/SMS bildirim', 'E-posta var, SMS/WhatsApp gateway ileride'),
    d('Yöneticiye anlık uyarılar', 15), d('Kural bazlı otomasyon', 32),
    d('Kullanıcı bildirim tercihleri', 15),
  ]},
  { id: 'c16', no: 16, title: 'Raporlama ve Dashboard', icon: 'analytics', items: [
    d('Günlük saha hareketleri', 16), d('Personel ziyaret raporu', 16), d('Müşteri aktivite raporu', 16),
    d('Satış raporu', 16), d('Teklif raporu', 16), d('Sipariş raporu', 16),
    d('Tahsilat raporu', 16), d('Stok raporu', 16), d('Cari bakiye raporu', 16),
    d('Geciken görevler', 16), d('Bölge performansı', 16), d('Harita bazlı rapor', 16),
    d('Grafik dashboard', 16), d('KPI kartları', 16), d('Excel/PDF dışa aktarım', 16),
    d('Otomatik e-posta raporu', 16), d('Filtrelenebilir raporlar', 16),
    d('Yöneticiye özel dashboard', 16), d('Kâr marjı analizi', 16), d('Satış tahmini', 23),
  ]},
  { id: 'c17', no: 17, title: 'Mobil Uygulama Özellikleri', icon: 'phone-portrait', items: [
    d('Android ve iOS desteği', 0), d('Müşteri görüntüleme', 2), d('Ziyaret başlat/bitir', 11),
    d('Konum kaydı', 6), d('Fotoğraf yükleme', 19), d('Form doldurma', 18),
    d('Sipariş oluşturma', 36), d('Teklif oluşturma', 3), d('Tahsilat kaydı', 10),
    d('Bildirim alma', 15), d('Offline çalışma', 27), d('Mobil barkod okuma', 8),
    d('Mobil imza', 19), d('Kamera ile belge tarama', 19), d('Sesli not', 23),
    d('Harita navigasyonu', 6), d('Hızlı işlem menüsü', 5),
    pl('Karanlık mod', 'Faz 57 — UI temaları'), d('Düşük internet modu', 27),
  ]},
  { id: 'c18', no: 18, title: 'Form ve Anket Yönetimi', icon: 'clipboard', items: [
    d('Dinamik form oluşturma', 18), d('Ziyaret formu', 18), d('Servis formu', 9),
    d('Keşif formu', 18), d('Memnuniyet anketi', 35), d('Fotoğraf ekleme', 19),
    d('İmza alanı', 19), d('Zorunlu alan tanımlama', 18),
    d('Soru tipleri (metin/sayı/tarih/seçim/foto/imza)', 18),
    d('Otomatik görev oluşturma', 32), d('Koşullu sorular', 18),
    d('Cevap raporları', 18), d('Formdan PDF', 18), d('QR kod ile form açma', 18),
  ]},
  { id: 'c19', no: 19, title: 'Belge ve Dosya Yönetimi', icon: 'folder', items: [
    d('Müşteri dosyaları', 19), d('Teklif/sözleşme/servis/fatura belgeleri', 19),
    d('Fotoğraf ve PDF yükleme', 19), d('Dosya kategorileri', 19),
    d('Görüntüleme ve indirme', 19), d('Versiyon takibi', 19),
    d('Belge onay süreci', 32), d('Otomatik klasörleme', 19),
    pl('OCR ile belge okuma', 'Faz 57 — AI özellikleri'),
    d('Sözleşme bitiş uyarısı', 15), d('E-imza entegrasyonu', 19),
  ]},
  { id: 'c20', no: 20, title: 'Entegrasyonlar', icon: 'link', items: [
    d('Muhasebe/ERP entegrasyonu', 41), d('E-fatura/e-arşiv', 41),
    p('SMS/e-posta entegrasyonu', 'E-posta SMTP var; SMS gateway yok'),
    d('Harita servisleri (Google/OSM)', 6), d('Excel içe/dışa aktarma', 16),
    d('API altyapısı', 21), pl('WhatsApp Business', 'Faz 57'),
    d('Google Maps', 6), pl('Google Calendar / Outlook', 'Faz 57'),
    pl('Banka entegrasyonu', 'Faz 57'), pl('Sanal POS', 'Faz 57'),
    pl('E-ticaret entegrasyonu', 'Faz 58'),
    pl('Çağrı merkezi', 'Faz 58'),
    pl('Power BI / Looker Studio', 'Faz 58'),
  ]},
  { id: 'c21', no: 21, title: 'Otomasyon ve İş Akışları', icon: 'git-network', items: [
    d('Görev atama kuralları', 32), d('Onay akışları', 32), d('Bildirim kuralları', 32),
    d('Durum değişimi otomasyonu', 32), d('Tekliften siparişe', 36), d('Siparişten fatura', 41),
    d('Eğer/ise mantığı', 32), d('Uzun süre aranmayan müşteri uyarısı', 32),
    d('Teklif 3 gün cevapsız hatırlatma', 32), d('Vadesi gelen ödeme bildirimi', 15),
    d('Kritik stok satın alma talebi', 8), d('Servis sonrası memnuniyet anketi', 35),
  ]},
  { id: 'c22', no: 22, title: 'Güvenlik ve Denetim', icon: 'shield-checkmark', items: [
    d('Rol bazlı yetkilendirme', 12), d('Veri yedekleme', 47), d('SSL güvenliği', 0),
    d('İşlem logları', 22), d('Silinen kayıt takibi', 22), d('KVKK uyumluluğu', 22),
    d('Şifre politikası', 47), d('İki faktörlü doğrulama', 47), d('Cihaz yönetimi', 47),
    d('Oturum süresi sınırı', 47), d('Hassas veri maskeleme', 47),
    d('Veri dışa aktarma yetkisi', 22), d('Denetim raporu', 22), d('Otomatik yedekleme', 47),
  ]},
  { id: 'c23', no: 23, title: 'Yapay Zeka ve Akıllı Özellikler', icon: 'sparkles', items: [
    d('Müşteri ziyaret önerisi', 23), d('Satış ihtimali tahmini', 23), d('Teklif kazanma olasılığı', 23),
    d('Riskli müşteri analizi', 23), d('Tahsilat gecikme tahmini', 23),
    d('En iyi rota önerisi', 26), d('Otomatik ziyaret özeti', 23),
    d('Sesli nottan metin', 23), d('Müşteri geçmişine göre satış önerisi', 23),
    d('Akıllı özet raporlar', 23),
  ]},
];

export async function listCovCategories(): Promise<CovCategory[]> { return CATEGORIES; }

export async function getCovCategory(id: string): Promise<CovCategory | undefined> {
  return CATEGORIES.find(c => c.id === id);
}

export async function getCovSummary(): Promise<CovSummary> {
  let total = 0, done = 0, partial = 0, planned = 0, missing = 0;
  CATEGORIES.forEach(c => c.items.forEach(it => {
    total++;
    if (it.status === 'done') done++;
    else if (it.status === 'partial') partial++;
    else if (it.status === 'planned') planned++;
    else missing++;
  }));
  return {
    totalItems: total,
    doneCount: done,
    partialCount: partial,
    plannedCount: planned,
    missingCount: missing,
    coveragePercent: total ? Math.round(((done + partial * 0.5) / total) * 100) : 0,
  };
}
