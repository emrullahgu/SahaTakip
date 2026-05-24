// Faz 57 — Dış Entegrasyonlar & Eklentiler (External Integrations Catalog)
import type { ExtIntegration, ExtLogEntry, ExtConnectionStatus } from '../types';

export const EXT_STATUS_LABEL: Record<ExtConnectionStatus, string> = {
  connected: 'Bağlı', disconnected: 'Bağlı Değil', pending: 'Bekliyor', error: 'Hata',
};
export const EXT_STATUS_COLOR: Record<ExtConnectionStatus, string> = {
  connected: '#22c55e', disconnected: '#64748b', pending: '#f59e0b', error: '#ef4444',
};
export const EXT_STATUS_ICON: Record<ExtConnectionStatus, string> = {
  connected: 'checkmark-circle', disconnected: 'remove-circle', pending: 'time', error: 'alert-circle',
};

export const EXT_CATEGORY_LABEL: Record<ExtIntegration['category'], string> = {
  iletisim: 'İletişim', takvim: 'Takvim', finans: 'Finans', depo: 'Depo',
  erp: 'ERP / Muhasebe', pazar: 'Pazar Zekası', ai: 'Yapay Zeka', ui: 'Arayüz', rota: 'Rota',
};

const INTEGRATIONS: ExtIntegration[] = [
  {
    id: 'whatsapp', name: 'WhatsApp Business API', category: 'iletisim', icon: 'logo-whatsapp', color: '#25d366',
    status: 'disconnected', summary: 'Teklif, fatura ve bildirimleri WhatsApp üzerinden gönder',
    description: 'Resmi WhatsApp Business Cloud API üzerinden müşterilere onaylı şablon mesajlar, teklif PDF\'leri ve servis hatırlatmaları gönderir. 360dialog veya Meta direkt entegrasyonu desteklenir.',
    fields: [
      { key: 'phoneNumberId', label: 'Telefon Numarası ID', kind: 'text', placeholder: '1234567890', description: 'Meta Business yönetim panelinden alınır' },
      { key: 'accessToken', label: 'Erişim Anahtarı (Access Token)', kind: 'password', secret: true, placeholder: 'EAA...' },
      { key: 'wabaId', label: 'WABA Hesap ID', kind: 'text' },
      { key: 'defaultTemplate', label: 'Varsayılan Şablon', kind: 'select', options: ['teklif_bildirimi', 'fatura_bildirimi', 'servis_randevu', 'tahsilat_hatirlatma'] },
      { key: 'autoSend', label: 'Otomatik gönderim', kind: 'toggle' },
    ],
    benefits: ['Müşteriye en hızlı ulaşım kanalı', 'Şablon mesajlarla onaylı iletişim', 'Teklif PDF eklenmiş tek tıkla gönderim'],
    docUrl: 'https://developers.facebook.com/docs/whatsapp', faz: 57,
  },
  {
    id: 'sms', name: 'SMS Gateway (Netgsm/İletimerkezi)', category: 'iletisim', icon: 'chatbubble-ellipses', color: '#3b82f6',
    status: 'disconnected', summary: 'Toplu ve bireysel SMS gönderimi',
    description: 'Netgsm, İletimerkezi, Twilio veya Vatansms gibi yerli/global gateway\'ler üzerinden randevu, hatırlatma, OTP ve kampanya mesajları gönderir.',
    fields: [
      { key: 'provider', label: 'Sağlayıcı', kind: 'select', options: ['Netgsm', 'İletimerkezi', 'Vatansms', 'Twilio'] },
      { key: 'username', label: 'Kullanıcı Adı / Hesap', kind: 'text' },
      { key: 'password', label: 'Şifre / API Key', kind: 'password', secret: true },
      { key: 'sender', label: 'Gönderen Başlık', kind: 'text', placeholder: 'SAHATAKIP', description: 'Onaylı 11 karaktere kadar' },
      { key: 'enableOtp', label: 'OTP gönderimini etkinleştir', kind: 'toggle' },
    ],
    benefits: ['Internet gerektirmez (operatör SMS)', 'OTP doğrulama desteği', 'Toplu kampanya mesajları'],
    faz: 57,
  },
  {
    id: 'calendar', name: 'Google Calendar / Outlook', category: 'takvim', icon: 'calendar', color: '#0ea5e9',
    status: 'disconnected', summary: 'Ziyaret ve görevleri takvime senkronize et',
    description: 'OAuth 2.0 ile Google veya Microsoft Outlook takvimlerine iki yönlü senkronizasyon. Saha personelinin ziyaretleri otomatik takvime düşer; takvim değişiklikleri uygulamaya yansır.',
    fields: [
      { key: 'provider', label: 'Sağlayıcı', kind: 'select', options: ['Google', 'Outlook 365'] },
      { key: 'clientId', label: 'OAuth Client ID', kind: 'text' },
      { key: 'clientSecret', label: 'OAuth Client Secret', kind: 'password', secret: true },
      { key: 'syncDirection', label: 'Yön', kind: 'select', options: ['İki Yönlü', 'Sadece Uygulamadan Takvime', 'Sadece Takvimden Uygulamaya'] },
      { key: 'calendarId', label: 'Hedef Takvim ID', kind: 'text', placeholder: 'primary' },
    ],
    benefits: ['Mobil/masaüstü takvimde bildirim', 'Toplantı çakışmalarının önlenmesi', 'Müşteriye davet gönderimi'],
    docUrl: 'https://developers.google.com/calendar', faz: 57,
  },
  {
    id: 'bank', name: 'Banka Entegrasyonu & Mutabakat', category: 'finans', icon: 'business', color: '#10b981',
    status: 'disconnected', summary: 'Banka ekstrelerini otomatik içeri al, mutabakat yap',
    description: 'Garanti, İşbank, Akbank, QNB Finansbank ve Yapı Kredi API\'leri ile günlük ekstre çekimi, otomatik tahsilat eşleştirme ve cari mutabakat.',
    fields: [
      { key: 'bank', label: 'Banka', kind: 'select', options: ['Garanti', 'İşbank', 'Akbank', 'QNB', 'Yapı Kredi', 'Diğer'] },
      { key: 'merchantId', label: 'Müşteri / Üye İşyeri No', kind: 'text' },
      { key: 'apiKey', label: 'API Anahtarı', kind: 'password', secret: true },
      { key: 'iban', label: 'Hesap IBAN', kind: 'text', placeholder: 'TR..' },
      { key: 'autoMatch', label: 'Otomatik eşleştirme', kind: 'toggle' },
    ],
    benefits: ['Manuel mutabakat yükünün ortadan kalkması', 'Tahsilatların aynı gün görülmesi', 'Cari hesap doğruluğu'],
    faz: 57,
  },
  {
    id: 'pos', name: 'Sanal POS & Mobil Ödeme', category: 'finans', icon: 'card', color: '#8b5cf6',
    status: 'disconnected', summary: 'Saha tahsilatlarını kartla anında al',
    description: 'iyzico, PayTR, Param veya banka sanal POS\'ları ile saha tahsilatı. Tek seferlik veya taksitli ödeme, link ile gönderim ve hatırlatma.',
    fields: [
      { key: 'provider', label: 'Sağlayıcı', kind: 'select', options: ['iyzico', 'PayTR', 'Param', 'Garanti VPOS', 'İşbank VPOS'] },
      { key: 'apiKey', label: 'API Key', kind: 'password', secret: true },
      { key: 'secretKey', label: 'Secret Key', kind: 'password', secret: true },
      { key: 'currency', label: 'Para Birimi', kind: 'select', options: ['TRY', 'USD', 'EUR'] },
      { key: 'installmentEnabled', label: 'Taksit desteği', kind: 'toggle' },
    ],
    benefits: ['Saha tahsilatı için fiziksel POS gerekmez', 'Ödeme linki ile uzaktan tahsilat', 'Taksitli satış desteği'],
    faz: 57,
  },
  {
    id: 'warehouse', name: 'Detaylı Depo (Raf/Adres)', category: 'depo', icon: 'cube', color: '#f59e0b',
    status: 'pending', summary: 'Raf, blok, koridor bazlı detaylı depo yönetimi',
    description: 'Mevcut depo modülünü genişletir: koridor → blok → raf → göz hiyerarşisi, ürün lokasyonu, mobil sayım, FIFO/FEFO kuralları.',
    fields: [
      { key: 'enabled', label: 'Detaylı depo aktif', kind: 'toggle' },
      { key: 'levels', label: 'Hiyerarşi seviyesi', kind: 'select', options: ['2 (Blok-Raf)', '3 (Koridor-Blok-Raf)', '4 (Koridor-Blok-Raf-Göz)'] },
      { key: 'fifoMode', label: 'Stok kuralı', kind: 'select', options: ['FIFO', 'FEFO', 'LIFO'] },
      { key: 'allowNegative', label: 'Negatif stoğa izin ver', kind: 'toggle' },
    ],
    benefits: ['Daha hızlı toplama (pick)', 'Sayım süresinin kısalması', 'Karışıklık ve fire azalması'],
    faz: 57,
  },
  {
    id: 'erp', name: 'ERP Entegrasyonları', category: 'erp', icon: 'server', color: '#dc2626',
    status: 'pending', summary: 'Logo, Mikro, Netsis, Paraşüt entegrasyonu',
    description: 'Müşteri, ürün, fatura, irsaliye ve cari hareketlerin Logo/Mikro/Netsis/Paraşüt ile iki yönlü senkronizasyonu. Kuyruk tabanlı, hata toleranslı.',
    fields: [
      { key: 'vendor', label: 'ERP', kind: 'select', options: ['Logo Tiger', 'Logo GO', 'Mikro Fly', 'Netsis Enterprise', 'Paraşüt'] },
      { key: 'baseUrl', label: 'API URL', kind: 'url' },
      { key: 'apiKey', label: 'API Key', kind: 'password', secret: true },
      { key: 'companyCode', label: 'Şirket Kodu', kind: 'text' },
      { key: 'syncCustomers', label: 'Müşteri senkronu', kind: 'toggle' },
      { key: 'syncInvoices', label: 'Fatura senkronu', kind: 'toggle' },
      { key: 'syncStock', label: 'Stok senkronu', kind: 'toggle' },
    ],
    benefits: ['Çift veri girişinin ortadan kalkması', 'Muhasebe ekibinin aynı veriyle çalışması', 'Hata oranının düşmesi'],
    faz: 57,
  },
  {
    id: 'market', name: 'Rakip Fiyat Takibi (Pazar Zekası)', category: 'pazar', icon: 'trending-up', color: '#06b6d4',
    status: 'disconnected', summary: 'Rakip e-ticaret sitelerinden günlük fiyat çekimi',
    description: 'Rakip e-ticaret siteleri (Trendyol, Hepsiburada, n11, Amazon TR) için ürün eşleştirme ve günlük fiyat snapshot\'ı. Min/ort/maks fiyat trendi, ürün bazlı uyarı.',
    fields: [
      { key: 'sources', label: 'Kaynaklar', kind: 'select', options: ['Trendyol', 'Hepsiburada', 'n11', 'Amazon TR', 'Tüm Kaynaklar'] },
      { key: 'crawlFrequency', label: 'Çekim Sıklığı', kind: 'select', options: ['Günlük', '2 Gün', 'Haftalık'] },
      { key: 'alertThreshold', label: 'Uyarı eşiği (%)', kind: 'number', placeholder: '5' },
      { key: 'autoAdjustPrice', label: 'Otomatik fiyat önerisi', kind: 'toggle' },
    ],
    benefits: ['Rekabetçi fiyatlama', 'Pazar trendlerini anlık görme', 'Otomatik fiyat değişim önerisi'],
    faz: 57,
  },
  {
    id: 'ocr', name: 'OCR ile Belge Okuma', category: 'ai', icon: 'document-text', color: '#a855f7',
    status: 'disconnected', summary: 'Fatura/kimlik/sözleşmelerden otomatik veri çıkarımı',
    description: 'Google Vision, AWS Textract, Azure Form Recognizer veya yerli OCR servisleri ile faturadan kalem-vergi-toplam, kimlikten ad-tc, sözleşmeden taraf-tarih çıkarımı.',
    fields: [
      { key: 'provider', label: 'OCR Sağlayıcı', kind: 'select', options: ['Google Vision', 'AWS Textract', 'Azure Form Recognizer', 'Yerli (Karakter)'] },
      { key: 'apiKey', label: 'API Key', kind: 'password', secret: true },
      { key: 'region', label: 'Bölge', kind: 'select', options: ['eu-central-1', 'eu-west-1', 'westeurope', 'auto'] },
      { key: 'autoExtractInvoice', label: 'Faturayı otomatik çöz', kind: 'toggle' },
      { key: 'autoExtractId', label: 'Kimliği otomatik çöz', kind: 'toggle' },
    ],
    benefits: ['Veri giriş süresinin %80\'e kadar azalması', 'Yazım hatalarının önlenmesi', 'Belge arşivinin aranabilir olması'],
    faz: 57,
  },
  {
    id: 'theme', name: 'Karanlık Mod & UI Temaları', category: 'ui', icon: 'color-palette', color: '#6366f1',
    status: 'pending', summary: 'Kullanıcı bazlı tema ve renk tercihi',
    description: 'Aydınlık/karanlık mod, otomatik sistem teması, kurumsal renk paleti (logo renklerine göre), font boyutu erişilebilirlik ayarları.',
    fields: [
      { key: 'defaultTheme', label: 'Varsayılan Tema', kind: 'select', options: ['Sistem', 'Aydınlık', 'Karanlık'] },
      { key: 'accentColor', label: 'Vurgu Rengi', kind: 'select', options: ['Mavi', 'Yeşil', 'Mor', 'Turuncu', 'Kırmızı'] },
      { key: 'fontSize', label: 'Yazı Boyutu', kind: 'select', options: ['Küçük', 'Normal', 'Büyük', 'Çok Büyük'] },
      { key: 'highContrast', label: 'Yüksek kontrast', kind: 'toggle' },
      { key: 'reduceMotion', label: 'Animasyonu azalt', kind: 'toggle' },
    ],
    benefits: ['Göz yorgunluğunun azalması', 'Kurumsal kimlik tutarlılığı', 'Erişilebilirlik standartlarına uyum'],
    faz: 57,
  },
  {
    id: 'traffic', name: 'Dinamik Trafik Yoğunluğu', category: 'rota', icon: 'car', color: '#ef4444',
    status: 'disconnected', summary: 'Anlık trafiğe göre rota optimizasyonu',
    description: 'Google Maps Traffic API veya HERE Traffic ile anlık trafik yoğunluğuna göre rota süresini güncelleme, gecikme bildirimi, alternatif yol önerisi.',
    fields: [
      { key: 'provider', label: 'Sağlayıcı', kind: 'select', options: ['Google Maps', 'HERE', 'Mapbox'] },
      { key: 'apiKey', label: 'API Key', kind: 'password', secret: true },
      { key: 'refreshInterval', label: 'Güncelleme Sıklığı (dk)', kind: 'number', placeholder: '5' },
      { key: 'alertOnDelay', label: 'Gecikme bildirimi', kind: 'toggle' },
    ],
    benefits: ['Gerçek varış saati tahmini', 'Müşteriye doğru bilgi', 'Yakıt ve zaman tasarrufu'],
    faz: 57,
  },
  {
    id: 'shift', name: 'Minimum Ziyaret Süresi & Vardiya', category: 'rota', icon: 'time', color: '#0891b2',
    status: 'pending', summary: 'Vardiya planı ve minimum süre kuralları',
    description: 'Saha personelinin vardiya saatleri, minimum ziyaret süresi, mola süresi, mesai aşımı kontrolü ve vardiya raporu.',
    fields: [
      { key: 'shiftStart', label: 'Vardiya Başlangıç', kind: 'text', placeholder: '08:30' },
      { key: 'shiftEnd', label: 'Vardiya Bitiş', kind: 'text', placeholder: '18:00' },
      { key: 'minVisitMinutes', label: 'Minimum Ziyaret (dk)', kind: 'number', placeholder: '15' },
      { key: 'breakMinutes', label: 'Mola Süresi (dk)', kind: 'number', placeholder: '60' },
      { key: 'enforceOvertime', label: 'Mesai aşımı uyarısı', kind: 'toggle' },
    ],
    benefits: ['Sahte ziyaretlerin engellenmesi', 'Personel sağlık ve verim dengesi', 'Mesai maliyetinin kontrolü'],
    faz: 57,
  },
];

const DEMO_LOGS: Record<string, ExtLogEntry[]> = {};

export async function listExtIntegrations(): Promise<ExtIntegration[]> { return INTEGRATIONS; }

export async function getExtIntegration(id: string): Promise<ExtIntegration | undefined> {
  return INTEGRATIONS.find(x => x.id === id);
}

export async function getExtLogs(id: string): Promise<ExtLogEntry[]> {
  return DEMO_LOGS[id] ?? [];
}

export async function getExtSummary(): Promise<{ total: number; connected: number; pending: number; disconnected: number; error: number; }> {
  const all = INTEGRATIONS;
  return {
    total: all.length,
    connected: all.filter(x => x.status === 'connected').length,
    pending: all.filter(x => x.status === 'pending').length,
    disconnected: all.filter(x => x.status === 'disconnected').length,
    error: all.filter(x => x.status === 'error').length,
  };
}
