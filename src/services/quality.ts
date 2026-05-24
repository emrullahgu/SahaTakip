// Faz 45 — Kurumsal Kalite, Denetim ve Uygunsuzluk
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  NonConformityRecord, NonConformityKind, NonConformitySeverity, NonConformityStatus,
  CapaRecord, CapaKind, CapaStatus,
  SafetyChecklist, SafetyChecklistItem,
  RiskAssessment,
  AuditScheduleEntry, AuditStatus,
  AuditReport, AuditScoreSection,
  QualityDashboardStat,
} from '../types';

const K_NC = 'q_nc_v1';
const K_CAPA = 'q_capa_v1';
const K_CHK = 'q_checklists_v1';
const K_RISK = 'q_risks_v1';
const K_AUDIT = 'q_audits_v1';
const K_REPORT = 'q_reports_v1';

export const NC_KIND_LABEL: Record<NonConformityKind, string> = {
  safety: 'İş Güvenliği', quality: 'Kalite', process: 'Süreç', documentation: 'Dokümantasyon', environmental: 'Çevre',
};
export const NC_KIND_COLOR: Record<NonConformityKind, string> = {
  safety: '#ef4444', quality: '#f59e0b', process: '#0ea5e9', documentation: '#8b5cf6', environmental: '#22c55e',
};
export const NC_KIND_ICON: Record<NonConformityKind, string> = {
  safety: 'warning', quality: 'ribbon', process: 'git-network', documentation: 'document-text', environmental: 'leaf',
};
export const NC_SEV_LABEL: Record<NonConformitySeverity, string> = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik' };
export const NC_SEV_COLOR: Record<NonConformitySeverity, string> = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
export const NC_STATUS_LABEL: Record<NonConformityStatus, string> = { open: 'Açık', in_progress: 'İşlemde', closed: 'Kapalı', overdue: 'Gecikmiş' };
export const NC_STATUS_COLOR: Record<NonConformityStatus, string> = { open: '#ef4444', in_progress: '#0ea5e9', closed: '#22c55e', overdue: '#f97316' };

export const CAPA_KIND_LABEL: Record<CapaKind, string> = { corrective: 'Düzeltici', preventive: 'Önleyici' };
export const CAPA_KIND_COLOR: Record<CapaKind, string> = { corrective: '#ef4444', preventive: '#0ea5e9' };
export const CAPA_STATUS_LABEL: Record<CapaStatus, string> = { planned: 'Planlandı', in_progress: 'İşlemde', done: 'Tamamlandı' };
export const CAPA_STATUS_COLOR: Record<CapaStatus, string> = { planned: '#64748b', in_progress: '#0ea5e9', done: '#22c55e' };

export const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = { planned: 'Planlandı', in_progress: 'İşlemde', completed: 'Tamamlandı', overdue: 'Gecikmiş' };
export const AUDIT_STATUS_COLOR: Record<AuditStatus, string> = { planned: '#64748b', in_progress: '#0ea5e9', completed: '#22c55e', overdue: '#ef4444' };

const nid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const addDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const subDays = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

async function read<T>(key: string, seed: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) { await AsyncStorage.setItem(key, JSON.stringify(seed)); return seed; }
  try { return JSON.parse(raw) as T; } catch { return seed; }
}
async function write<T>(key: string, data: T) { await AsyncStorage.setItem(key, JSON.stringify(data)); }

// ---------- Non-Conformity ----------
const NC_SEED: NonConformityRecord[] = [];

const computeOverdue = (n: NonConformityRecord): NonConformityRecord => {
  if (n.status === 'closed') return n;
  if (n.dueAt && new Date(n.dueAt).getTime() < Date.now()) return { ...n, status: 'overdue' };
  return n;
};

