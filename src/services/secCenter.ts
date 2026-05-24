// Faz 49 — Güvenlik, KVKK ve Kurumsal Dayanıklılık servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SecClassificationItem, SecSensitivity,
  KvkkRequest, KvkkRequestType, KvkkRequestStatus,
  DataExportJob, DataErasureJob, SecJobStatus,
  SecDevice, SuspiciousActivity, SuspiciousSeverity,
  AdminAlert, AdminAlertSeverity,
  BackupReport, DrPlan, SecHealth, SecHealthStatus,
} from '../types';

const K = {
  cls: 'sec_cls_v1',
  kvkk: 'sec_kvkk_v1',
  exp: 'sec_exp_v1',
  era: 'sec_era_v1',
  dev: 'sec_dev_v1',
  sus: 'sec_sus_v1',
  alert: 'sec_alert_v1',
  bak: 'sec_bak_v1',
  dr: 'sec_dr_v1',
  health: 'sec_health_v1',
};

export const SEC_SENS_LABEL: Record<SecSensitivity, string> = {
  public: 'Açık', internal: 'Dahili', confidential: 'Gizli', pii: 'Kişisel', phi: 'Sağlık',
};
export const SEC_SENS_COLOR: Record<SecSensitivity, string> = {
  public: '#22c55e', internal: '#0ea5e9', confidential: '#f59e0b', pii: '#ef4444', phi: '#a855f7',
};

export const KVKK_TYPE_LABEL: Record<KvkkRequestType, string> = {
  access: 'Erişim', erasure: 'Silme', rectification: 'Düzeltme', portability: 'Taşınabilirlik', objection: 'İtiraz',
};
export const KVKK_STATUS_LABEL: Record<KvkkRequestStatus, string> = {
  pending: 'Beklemede', in_progress: 'İşlemde', fulfilled: 'Tamamlandı', rejected: 'Reddedildi',
};
export const KVKK_STATUS_COLOR: Record<KvkkRequestStatus, string> = {
  pending: '#f59e0b', in_progress: '#0ea5e9', fulfilled: '#22c55e', rejected: '#ef4444',
};

export const SEC_JOB_LABEL: Record<SecJobStatus, string> = {
  queued: 'Kuyrukta', running: 'Çalışıyor', completed: 'Tamamlandı', failed: 'Başarısız',
};
export const SEC_JOB_COLOR: Record<SecJobStatus, string> = {
  queued: '#64748b', running: '#0ea5e9', completed: '#22c55e', failed: '#ef4444',
};

export const SUS_SEV_LABEL: Record<SuspiciousSeverity, string> = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik',
};
export const SUS_SEV_COLOR: Record<SuspiciousSeverity, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#b91c1c',
};
export const SUS_TYPE_LABEL: Record<SuspiciousActivity['type'], string> = {
  login_anomaly: 'Giriş Anomalisi', data_dump: 'Veri Dökümü', permission_escalation: 'Yetki Yükseltme',
  unusual_hour: 'Olağandışı Saat', failed_attempts: 'Başarısız Denemeler',
};
export const SUS_TYPE_ICON: Record<SuspiciousActivity['type'], string> = {
  login_anomaly: 'log-in', data_dump: 'cloud-download', permission_escalation: 'shield',
  unusual_hour: 'time', failed_attempts: 'close-circle',
};

export const ALERT_SEV_LABEL: Record<AdminAlertSeverity, string> = {
  info: 'Bilgi', warning: 'Uyarı', critical: 'Kritik',
};
export const ALERT_SEV_COLOR: Record<AdminAlertSeverity, string> = {
  info: '#0ea5e9', warning: '#f59e0b', critical: '#ef4444',
};
export const ALERT_KIND_LABEL: Record<AdminAlert['kind'], string> = {
  role_change: 'Rol Değişikliği', mass_delete: 'Toplu Silme', export: 'Veri Dışa Aktarım',
  config_change: 'Konfig Değişikliği', failed_backup: 'Yedek Hatası', security: 'Güvenlik',
};
export const ALERT_KIND_ICON: Record<AdminAlert['kind'], string> = {
  role_change: 'key', mass_delete: 'trash', export: 'cloud-upload',
  config_change: 'settings', failed_backup: 'cloud-offline', security: 'shield-checkmark',
};

export const HEALTH_STATUS_LABEL: Record<SecHealthStatus, string> = {
  ok: 'İyi', warn: 'Uyarı', fail: 'Sorun',
};
export const HEALTH_STATUS_COLOR: Record<SecHealthStatus, string> = {
  ok: '#22c55e', warn: '#f59e0b', fail: '#ef4444',
};
export const HEALTH_STATUS_ICON: Record<SecHealthStatus, string> = {
  ok: 'checkmark-circle', warn: 'warning', fail: 'close-circle',
};

