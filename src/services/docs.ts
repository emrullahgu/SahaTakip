// Faz 54 — Dokümantasyon ve Eğitim servisi (Doc* prefix)
import type {
  DocAudience,
  DocGuide,
  DocOpsRunbook,
  DocFaqItem,
  DocTrainingScript,
  DocChecklistItem,
  DocTrCharCheck,
} from '../types';

export const DOC_AUDIENCE_LABEL: Record<DocAudience, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  field: 'Saha Personeli',
  customer: 'Müşteri',
};

export const DOC_AUDIENCE_COLOR: Record<DocAudience, string> = {
  admin: '#ef4444',
  manager: '#a855f7',
  field: '#22c55e',
  customer: '#0ea5e9',
};

const ADMIN: DocGuide = {
  id: 'g-admin', audience: 'admin', title: 'Admin Kullanım Kılavuzu', updatedAt: '2026-05-22',
  summary: 'Tenant yönetimi, kullanıcı atama, paket ve faturalandırma ile sistem yöneticisinin tüm sorumluluk alanı.',
  sections: [
    { heading: 'Tenant Yönetimi', bullets: ['Yeni tenant oluşturma ve plan seçimi', 'Plan yükseltme / düşürme', 'Tenant askıya alma / yeniden aktive etme'] },
    { heading: 'Kullanıcı ve Rol', bullets: ['Kullanıcı davet etme (e-posta)', 'Rol atama: admin / yönetici / saha / müşteri', 'Şifre sıfırlama ve oturum kapatma'] },
    { heading: 'Modül & Paketler', bullets: ['Aktif modüllerin yönetimi', 'Premium özelliklerin açılması', 'Paket geçiş geçmişi'] },
    { heading: 'Faturalandırma', bullets: ['Plan ücretleri ve kullanım sayısı', 'Fatura görüntüleme ve indirme', 'Ödeme yöntemi güncelleme'] },
    { heading: 'Yedekleme & Geri Yükleme', bullets: ['Manuel yedek tetikleme', 'Otomatik yedek planı', 'Geri yükleme talimatı (Supabase Ops dokümanı)'] },
  ],
};

const MANAGER: DocGuide = {
  id: 'g-manager', audience: 'manager', title: 'Yönetici Kullanım Kılavuzu', updatedAt: '2026-05-22',
  summary: 'Teklif, iş emri, personel ve KPI yönetimi süreçlerinin yöneticiler için uçtan uca akışı.',
  sections: [
    { heading: 'Teklif Onayı', bullets: ['Bekleyen teklifleri görüntüleme', 'Revizyon talebi gönderme', 'Onaylama ve müşteriye iletim'] },
    { heading: 'İş Emri Yönetimi', bullets: ['İş emri oluşturma ve atama', 'Acil önceliği ayarlama', 'İş emri tamamlama doğrulama'] },
    { heading: 'Personel ve Saha', bullets: ['Personel listesi ve mesai durumu', 'Konum bazlı atama önerileri', 'Performans skorları'] },
    { heading: 'KPI ve Raporlar', bullets: ['Aylık ciro / iş yükü grafikleri', 'Müşteri bazlı kâr analizi', 'Personel verimliliği raporu'] },
  ],
};

const FIELD: DocGuide = {
  id: 'g-field', audience: 'field', title: 'Saha Personeli Kılavuzu', updatedAt: '2026-05-22',
  summary: 'Saha teknisyenleri için iş emri akışı, konum doğrulama, fotoğraf ve malzeme kullanımı.',
  sections: [
    { heading: 'Günlük Akış', bullets: ['Atanan iş emirlerini açma', 'Sıralı çalışma listesi', 'Mola ve mesai bitirme'] },
    { heading: 'İş Emri', bullets: ['Başlat (konum + saat damgalama)', 'Malzeme ve sarf kaydı', 'Fotoğraf ekleme ve imza', 'Tamamla ve müşteriye teslim'] },
    { heading: 'Konum & Geofence', bullets: ['Konum izni açma', 'QR ile saha doğrulama', 'Mesai dışı uyarıları'] },
    { heading: 'Çevrimdışı Mod', bullets: ['İnternet yokken senkronizasyon kuyruğu', 'Bekleyen işlemleri görme', 'Manuel senkronizasyon başlatma'] },
  ],
};

