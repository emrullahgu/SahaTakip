// Faz 53 — Kabul Testleri servisi (Uat* prefix)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  UatScenario,
  UatE2EFlow,
  UatNotificationCheck,
  UatBug,
  UatReport,
  UatRole,
  UatStatus,
  UatSeverity,
} from '../types';

const K_SCENARIO = 'uat_scenario_v1';
const K_E2E = 'uat_e2e_v1';
const K_NOTIF = 'uat_notif_v1';
const K_BUG = 'uat_bug_v1';
const K_REPORT = 'uat_report_v1';

export const UAT_STATUS_LABEL: Record<UatStatus, string> = {
  pending: 'Bekliyor',
  pass: 'Geçti',
  fail: 'Hata',
  blocked: 'Bloklandı',
};

export const UAT_STATUS_COLOR: Record<UatStatus, string> = {
  pending: '#64748b',
  pass: '#22c55e',
  fail: '#ef4444',
  blocked: '#f59e0b',
};

export const UAT_SEV_COLOR: Record<UatSeverity, string> = {
  low: '#64748b',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

export const UAT_SEV_LABEL: Record<UatSeverity, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

export const UAT_ROLE_LABEL: Record<UatRole, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  field: 'Saha',
  customer: 'Müşteri',
};

function makeStep(id: string, text: string, expected: string, status: UatStatus = 'pass'): { id: string; text: string; expected: string; status: UatStatus } {
  return { id, text, expected, status };
}

const DEFAULT_SCENARIOS: UatScenario[] = [
  // Admin
  { id: 'sc-a1', role: 'admin', title: 'Tenant ve kullanıcı yönetimi', description: 'Admin tenant oluşturma ve kullanıcı atama akışı', priority: 'critical', status: 'pass', lastRunAt: '2026-05-22T09:00:00Z', steps: [
    makeStep('s1', 'Yeni tenant oluştur', 'Tenant listesinde görünür'),
    makeStep('s2', 'Kullanıcı davet et', 'Davet e-postası gönderilir'),
    makeStep('s3', 'Rol ata', 'Kullanıcı rol görür', 'pass'),
  ] },
  { id: 'sc-a2', role: 'admin', title: 'Modül paketleri yönetimi', description: 'Paketleri aktif/pasif etme', priority: 'high', status: 'pass', lastRunAt: '2026-05-22T09:15:00Z', steps: [
    makeStep('s1', 'Paket listesi aç', 'Paketler listelenir'),
    makeStep('s2', 'Premium paketi aç', 'Modüller aktif'),
  ] },
  { id: 'sc-a3', role: 'admin', title: 'Yedekleme tetikleme', description: 'Manuel yedek alma', priority: 'high', status: 'pending', steps: [
    makeStep('s1', 'Yedek butonuna tıkla', 'Yedek alınır', 'pending'),
  ] },
  // Manager
  { id: 'sc-m1', role: 'manager', title: 'Teklif onay akışı', description: 'Yönetici tekliflerin onayı', priority: 'critical', status: 'pass', lastRunAt: '2026-05-21T14:00:00Z', steps: [
    makeStep('s1', 'Bekleyen teklif aç', 'Teklif detayı görünür'),
    makeStep('s2', 'Onayla', 'Müşteriye bildirim gider'),
  ] },
  { id: 'sc-m2', role: 'manager', title: 'Personel atama', description: 'İş emrine teknisyen atama', priority: 'high', status: 'pass', lastRunAt: '2026-05-21T14:20:00Z', steps: [
    makeStep('s1', 'İş emri aç', 'Detay görünür'),
    makeStep('s2', 'Teknisyen seç ve ata', 'Bildirim teknisyene gider'),
  ] },
  { id: 'sc-m3', role: 'manager', title: 'KPI dashboard', description: 'KPI ve raporlar', priority: 'medium', status: 'fail', lastRunAt: '2026-05-21T15:00:00Z', steps: [
    makeStep('s1', 'KPI ekranı aç', 'Tüm kartlar yüklenir'),
    makeStep('s2', 'Ay filtresi uygula', 'Veri güncellenir', 'fail'),
  ] },
  // Field
  { id: 'sc-f1', role: 'field', title: 'İş emri başlat / tamamla', description: 'Saha personeli akışı', priority: 'critical', status: 'pass', lastRunAt: '2026-05-23T08:30:00Z', steps: [
    makeStep('s1', 'Ataması olan iş emri aç', 'Detay görünür'),
    makeStep('s2', 'Başlat butonuna tıkla', 'Konum + zaman damgalanır'),
    makeStep('s3', 'Tamamla + foto yükle', 'İş emri kapanır'),
  ] },
  { id: 'sc-f2', role: 'field', title: 'Saha doğrulama (konum)', description: 'Geofence kontrolü', priority: 'high', status: 'pass', lastRunAt: '2026-05-23T09:00:00Z', steps: [
    makeStep('s1', 'Müşteri konumunda QR oku', 'Doğrulama başarılı'),
  ] },
  { id: 'sc-f3', role: 'field', title: 'Stok düşme', description: 'Malzeme kullanımı', priority: 'high', status: 'pending', steps: [
    makeStep('s1', 'İş emrinde malzeme ekle', 'Stok düşürülür', 'pending'),
  ] },
  // Customer
  { id: 'sc-c1', role: 'customer', title: 'Müşteri portal girişi', description: 'OTP ile giriş', priority: 'critical', status: 'pass', lastRunAt: '2026-05-20T11:00:00Z', steps: [
    makeStep('s1', 'Telefon ile giriş', 'OTP gelir'),
    makeStep('s2', 'OTP doğrula', 'Portala giriş yapılır'),
  ] },
  { id: 'sc-c2', role: 'customer', title: 'Teklif görüntüleme & onay', description: 'PDF + onay', priority: 'critical', status: 'pass', lastRunAt: '2026-05-20T11:20:00Z', steps: [
    makeStep('s1', 'Teklif aç', 'PDF preview gösterilir'),
    makeStep('s2', 'Onayla', 'Yöneticiye bildirim gider'),
  ] },
  { id: 'sc-c3', role: 'customer', title: 'Geçmiş iş emirleri', description: 'Müşteri geçmişi', priority: 'medium', status: 'pass', lastRunAt: '2026-05-20T11:35:00Z', steps: [
    makeStep('s1', 'Geçmiş sekmesini aç', 'Kapanmış işler listelenir'),
  ] },
];

