// Faz 42 — Saha Operasyon Servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FieldShift, FieldJob, FieldChecklistItem, FieldQualityCheck, FieldPerformance,
  FieldZone, FieldShiftPlan, FieldEmergencyDispatch, FieldOpsLiveStat,
  FieldShiftStatus, FieldJobStage, FieldPriority, FieldChecklistType,
} from '../types';
import { supabase } from './supabase';
import { shiftsRepo } from './data/shiftsRepo';

const K = {
  shift: 'fo_shift_v1',
  jobs: 'fo_jobs_v1',
  check: 'fo_check_v1',
  qc: 'fo_qc_v1',
  perf: 'fo_perf_v1',
  zones: 'fo_zones_v1',
  plan: 'fo_plan_v1',
  emerg: 'fo_emerg_v1',
};

export const PRIORITY_COLOR: Record<FieldPriority, string> = { low: '#64748b', normal: '#0ea5e9', high: '#f97316', urgent: '#ef4444' };
export const PRIORITY_LABEL: Record<FieldPriority, string> = { low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil' };
export const STAGE_COLOR: Record<FieldJobStage, string> = { assigned: '#64748b', enroute: '#0ea5e9', arrived: '#06b6d4', in_progress: '#f59e0b', completed: '#22c55e', cancelled: '#ef4444' };
export const STAGE_LABEL: Record<FieldJobStage, string> = { assigned: 'Atandı', enroute: 'Yolda', arrived: 'Varıldı', in_progress: 'Devam', completed: 'Tamamlandı', cancelled: 'İptal' };
export const SHIFT_LABEL: Record<FieldShiftStatus, string> = { idle: 'Mesai Yok', on_shift: 'Mesaide', on_break: 'Molada', finished: 'Bitti' };
export const SHIFT_COLOR: Record<FieldShiftStatus, string> = { idle: '#64748b', on_shift: '#22c55e', on_break: '#f59e0b', finished: '#0ea5e9' };
export const CHECK_TYPE_LABEL: Record<FieldChecklistType, string> = { photo: 'Fotoğraf', signature: 'İmza', form: 'Form', location: 'Konum', note: 'Not' };
export const CHECK_TYPE_ICON: Record<FieldChecklistType, string> = { photo: 'camera', signature: 'create', form: 'document-text', location: 'location', note: 'chatbox' };

const get = async <T,>(key: string, fallback: T): Promise<T> => {
  try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const set = async (key: string, v: unknown) => { try { await AsyncStorage.setItem(key, JSON.stringify(v)); } catch {} };

function uid(p: string) { return `${p}-${Date.now()}-${Math.floor(Math.random() * 9999)}`; }

// === SHIFT ===
async function seedShift(): Promise<FieldShift> {
  return { id: 'shift-self', userId: '', userName: '', status: 'idle', totalMinutes: 0, breakMinutes: 0, remoteShiftId: null };
}
export async function getShift(): Promise<FieldShift> {
  const cur = await get<FieldShift | null>(K.shift, null);
  if (cur) return cur;
  const s = await seedShift();
  await set(K.shift, s);
  return s;
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch { return null; }
}

export async function startShift(): Promise<FieldShift> {
  const s = await getShift();
  s.status = 'on_shift';
  s.startedAt = new Date().toISOString();
  s.endedAt = undefined;
  // Supabase senkronu (canlı mesai paneline yansısın diye)
  let auditUid: string | null = null;
  try {
    const uid = await currentUserId();
    auditUid = uid;
    if (uid) {
      s.userId = uid;
      const remote = await shiftsRepo.start(uid);
      if (remote?.id) s.remoteShiftId = remote.id;
    }
  } catch (e: any) {
    console.warn('[fieldOps.startShift.sync]', e?.message ?? e);
  }
  await set(K.shift, s);
  if (auditUid) {
    try {
      const { auditRepo } = await import('./data/auditRepo');
      void auditRepo.log(auditUid, { action: 'shift.start', tableName: 'shifts', refId: s.remoteShiftId ?? 'local' });
    } catch {}
  }
  return s;
}
export async function endShift(): Promise<FieldShift> {
  const s = await getShift();
  s.status = 'finished';
  s.endedAt = new Date().toISOString();
  if (s.startedAt) s.totalMinutes = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000);
  // Supabase senkronu — her durumda user_id üzerinden tüm aktif vardıyaları kapat
  let auditUid: string | null = null;
  let syncError: Error | null = null;
  try {
    const uid = await currentUserId();
    auditUid = uid;
    if (uid) {
      // Once spesifik shiftId ile dene, sonra güvenli fallback (forceEndByUser).
      if (s.remoteShiftId) {
        try { await shiftsRepo.end(s.remoteShiftId); } catch (e: any) {
          console.warn('[fieldOps.endShift.byId]', e?.message ?? e);
          syncError = e instanceof Error ? e : new Error(String(e?.message ?? e));
        }
      }
      try {
        const closed = await shiftsRepo.forceEndByUser(uid);
        if (closed > 0) {
          console.log('[fieldOps.endShift] forceEnd kapattı:', closed);
          syncError = null; // forceEnd başarılıysa sorun yok
        }
      } catch (e: any) {
        console.warn('[fieldOps.endShift.force]', e?.message ?? e);
        syncError = e instanceof Error ? e : new Error(String(e?.message ?? e));
      }
    }
    s.remoteShiftId = null;
  } catch (e: any) {
    console.warn('[fieldOps.endShift.sync]', e?.message ?? e);
    syncError = e instanceof Error ? e : new Error(String(e?.message ?? e));
  }
  await set(K.shift, s);
  // Audit
  if (auditUid) {
    try {
      const { auditRepo } = await import('./data/auditRepo');
      void auditRepo.log(auditUid, { action: 'shift.end', tableName: 'shifts', refId: s.remoteShiftId ?? 'local', meta: { totalMinutes: s.totalMinutes } });
    } catch {}
  }
  if (syncError) throw syncError;
  return s;
}
export async function toggleBreak(): Promise<FieldShift> {
  const s = await getShift();
  s.status = s.status === 'on_break' ? 'on_shift' : 'on_break';
  await set(K.shift, s); return s;
}

// === JOBS ===
async function seedJobs(): Promise<FieldJob[]> {
  return [];
}
export async function listJobs(): Promise<FieldJob[]> {
  const cur = await get<FieldJob[] | null>(K.jobs, null);
  if (cur) return cur;
  const s = await seedJobs(); await set(K.jobs, s); return s;
}
export async function getJob(id: string): Promise<FieldJob | undefined> {
  return (await listJobs()).find(j => j.id === id);
}
export async function updateJob(id: string, patch: Partial<FieldJob>): Promise<void> {
  const list = await listJobs();
  const idx = list.findIndex(j => j.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch };
  await set(K.jobs, list);
}
export async function advanceStage(id: string, next: FieldJobStage): Promise<void> {
  const ts = new Date().toISOString();
  const patch: Partial<FieldJob> = { stage: next };
  if (next === 'enroute' && !(await getJob(id))?.startedAt) patch.startedAt = ts;
  if (next === 'arrived') patch.arrivedAt = ts;
  if (next === 'completed') patch.completedAt = ts;
  await updateJob(id, patch);
}
export async function smartSortJobs(): Promise<FieldJob[]> {
  const list = await listJobs();
  const score = (j: FieldJob) => {
    const pr = j.priority === 'urgent' ? 0 : j.priority === 'high' ? 1 : j.priority === 'normal' ? 2 : 3;
    const sla = j.slaAt ? new Date(j.slaAt).getTime() : Number.MAX_SAFE_INTEGER;
    return pr * 1e13 + sla;
  };
  return [...list].filter(j => j.stage !== 'completed' && j.stage !== 'cancelled').sort((a, b) => score(a) - score(b));
}

// === CHECKLIST ===
async function seedChecklist(jobId: string): Promise<FieldChecklistItem[]> {
  return [
    { id: uid('ci'), jobId, type: 'photo', label: 'Ekipman fotoğrafı (önce)', required: true, done: false },
    { id: uid('ci'), jobId, type: 'location', label: 'Konum doğrulama', required: true, done: false },
    { id: uid('ci'), jobId, type: 'form', label: 'Bakım formu', required: true, done: false },
    { id: uid('ci'), jobId, type: 'photo', label: 'Ekipman fotoğrafı (sonra)', required: true, done: false },
    { id: uid('ci'), jobId, type: 'signature', label: 'Müşteri imzası', required: true, done: false },
    { id: uid('ci'), jobId, type: 'note', label: 'Genel notlar', required: false, done: false },
  ];
}
export async function listChecklist(jobId: string): Promise<FieldChecklistItem[]> {
  const all = await get<FieldChecklistItem[]>(K.check, []);
  let job = all.filter(c => c.jobId === jobId);
  if (job.length === 0) {
    job = await seedChecklist(jobId);
    await set(K.check, [...all, ...job]);
  }
  return job;
}
export async function toggleChecklist(id: string): Promise<void> {
  const all = await get<FieldChecklistItem[]>(K.check, []);
  const idx = all.findIndex(c => c.id === id);
  if (idx < 0) return;
  all[idx].done = !all[idx].done;
  all[idx].doneAt = all[idx].done ? new Date().toISOString() : undefined;
  await set(K.check, all);
}
export async function canCloseJob(jobId: string): Promise<{ ok: boolean; missing: string[] }> {
  const items = await listChecklist(jobId);
  const missing = items.filter(i => i.required && !i.done).map(i => i.label);
  return { ok: missing.length === 0, missing };
}

// === QC ===
export async function listQC(): Promise<FieldQualityCheck[]> { return get<FieldQualityCheck[]>(K.qc, []); }
export async function getQCForJob(jobId: string): Promise<FieldQualityCheck | undefined> {
  return (await listQC()).find(q => q.jobId === jobId);
}
export async function saveQC(q: Omit<FieldQualityCheck, 'id' | 'reviewedAt'>): Promise<FieldQualityCheck> {
  const all = await listQC();
  const existing = all.find(x => x.jobId === q.jobId);
  const item: FieldQualityCheck = existing
    ? { ...existing, ...q }
    : { ...q, id: uid('qc'), reviewedAt: new Date().toISOString() };
  const next = existing ? all.map(x => (x.jobId === q.jobId ? item : x)) : [item, ...all];
  await set(K.qc, next);
  return item;
}

// === PERFORMANCE ===
async function seedPerf(): Promise<FieldPerformance[]> {
  return [];
}
export async function listPerformance(): Promise<FieldPerformance[]> {
  const cur = await get<FieldPerformance[] | null>(K.perf, null);
  const list = cur || (await seedPerf());
  if (!cur) await set(K.perf, list);
  const sorted = [...list].sort((a, b) => (b.onTimeRate + b.qualityScore + b.customerScore) - (a.onTimeRate + a.qualityScore + a.customerScore));
  return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
}

// === ZONES ===
async function seedZones(): Promise<FieldZone[]> {
  return [];
}
export async function listZones(): Promise<FieldZone[]> {
  const cur = await get<FieldZone[] | null>(K.zones, null);
  if (cur) return cur;
  const s = await seedZones(); await set(K.zones, s); return s;
}

// === SHIFT PLAN ===
async function seedPlan(): Promise<FieldShiftPlan[]> {
  return [];
}
export async function listPlan(): Promise<FieldShiftPlan[]> {
  const cur = await get<FieldShiftPlan[] | null>(K.plan, null);
  if (cur) return cur;
  const s = await seedPlan(); await set(K.plan, s); return s;
}
export async function addPlan(p: Omit<FieldShiftPlan, 'id'>): Promise<void> {
  const list = await listPlan();
  await set(K.plan, [{ ...p, id: uid('sp') }, ...list]);
}
export async function deletePlan(id: string): Promise<void> {
  const list = await listPlan();
  await set(K.plan, list.filter(p => p.id !== id));
}

// === EMERGENCY ===
async function seedEmerg(): Promise<FieldEmergencyDispatch[]> {
  return [];
}
export async function listEmergencies(): Promise<FieldEmergencyDispatch[]> {
  const cur = await get<FieldEmergencyDispatch[] | null>(K.emerg, null);
  if (cur) return cur;
  const s = await seedEmerg(); await set(K.emerg, s); return s;
}
export async function dispatchEmergency(id: string, userName: string, etaMinutes: number): Promise<void> {
  const list = await listEmergencies();
  const next = list.map(e => e.id === id ? { ...e, status: 'dispatched' as const, dispatchedUserName: userName, etaMinutes } : e);
  await set(K.emerg, next);
}
export async function resolveEmergency(id: string): Promise<void> {
  const list = await listEmergencies();
  await set(K.emerg, list.map(e => e.id === id ? { ...e, status: 'resolved' as const } : e));
}
export async function createEmergency(title: string, address: string, priority: FieldPriority = 'urgent'): Promise<FieldEmergencyDispatch> {
  const list = await listEmergencies();
  const item: FieldEmergencyDispatch = { id: uid('ed'), title, address, createdAt: new Date().toISOString(), status: 'pending', priority };
  await set(K.emerg, [item, ...list]);
  return item;
}

// === COMMAND CENTER LIVE STATS ===
export async function getLiveStats(): Promise<FieldOpsLiveStat[]> {
  const jobs = await listJobs();
  const emerg = await listEmergencies();
  return [
    { id: 'active', label: 'Aktif İş', value: jobs.filter(j => j.stage === 'in_progress' || j.stage === 'enroute' || j.stage === 'arrived').length, color: '#0ea5e9', icon: 'briefcase' },
    { id: 'done', label: 'Tamamlanan', value: jobs.filter(j => j.stage === 'completed').length, color: '#22c55e', icon: 'checkmark-circle' },
    { id: 'urgent', label: 'Acil', value: jobs.filter(j => j.priority === 'urgent' && j.stage !== 'completed').length, color: '#ef4444', icon: 'warning' },
    { id: 'pending_em', label: 'Bekleyen Acil', value: emerg.filter(e => e.status === 'pending').length, color: '#f97316', icon: 'flash' },
  ];
}
