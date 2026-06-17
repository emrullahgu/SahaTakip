// Faz 49 — Güvenlik, KVKK ve Kurumsal Dayanıklılık servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
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

const seedClassification: SecClassificationItem[] = [];

const seedKvkk: KvkkRequest[] = [];

const seedExp: DataExportJob[] = [];

const seedEra: DataErasureJob[] = [];

const seedDev: SecDevice[] = [];

const seedSus: SuspiciousActivity[] = [];

const seedAlerts: AdminAlert[] = [];

const seedBak: BackupReport[] = [];

const seedDr: DrPlan = {
  rpoMinutes: 15,
  rtoMinutes: 60,
  lastDrillAt: '',
  lastDrillSuccess: false,
  steps: [],
};

const seedHealth: SecHealth = {
  score: 0,
  generatedAt: iso(new Date()),
  items: [],
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
// scope==='full' + userId verilirse GERÇEK silme yapılır: sunucu RPC'si
// (kvkk_erase_user) veri sahibinin konum/vardiya/check-in/geofence PII'sini
// atomik siler ve job 'completed'/'failed' olarak işaretlenir (önceden her zaman
// 'queued' kalıp hiçbir şey yapmıyordu — Req#3 dürüstlük ihlali). Diğer kapsamlar
// (anonymize/partial) veya userId yoksa eski 'queued' davranışı korunur.
export async function addErasureJob(
  userName: string,
  scope: DataErasureJob['scope'],
  userId?: string,
): Promise<DataErasureJob> {
  const list = await listErasureJobs();
  const base: DataErasureJob = {
    id: 'r' + Date.now(), userName, scope, status: 'queued', requestedAt: new Date().toISOString(),
  };

  if (scope === 'full' && userId) {
    try {
      const { data, error } = await supabase.rpc('kvkk_erase_user', { p_user: userId });
      if (error) throw new Error(error.message);
      const affected = data && typeof data === 'object'
        ? Object.values(data as Record<string, unknown>).reduce<number>((a, b) => a + (Number(b) || 0), 0)
        : 0;
      const done: DataErasureJob = { ...base, status: 'completed', completedAt: new Date().toISOString(), affectedRecords: affected };
      await set(K.era, [done, ...list]);
      return done;
    } catch (e) {
      console.warn('[kvkk.erase]', e);
      const failed: DataErasureJob = { ...base, status: 'failed', completedAt: new Date().toISOString() };
      await set(K.era, [failed, ...list]);
      return failed;
    }
  }

  await set(K.era, [base, ...list]);
  return base;
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