const today = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

const seedClassification: SecClassificationItem[] = [
  { id: 'c1', field: 'tc_kimlik', table: 'customers', sensitivity: 'pii', recordCount: 4250, encrypted: true, description: 'T.C. kimlik numarası' },
  { id: 'c2', field: 'phone', table: 'customers', sensitivity: 'pii', recordCount: 4250, encrypted: false, description: 'Telefon numarası' },
  { id: 'c3', field: 'email', table: 'customers', sensitivity: 'pii', recordCount: 4250, encrypted: false },
  { id: 'c4', field: 'iban', table: 'invoices', sensitivity: 'confidential', recordCount: 1820, encrypted: true, description: 'Banka hesap bilgisi' },
  { id: 'c5', field: 'location_history', table: 'employees', sensitivity: 'confidential', recordCount: 38400, encrypted: true },
  { id: 'c6', field: 'salary', table: 'employees', sensitivity: 'confidential', recordCount: 64, encrypted: true },
  { id: 'c7', field: 'health_notes', table: 'employees', sensitivity: 'phi', recordCount: 12, encrypted: true, description: 'Sağlık raporları' },
  { id: 'c8', field: 'company_name', table: 'customers', sensitivity: 'public', recordCount: 4250, encrypted: false },
  { id: 'c9', field: 'internal_notes', table: 'work_orders', sensitivity: 'internal', recordCount: 2150, encrypted: false },
  { id: 'c10', field: 'tax_id', table: 'companies', sensitivity: 'confidential', recordCount: 4250, encrypted: false },
];

const seedKvkk: KvkkRequest[] = [
  { id: 'k1', type: 'access', requesterName: 'Ahmet Yıldırım', requesterEmail: 'ahmet@example.com', requestedAt: daysAgo(2), status: 'in_progress', dueDate: daysFromNow(28), notes: 'Tüm verilerin kopyası talep edildi.' },
  { id: 'k2', type: 'erasure', requesterName: 'Selin Akın', requesterEmail: 'selin@example.com', requestedAt: daysAgo(5), status: 'pending', dueDate: daysFromNow(25) },
  { id: 'k3', type: 'rectification', requesterName: 'Mert Çelik', requesterEmail: 'mert@example.com', requestedAt: daysAgo(10), status: 'fulfilled', dueDate: daysFromNow(20) },
  { id: 'k4', type: 'portability', requesterName: 'Eylül Demir', requesterEmail: 'eylul@example.com', requestedAt: daysAgo(15), status: 'fulfilled', dueDate: daysFromNow(15) },
  { id: 'k5', type: 'objection', requesterName: 'Burak Kaya', requesterEmail: 'burak@example.com', requestedAt: daysAgo(20), status: 'rejected', dueDate: daysFromNow(10), notes: 'Yasal gereklilik nedeniyle veriler korunmalı.' },
];

const seedExp: DataExportJob[] = [
  { id: 'e1', userName: 'Ahmet Yıldırım', format: 'json', status: 'completed', requestedAt: daysAgo(2), completedAt: daysAgo(2), sizeMb: 4.8 },
  { id: 'e2', userName: 'Selin Akın', format: 'pdf', status: 'running', requestedAt: daysAgo(1) },
  { id: 'e3', userName: 'Mert Çelik', format: 'csv', status: 'queued', requestedAt: iso(new Date()) },
  { id: 'e4', userName: 'Eylül Demir', format: 'json', status: 'failed', requestedAt: daysAgo(5) },
];

const seedEra: DataErasureJob[] = [
  { id: 'r1', userName: 'Selin Akın', scope: 'anonymize', status: 'completed', requestedAt: daysAgo(7), completedAt: daysAgo(6), affectedRecords: 142 },
  { id: 'r2', userName: 'Anonim Müşteri 1', scope: 'full', status: 'running', requestedAt: daysAgo(1) },
  { id: 'r3', userName: 'Eski Personel', scope: 'partial', status: 'queued', requestedAt: iso(new Date()) },
];

const seedDev: SecDevice[] = [
  { id: 'd1', userName: 'Yönetici', device: 'iPhone 15 Pro', os: 'iOS 17.4', ip: '85.34.12.45', location: 'İstanbul, TR', lastSeen: iso(new Date()), current: true },
  { id: 'd2', userName: 'Yönetici', device: 'MacBook Pro', os: 'macOS 14.5', ip: '85.34.12.45', location: 'İstanbul, TR', lastSeen: daysAgo(0), current: false },
  { id: 'd3', userName: 'Saha Personeli', device: 'Samsung S24', os: 'Android 14', ip: '94.55.21.88', location: 'Ankara, TR', lastSeen: daysAgo(1), current: false },
  { id: 'd4', userName: 'Muhasebe', device: 'Windows PC', os: 'Windows 11', ip: '212.34.5.99', location: 'İstanbul, TR', lastSeen: daysAgo(3), current: false },
  { id: 'd5', userName: 'Yönetici', device: 'Unknown Browser', os: 'Linux', ip: '178.55.21.4', location: 'Berlin, DE', lastSeen: daysAgo(2), current: false },
];