const DEFAULT_E2E: UatE2EFlow[] = [
  { id: 'e-quote', flow: 'quote', title: 'Teklif Uçtan Uca', steps: 12, passed: 11, failed: 0, blocked: 1, durationMin: 18, status: 'pass', lastRunAt: '2026-05-23T10:00:00Z' },
  { id: 'e-wo', flow: 'workorder', title: 'İş Emri Uçtan Uca', steps: 14, passed: 14, failed: 0, blocked: 0, durationMin: 22, status: 'pass', lastRunAt: '2026-05-23T10:30:00Z' },
  { id: 'e-stock', flow: 'stock', title: 'Stok & Zimmet Uçtan Uca', steps: 10, passed: 8, failed: 2, blocked: 0, durationMin: 15, status: 'fail', lastRunAt: '2026-05-23T11:00:00Z' },
  { id: 'e-loc', flow: 'location', title: 'Konum & Rota Uçtan Uca', steps: 9, passed: 9, failed: 0, blocked: 0, durationMin: 12, status: 'pass', lastRunAt: '2026-05-23T11:20:00Z' },
  { id: 'e-notif', flow: 'notification', title: 'Bildirim Akışları', steps: 8, passed: 7, failed: 1, blocked: 0, durationMin: 9, status: 'fail', lastRunAt: '2026-05-23T11:35:00Z' },
];

const DEFAULT_NOTIF: UatNotificationCheck[] = [];

const DEFAULT_BUGS: UatBug[] = [];

const DEFAULT_REPORT: UatReport = {
  totalScenarios: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  passRate: 0,
  totalBugs: 0,
  criticalBugs: 0,
  openBugs: 0,
  testCoverage: 0,
  lastRunAt: '',
};

async function ensure<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw) as T; } catch { /* fall through */ }
  }
  await AsyncStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

export async function listUatScenarios(role?: UatRole): Promise<UatScenario[]> {
  const items = await ensure<UatScenario[]>(K_SCENARIO, DEFAULT_SCENARIOS);
  return role ? items.filter(s => s.role === role) : items;
}

export async function listUatE2E(): Promise<UatE2EFlow[]> {
  return ensure<UatE2EFlow[]>(K_E2E, DEFAULT_E2E);
}

export async function getUatE2EByFlow(flow: UatE2EFlow['flow']): Promise<UatE2EFlow | undefined> {
  const items = await listUatE2E();
  return items.find(e => e.flow === flow);
}

export async function listUatNotifications(): Promise<UatNotificationCheck[]> {
  return ensure<UatNotificationCheck[]>(K_NOTIF, DEFAULT_NOTIF);
}

export async function listUatBugs(): Promise<UatBug[]> {
  return ensure<UatBug[]>(K_BUG, DEFAULT_BUGS);
}

export async function getUatReport(): Promise<UatReport> {
  return ensure<UatReport>(K_REPORT, DEFAULT_REPORT);
}

export async function toggleUatScenarioStatus(id: string): Promise<void> {
  const items = await listUatScenarios();
  const cycle: UatStatus[] = ['pending', 'pass', 'fail', 'blocked'];
  const updated = items.map(s => {
    if (s.id !== id) return s;
    const idx = cycle.indexOf(s.status);
    const next = cycle[(idx + 1) % cycle.length];
    return { ...s, status: next, lastRunAt: new Date().toISOString() };
  });
  await AsyncStorage.setItem(K_SCENARIO, JSON.stringify(updated));
}