export const listNonConformities = async (): Promise<NonConformityRecord[]> => (await read(K_NC, NC_SEED)).map(computeOverdue);
export const saveNonConformity = async (nc: NonConformityRecord) => {
  const list = await read(K_NC, NC_SEED);
  const i = list.findIndex(x => x.id === nc.id);
  if (i >= 0) list[i] = nc; else list.unshift(nc);
  await write(K_NC, list);
};
export const createNonConformity = async (input: Omit<NonConformityRecord, 'id' | 'code' | 'reportedAt' | 'status'>): Promise<NonConformityRecord> => {
  const list = await read(K_NC, NC_SEED);
  const code = `NC-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, '0')}`;
  const rec: NonConformityRecord = { ...input, id: nid(), code, reportedAt: now(), status: 'open' };
  list.unshift(rec);
  await write(K_NC, list);
  return rec;
};
export const updateNcStatus = async (id: string, status: NonConformityStatus) => {
  const list = await read(K_NC, NC_SEED);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) {
    list[i].status = status;
    if (status === 'closed') list[i].closedAt = now();
    await write(K_NC, list);
  }
};
export const addNcPhoto = async (id: string, uri: string) => {
  const list = await read(K_NC, NC_SEED);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) { list[i].photoUris = [...(list[i].photoUris || []), uri]; await write(K_NC, list); }
};
export const assignNc = async (id: string, assignedTo: string, dueAt?: string) => {
  const list = await read(K_NC, NC_SEED);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) { list[i].assignedTo = assignedTo; if (dueAt) list[i].dueAt = dueAt; if (list[i].status === 'open') list[i].status = 'in_progress'; await write(K_NC, list); }
};

// ---------- CAPA ----------
const CAPA_SEED: CapaRecord[] = [];
export const listCapa = async (): Promise<CapaRecord[]> => read(K_CAPA, CAPA_SEED);
export const saveCapa = async (c: CapaRecord) => {
  const list = await read(K_CAPA, CAPA_SEED);
  const i = list.findIndex(x => x.id === c.id);
  if (i >= 0) list[i] = c; else list.unshift(c);
  await write(K_CAPA, list);
};
export const createCapa = async (input: Omit<CapaRecord, 'id' | 'status'>): Promise<CapaRecord> => {
  const list = await read(K_CAPA, CAPA_SEED);
  const rec: CapaRecord = { ...input, id: nid(), status: 'planned' };
  list.unshift(rec);
  await write(K_CAPA, list);
  return rec;
};
export const updateCapaStatus = async (id: string, status: CapaStatus, effectiveness?: number) => {
  const list = await read(K_CAPA, CAPA_SEED);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) {
    list[i].status = status;
    if (status === 'done') { list[i].completedAt = now(); if (effectiveness) list[i].effectiveness = effectiveness; }
    await write(K_CAPA, list);
  }
};

// ---------- Safety Checklists ----------
const CHK_SEED: SafetyChecklist[] = [];
export const listChecklists = async (): Promise<SafetyChecklist[]> => read(K_CHK, CHK_SEED);
export const saveChecklist = async (c: SafetyChecklist) => {
  const list = await read(K_CHK, CHK_SEED);
  const i = list.findIndex(x => x.id === c.id);
  if (i >= 0) list[i] = c; else list.unshift(c);
  await write(K_CHK, list);
};
export const createChecklist = async (title: string, location: string, performedBy: string, items: SafetyChecklistItem[]): Promise<SafetyChecklist> => {
  const total = items.length || 1;
  const ok = items.filter(i => i.checked).length;
  const score = Math.round((ok / total) * 100);
  const rec: SafetyChecklist = { id: nid(), title, location, performedBy, performedAt: now(), items, score, passed: score >= 80 };
  const list = await read(K_CHK, CHK_SEED);
  list.unshift(rec);
  await write(K_CHK, list);
  return rec;
};

// ---------- Risk Assessment ----------
const RISK_SEED: RiskAssessment[] = [];
export const listRisks = async (): Promise<RiskAssessment[]> => read(K_RISK, RISK_SEED);
export const saveRisk = async (r: RiskAssessment) => {
  const list = await read(K_RISK, RISK_SEED);
  const i = list.findIndex(x => x.id === r.id);
  if (i >= 0) list[i] = r; else list.unshift(r);
  await write(K_RISK, list);
};
export const createRisk = async (input: Omit<RiskAssessment, 'id' | 'score' | 'createdAt'>): Promise<RiskAssessment> => {
  const rec: RiskAssessment = { ...input, id: nid(), score: input.likelihood * input.severity, createdAt: now() };
  const list = await read(K_RISK, RISK_SEED);
  list.unshift(rec);
  await write(K_RISK, list);
  return rec;
};
export const riskColor = (score: number) => score >= 15 ? '#ef4444' : score >= 9 ? '#f97316' : score >= 5 ? '#f59e0b' : '#22c55e';
export const riskLabel = (score: number) => score >= 15 ? 'Çok Yüksek' : score >= 9 ? 'Yüksek' : score >= 5 ? 'Orta' : 'Düşük';