const seedSus: SuspiciousActivity[] = [
  { id: 's1', type: 'login_anomaly', severity: 'high', user: 'Yönetici', at: daysAgo(2), description: 'Berlin, DE üzerinden olağandışı giriş tespit edildi.', resolved: false },
  { id: 's2', type: 'failed_attempts', severity: 'medium', user: 'Muhasebe', at: daysAgo(1), description: '15 dakika içinde 8 başarısız giriş denemesi.', resolved: false },
  { id: 's3', type: 'data_dump', severity: 'critical', user: 'Saha Personeli', at: daysAgo(4), description: '3 dakika içinde 2400 müşteri kaydı sorgulandı.', resolved: true },
  { id: 's4', type: 'permission_escalation', severity: 'high', user: 'Stajyer', at: daysAgo(6), description: 'Standart kullanıcı yönetici endpointlerine istek attı.', resolved: true },
  { id: 's5', type: 'unusual_hour', severity: 'low', user: 'Yönetici', at: daysAgo(0), description: 'Saat 03:24te oturum açıldı.', resolved: false },
];

const seedAlerts: AdminAlert[] = [
  { id: 'a1', kind: 'role_change', title: 'Yeni admin atandı', body: 'Ahmet Yıldırım kullanıcısına admin rolü verildi.', severity: 'warning', at: daysAgo(1), ack: false },
  { id: 'a2', kind: 'mass_delete', title: 'Toplu silme', body: '420 müşteri kaydı silindi.', severity: 'critical', at: daysAgo(2), ack: false },
  { id: 'a3', kind: 'export', title: 'Veri dışa aktarımı', body: 'Tüm müşteri tablosu JSON olarak indirildi.', severity: 'warning', at: daysAgo(3), ack: true },
  { id: 'a4', kind: 'config_change', title: 'API anahtarı değişti', body: 'Supabase service role anahtarı güncellendi.', severity: 'info', at: daysAgo(4), ack: true },
  { id: 'a5', kind: 'failed_backup', title: 'Yedek başarısız', body: 'Gece 02:00 tam yedek alınamadı.', severity: 'critical', at: daysAgo(5), ack: true },
  { id: 'a6', kind: 'security', title: 'Şüpheli IP engellendi', body: 'Berlinden 3 başarısız giriş sonrası blok uygulandı.', severity: 'info', at: daysAgo(0), ack: false },
];

const seedBak: BackupReport[] = [
  { id: 'b1', takenAt: daysAgo(0), sizeMb: 1840, verified: true, durationSec: 384, retentionDays: 30, type: 'incremental' },
  { id: 'b2', takenAt: daysAgo(1), sizeMb: 1820, verified: true, durationSec: 372, retentionDays: 30, type: 'incremental' },
  { id: 'b3', takenAt: daysAgo(7), sizeMb: 12450, verified: true, durationSec: 2840, retentionDays: 90, type: 'full' },
  { id: 'b4', takenAt: daysAgo(14), sizeMb: 12120, verified: false, durationSec: 2740, retentionDays: 90, type: 'full' },
  { id: 'b5', takenAt: daysAgo(21), sizeMb: 11890, verified: true, durationSec: 2680, retentionDays: 90, type: 'full' },
];

const seedDr: DrPlan = {
  rpoMinutes: 15,
  rtoMinutes: 60,
  lastDrillAt: daysAgo(45),
  lastDrillSuccess: true,
  steps: [
    { order: 1, title: 'Olay tespiti ve eskalasyon', responsible: 'On-call Engineer', estimatedMinutes: 5, done: true },
    { order: 2, title: 'Birincil DB sağlık kontrolü', responsible: 'DBA', estimatedMinutes: 5, done: true },
    { order: 3, title: 'Standby replikaya failover', responsible: 'DBA', estimatedMinutes: 10, done: true },
    { order: 4, title: 'Uygulama bağlantı dizgelerini güncelle', responsible: 'DevOps', estimatedMinutes: 10, done: true },
    { order: 5, title: 'Smoke test ve doğrulama', responsible: 'QA', estimatedMinutes: 15, done: false },
    { order: 6, title: 'Müşteri bilgilendirme', responsible: 'Customer Success', estimatedMinutes: 10, done: false },
    { order: 7, title: 'Olay sonrası rapor (postmortem)', responsible: 'Tech Lead', estimatedMinutes: 5, done: false },
  ],
};