const CUSTOMER: DocGuide = {
  id: 'g-customer', audience: 'customer', title: 'Müşteri Portal Kılavuzu', updatedAt: '2026-05-22',
  summary: 'Müşterilerin tekliflerini onaylaması, iş emirlerini takibi ve belge arşivlerine erişimi.',
  sections: [
    { heading: 'Giriş', bullets: ['Telefon + OTP girişi', 'E-posta doğrulama', 'Şifre kurma (opsiyonel)'] },
    { heading: 'Teklif', bullets: ['PDF görüntüleme ve onaylama', 'Revizyon talebi yazma', 'Onaylananları arşivde görme'] },
    { heading: 'İş Emri', bullets: ['Aktif servisi görüntüleme', 'Tahmini varış zamanı', 'Servis tamamlandığında değerlendirme'] },
    { heading: 'Belgeler', bullets: ['Fatura ve sözleşmeler', 'PDF indirme', 'Geçmiş servisler arşivi'] },
  ],
};

const OPS_SUPABASE: DocOpsRunbook = {
  id: 'ops-supabase', title: 'Supabase Bakım ve Yedekleme', updatedAt: '2026-05-22',
  summary: 'Veritabanı bakım, RLS kontrolü, yedekleme stratejisi ve felaket kurtarma adımları.',
  sections: [
    { heading: 'Günlük Bakım', bullets: ['Connection pool izleme', 'Slow query log incelemesi', 'Disk kullanımı kontrolü'] },
    { heading: 'Yedekleme Politikası', bullets: ['Günlük tam yedek (saat 03:00 UTC)', '7 gün PITR (Point In Time Recovery)', 'Aylık snapshot (S3 cold storage)'] },
    { heading: 'RLS Kontrolü', bullets: ['Yeni eklenen tablolar için policy kontrolü', 'Tenant izolasyon testi', 'Service role kullanımının denetlenmesi'] },
    { heading: 'Felaket Kurtarma', bullets: ['Yedekten restore prosedürü', 'PITR ile zamana dönüş', 'Çözüm sonrası doğrulama kontrol listesi'] },
  ],
};

const OPS_NETLIFY: DocOpsRunbook = {
  id: 'ops-netlify', title: 'Netlify Deploy ve Rollback', updatedAt: '2026-05-22',
  summary: 'Web yayın akışı, branch deploy yönetimi ve hızlı geri alma.',
  sections: [
    { heading: 'Deploy', bullets: ['main branch otomatik deploy', 'Deploy preview\'larının PR ile entegrasyonu', 'Environment variables yönetimi'] },
    { heading: 'Rollback', bullets: ['Önceki deploy\'a tek tık geri alma', 'DNS / domain kontrolü', 'Cache temizleme'] },
    { heading: 'İzleme', bullets: ['Build log\'larının saklanması', 'Build uyarı bildirimleri', 'Form spam koruması'] },
  ],
};

const OPS_APK: DocOpsRunbook = {
  id: 'ops-apk', title: 'APK Yayın ve Güncelleme', updatedAt: '2026-05-22',
  summary: 'Mobil APK build, EAS pipeline ve mağaza dağıtımı.',
  sections: [
    { heading: 'EAS Build', bullets: ['eas build --platform android --profile production', 'Keystore yönetimi', 'Sürüm numarası artırımı'] },
    { heading: 'Test Aşaması', bullets: ['Internal testing (Play Console)', 'Closed track ile beta sürüm', 'Crashlytics ve performans izleme'] },
    { heading: 'Yayın', bullets: ['Production track rollout (kademeli %20 / %50 / %100)', 'Sürüm notu girişi', 'Geri alma planı (önceki APK)'] },
    { heading: 'OTA Güncelleme', bullets: ['EAS Update ile JS bundle güncelleme', 'Kanal yönetimi (production/staging)', 'Geri alma talimatı'] },
  ],
};