// ---------- Audit Schedule ----------
const AUDIT_SEED: AuditScheduleEntry[] = [];

const computeAuditStatus = (a: AuditScheduleEntry): AuditScheduleEntry => {
  if (a.status === 'completed') return a;
  if (a.status === 'in_progress') return a;
  if (new Date(a.plannedAt).getTime() < Date.now()) return { ...a, status: 'overdue' };
  return a;
};

export const listAudits = async (): Promise<AuditScheduleEntry[]> => (await read(K_AUDIT, AUDIT_SEED)).map(computeAuditStatus);
export const saveAudit = async (a: AuditScheduleEntry) => {
  const list = await read(K_AUDIT, AUDIT_SEED);
  const i = list.findIndex(x => x.id === a.id);
  if (i >= 0) list[i] = a; else list.unshift(a);
  await write(K_AUDIT, list);
};
export const createAudit = async (input: Omit<AuditScheduleEntry, 'id' | 'status'>): Promise<AuditScheduleEntry> => {
  const rec: AuditScheduleEntry = { ...input, id: nid(), status: 'planned' };
  const list = await read(K_AUDIT, AUDIT_SEED);
  list.unshift(rec);
  await write(K_AUDIT, list);
  return rec;
};
export const updateAuditStatus = async (id: string, status: AuditStatus) => {
  const list = await read(K_AUDIT, AUDIT_SEED);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) { list[i].status = status; await write(K_AUDIT, list); }
};

// ---------- Audit Reports ----------
const REPORT_SEED: AuditReport[] = [];
export const listReports = async (): Promise<AuditReport[]> => read(K_REPORT, REPORT_SEED);
export const createReport = async (auditTitle: string, auditor: string, sections: AuditScoreSection[], findings: string[]): Promise<AuditReport> => {
  const totalScore = sections.reduce((a, s) => a + s.score, 0);
  const maxScore = sections.reduce((a, s) => a + s.maxScore, 0) || 1;
  const percent = Math.round((totalScore / maxScore) * 100);
  const rec: AuditReport = { id: nid(), auditTitle, auditor, performedAt: now(), sections, totalScore, maxScore, percent, findings };
  const list = await read(K_REPORT, REPORT_SEED);
  list.unshift(rec);
  await write(K_REPORT, list);
  return rec;
};

// ---------- Dashboard ----------
export const computeQualityDashboard = async (): Promise<QualityDashboardStat> => {
  const ncs = await listNonConformities();
  const openCount = ncs.filter(n => n.status === 'open' || n.status === 'in_progress').length;
  const overdueCount = ncs.filter(n => n.status === 'overdue').length;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const closed = ncs.filter(n => n.status === 'closed' && n.closedAt && new Date(n.closedAt).getTime() >= monthStart.getTime());
  const closedThisMonth = closed.length;
  const closures = ncs.filter(n => n.status === 'closed' && n.closedAt).map(n => (new Date(n.closedAt!).getTime() - new Date(n.reportedAt).getTime()) / 86400000);
  const avgClosureDays = closures.length === 0 ? 0 : Math.round((closures.reduce((a, b) => a + b, 0) / closures.length) * 10) / 10;
  // repeat rate = NC with same kind/location appearing >1 in last 90 days
  const cutoff = Date.now() - 90 * 86400000;
  const recent = ncs.filter(n => new Date(n.reportedAt).getTime() >= cutoff);
  const groupKey = (n: NonConformityRecord) => `${n.kind}__${n.location}`;
  const groups = new Map<string, number>();
  recent.forEach(n => groups.set(groupKey(n), (groups.get(groupKey(n)) || 0) + 1));
  const repeats = Array.from(groups.values()).filter(v => v > 1).reduce((a, b) => a + b, 0);
  const repeatRate = recent.length === 0 ? 0 : Math.round((repeats / recent.length) * 100);

  const kinds: NonConformityKind[] = ['safety', 'quality', 'process', 'documentation', 'environmental'];
  const byKind = kinds.map(k => ({ kind: k, count: ncs.filter(n => n.kind === k).length }));
  const statuses: NonConformityStatus[] = ['open', 'in_progress', 'closed', 'overdue'];
  const byStatus = statuses.map(s => ({ status: s, count: ncs.filter(n => n.status === s).length }));

  return { openCount, overdueCount, closedThisMonth, avgClosureDays, repeatRate, byKind, byStatus };
};