const seedHealth: SecHealth = {
  score: 78,
  generatedAt: iso(new Date()),
  items: [
    { label: '2FA aktif kullanıcı oranı', status: 'warn', detail: '%62 (hedef %95)', category: 'auth' },
    { label: 'Yönetici şifre rotasyonu', status: 'ok', detail: 'Son 30 gün içinde değiştirildi', category: 'auth' },
    { label: 'PII alanlarında şifreleme', status: 'warn', detail: '7/10 alan şifrelenmiş', category: 'data' },
    { label: 'KVKK talep yanıt süresi', status: 'ok', detail: 'Ortalama 4 gün (limit 30)', category: 'compliance' },
    { label: 'Yedek doğrulama', status: 'ok', detail: 'Son 7 yedeğin 6sı doğrulandı', category: 'backup' },
    { label: 'DR tatbikatı', status: 'fail', detail: '45 gün önce yapıldı (limit 30 gün)', category: 'backup' },
    { label: 'Şüpheli aktivite incelemeleri', status: 'warn', detail: '3 açık vaka 24 saat geçti', category: 'monitoring' },
    { label: 'Loglama kapsama', status: 'ok', detail: '%98 endpoint loglanıyor', category: 'monitoring' },
    { label: 'Veri sınıflandırması', status: 'ok', detail: '10/10 hassas alan etiketli', category: 'compliance' },
    { label: 'Penetrasyon testi', status: 'warn', detail: 'Son test 6 ay önce', category: 'compliance' },
  ],
};

async function get<T>(key: string, seed: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw) return JSON.parse(raw) as T;
  await AsyncStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
async function set<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const listSecClassification = () => get<SecClassificationItem[]>(K.cls, seedClassification);

export const listKvkkRequests = () => get<KvkkRequest[]>(K.kvkk, seedKvkk);
export async function updateKvkkStatus(id: string, status: KvkkRequestStatus): Promise<void> {
  const list = await listKvkkRequests();
  await set(K.kvkk, list.map(r => (r.id === id ? { ...r, status } : r)));
}
export async function addKvkkRequest(input: Omit<KvkkRequest, 'id' | 'requestedAt' | 'status' | 'dueDate'>): Promise<void> {
  const list = await listKvkkRequests();
  const now = new Date();
  const due = new Date(now); due.setDate(due.getDate() + 30);
  const fresh: KvkkRequest = {
    id: 'k' + Date.now(),
    ...input,
    requestedAt: now.toISOString(),
    status: 'pending',
    dueDate: due.toISOString(),
  };
  await set(K.kvkk, [fresh, ...list]);
}

export const listExportJobs = () => get<DataExportJob[]>(K.exp, seedExp);
export async function addExportJob(userName: string, format: DataExportJob['format']): Promise<void> {
  const list = await listExportJobs();
  const fresh: DataExportJob = {
    id: 'e' + Date.now(), userName, format, status: 'queued', requestedAt: new Date().toISOString(),
  };
  await set(K.exp, [fresh, ...list]);
}

export const listErasureJobs = () => get<DataErasureJob[]>(K.era, seedEra);
export async function addErasureJob(userName: string, scope: DataErasureJob['scope']): Promise<void> {
  const list = await listErasureJobs();
  const fresh: DataErasureJob = {
    id: 'r' + Date.now(), userName, scope, status: 'queued', requestedAt: new Date().toISOString(),
  };
  await set(K.era, [fresh, ...list]);
}

export const listDevices = () => get<SecDevice[]>(K.dev, seedDev);
export async function revokeDevice(id: string): Promise<void> {
  const list = await listDevices();
  await set(K.dev, list.filter(d => d.id !== id));
}

export const listSuspicious = () => get<SuspiciousActivity[]>(K.sus, seedSus);
export async function resolveSuspicious(id: string): Promise<void> {
  const list = await listSuspicious();
  await set(K.sus, list.map(s => (s.id === id ? { ...s, resolved: true } : s)));
}

export const listAdminAlerts = () => get<AdminAlert[]>(K.alert, seedAlerts);
export async function ackAlert(id: string): Promise<void> {
  const list = await listAdminAlerts();
  await set(K.alert, list.map(a => (a.id === id ? { ...a, ack: true } : a)));
}

export const listBackups = () => get<BackupReport[]>(K.bak, seedBak);

export const getDrPlan = () => get<DrPlan>(K.dr, seedDr);
export async function toggleDrStep(order: number): Promise<void> {
  const p = await getDrPlan();
  await set(K.dr, { ...p, steps: p.steps.map(s => (s.order === order ? { ...s, done: !s.done } : s)) });
}
export async function recordDrDrill(success: boolean): Promise<void> {
  const p = await getDrPlan();
  await set(K.dr, { ...p, lastDrillAt: new Date().toISOString(), lastDrillSuccess: success });
}

export const getSecHealth = () => get<SecHealth>(K.health, seedHealth);