const FAQ: DocFaqItem[] = [
  { id: 'f1', category: 'login', question: 'OTP gelmiyor, ne yapmalıyım?', answer: 'Telefonun şebeke kapsamasını kontrol edin, 30 sn sonra "Tekrar gönder"e basın. SMS gelmiyorsa e-posta ile alternatif giriş kullanın.', helpfulCount: 24 },
  { id: 'f2', category: 'quote', question: 'Teklifi onayladım ama müşteri görmüyor', answer: 'Teklifin "Müşteri portalına yayınla" anahtarının açık olduğundan emin olun. Bildirim gönderildikten sonra 1-2 dk içinde görünmesi normaldir.', helpfulCount: 18 },
  { id: 'f3', category: 'workorder', question: 'İş emrini başlatamıyorum', answer: 'Konum izninin açık olduğundan ve internet bağlantınızın bulunduğundan emin olun. Çevrimdışı modda başlatma yapabilir, sonra senkronize olur.', helpfulCount: 35 },
  { id: 'f4', category: 'sync', question: 'Çevrimdışı kayıt senkronize olmadı', answer: 'Üst menüden "Senkronize et" butonuna basın. Hâlâ bekliyorsa uygulamayı kapatıp yeniden açın; kuyruk otomatik işler.', helpfulCount: 29 },
  { id: 'f5', category: 'pdf', question: 'PDF\'de Türkçe karakter bozuk geliyor', answer: 'Uygulamayı son sürüme güncelleyin. Eski Android cihazlarda PDF render motoru Türkçe karakter desteğinde sorun yaşayabilir; webview yedek mod ayarlardan açılabilir.', helpfulCount: 12 },
  { id: 'f6', category: 'notification', question: 'Push bildirim almıyorum', answer: 'Cihaz ayarlarından uygulama izinlerini açın. Profil > Bildirim Tercihleri ekranından kanalın açık olduğundan emin olun.', helpfulCount: 41 },
  { id: 'f7', category: 'general', question: 'Hesap silme talebi nasıl yapılır?', answer: 'Profil > Hesap Yönetimi > Hesabımı Sil. 30 gün içinde tüm verileriniz silinir (KVKK uyumlu).', helpfulCount: 8 },
  { id: 'f8', category: 'general', question: 'Şifremi unuttum', answer: 'Giriş ekranındaki "Şifremi unuttum"a tıklayın. Telefonunuza OTP gönderilir, sonrasında yeni şifre belirleyebilirsiniz.', helpfulCount: 47 },
];

const TRAINING: DocTrainingScript[] = [
  { id: 't1', title: 'Saha Personeli — İlk Gün Eğitimi', targetRole: 'field', totalMin: 8, scenes: [
    { order: 1, text: 'Giriş ekranı, OTP doğrulama', durationSec: 60 },
    { order: 2, text: 'Atanan iş emirlerini açma', durationSec: 90 },
    { order: 3, text: 'İş emri başlatma (konum + saat)', durationSec: 90 },
    { order: 4, text: 'Malzeme ve fotoğraf ekleme', durationSec: 120 },
    { order: 5, text: 'Tamamlama ve imza', durationSec: 120 },
  ]},
  { id: 't2', title: 'Yönetici — Onay ve Atama', targetRole: 'manager', totalMin: 6, scenes: [
    { order: 1, text: 'KPI dashboard turu', durationSec: 60 },
    { order: 2, text: 'Bekleyen teklifleri inceleme', durationSec: 90 },
    { order: 3, text: 'Personel atama akışı', durationSec: 90 },
    { order: 4, text: 'Raporları indirme', durationSec: 120 },
  ]},
  { id: 't3', title: 'Admin — Sistem Kurulum', targetRole: 'admin', totalMin: 10, scenes: [
    { order: 1, text: 'Tenant oluşturma', durationSec: 90 },
    { order: 2, text: 'Kullanıcı davet etme', durationSec: 90 },
    { order: 3, text: 'Modül paketi seçimi', durationSec: 120 },
    { order: 4, text: 'Yedekleme planı tanımlama', durationSec: 120 },
    { order: 5, text: 'Faturalandırma ayarları', durationSec: 180 },
  ]},
  { id: 't4', title: 'Müşteri — Portal Kullanımı', targetRole: 'customer', totalMin: 4, scenes: [
    { order: 1, text: 'OTP ile giriş', durationSec: 45 },
    { order: 2, text: 'Teklif görüntüleme ve onay', durationSec: 90 },
    { order: 3, text: 'İş emrini takip etme', durationSec: 60 },
    { order: 4, text: 'Belge arşivi', durationSec: 45 },
  ]},
];

const CHECKLIST: DocChecklistItem[] = [
  { id: 'c1', text: 'Tüm rollere ait kullanıcılar açıldı ve test girişleri yapıldı', done: true, critical: true, category: 'permission' },
  { id: 'c2', text: 'Müşteri başlangıç verisi (en az 5 müşteri) yüklendi', done: true, critical: true, category: 'data' },
  { id: 'c3', text: 'Hızlı teklif kalemleri katalogu doğrulandı', done: true, critical: true, category: 'data' },
  { id: 'c4', text: 'Supabase RLS politikaları tüm tablolarda aktif', done: true, critical: true, category: 'permission' },
  { id: 'c5', text: 'OneSignal / Push test bildirimi gönderildi', done: true, critical: false, category: 'integration' },
  { id: 'c6', text: 'WhatsApp Business API template onaylandı', done: false, critical: false, category: 'integration' },
  { id: 'c7', text: 'PDF Türkçe karakter testi her platformda yapıldı', done: true, critical: true, category: 'translation' },
  { id: 'c8', text: 'Saha personeli eğitim toplantısı planlandı', done: true, critical: true, category: 'training' },
  { id: 'c9', text: 'Yönetici eğitim videoları paylaşıldı', done: true, critical: false, category: 'training' },
  { id: 'c10', text: 'Müşteri için bilgilendirme e-postası hazırlandı', done: false, critical: false, category: 'training' },
  { id: 'c11', text: 'Yedekleme planı (Supabase Ops) onaylandı', done: true, critical: true, category: 'integration' },
  { id: 'c12', text: 'Web yayın domain yönlendirmeleri test edildi', done: true, critical: false, category: 'integration' },
];

const TR_CHARS: DocTrCharCheck[] = [
  { id: 'tr1', file: 'screens/QuoteDetailScreen.tsx', total: 142, issues: 0, ok: true },
  { id: 'tr2', file: 'services/pdf.ts', total: 86, issues: 0, ok: true },
  { id: 'tr3', file: 'screens/ManagerScreen.tsx', total: 218, issues: 0, ok: true },
  { id: 'tr4', file: 'screens/CustomerFormScreen.tsx', total: 95, issues: 0, ok: true },
  { id: 'tr5', file: 'data/initialData.ts', total: 312, issues: 0, ok: true },
  { id: 'tr6', file: 'screens/LoginScreen.tsx', total: 48, issues: 0, ok: true },
  { id: 'tr7', file: 'services/codeQuality.ts', total: 124, issues: 0, ok: true },
  { id: 'tr8', file: 'POZ_ROADMAP.md (tail)', total: 380, issues: 12, ok: false },
];

export async function getDocGuide(audience: DocAudience): Promise<DocGuide> {
  switch (audience) {
    case 'admin': return ADMIN;
    case 'manager': return MANAGER;
    case 'field': return FIELD;
    case 'customer': return CUSTOMER;
  }
}

export async function getDocOps(kind: 'supabase' | 'netlify' | 'apk'): Promise<DocOpsRunbook> {
  if (kind === 'supabase') return OPS_SUPABASE;
  if (kind === 'netlify') return OPS_NETLIFY;
  return OPS_APK;
}

export async function listDocFaq(): Promise<DocFaqItem[]> {
  return FAQ;
}

export async function listDocTraining(): Promise<DocTrainingScript[]> {
  return TRAINING;
}

export async function listDocChecklist(): Promise<DocChecklistItem[]> {
  return CHECKLIST;
}

export async function listDocTrChars(): Promise<DocTrCharCheck[]> {
  return TR_CHARS;
}
