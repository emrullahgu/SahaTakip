// inspections.ts — POZ-DEV-087, POZ-DEV-088
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Inspection,
  InspectionItem,
  InspectionType,
  Nonconformity,
  NonconformitySeverity,
  NonconformityStatus,
} from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const INS_KEY = '@SahaTakip:inspections';
const NC_KEY = '@SahaTakip:nonconformities';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function insFromRow(r: any): Inspection {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    assetId: r.asset_id || undefined,
    customerId: r.customer_id || undefined,
    workOrderId: r.work_order_id || undefined,
    inspectorId: r.inspector_id || undefined,
    date: r.date,
    items: r.items || [],
    score: r.score ?? 0,
    status: r.status,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  } as Inspection;
}
function insToRow(i: Inspection) {
  return {
    type: i.type,
    title: i.title,
    asset_id: uuidOrNull(i.assetId),
    customer_id: uuidOrNull(i.customerId),
    work_order_id: uuidOrNull(i.workOrderId),
    inspector_id: uuidOrNull(i.inspectorId),
    date: i.date,
    items: i.items || [],
    score: i.score,
    status: i.status,
    notes: i.notes || null,
    created_at: i.createdAt,
  };
}
function ncFromRow(r: any): Nonconformity {
  return {
    id: r.id,
    inspectionId: r.inspection_id || undefined,
    assetId: r.asset_id || undefined,
    customerId: r.customer_id || undefined,
    description: r.description,
    severity: r.severity,
    status: r.status,
    assignedToId: r.assigned_to || undefined,
    dueDate: r.due_date || undefined,
    correctiveAction: r.corrective_action || undefined,
    rootCause: r.root_cause || undefined,
    closedAt: r.closed_at || undefined,
    closedBy: r.closed_by || undefined,
    createdAt: r.created_at,
  } as Nonconformity;
}
function ncToRow(n: Nonconformity) {
  return {
    inspection_id: uuidOrNull(n.inspectionId),
    asset_id: uuidOrNull(n.assetId),
    customer_id: uuidOrNull(n.customerId),
    description: n.description,
    severity: n.severity,
    status: n.status,
    assigned_to: uuidOrNull(n.assignedToId),
    due_date: n.dueDate || null,
    corrective_action: n.correctiveAction || null,
    root_cause: n.rootCause || null,
    closed_at: n.closedAt || null,
    closed_by: uuidOrNull(n.closedBy),
    created_at: n.createdAt,
  };
}

function rid(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// --- Inspections -------------------------------------------------------------

export async function listInspections(): Promise<Inspection[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('inspections').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(insFromRow);
        await AsyncStorage.setItem(INS_KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(INS_KEY);
    return raw ? (JSON.parse(raw) as Inspection[]) : [];
  } catch {
    return [];
  }
}

export async function getInspection(id: string): Promise<Inspection | undefined> {
  const all = await listInspections();
  return all.find(i => i.id === id);
}

export function computeScore(items: InspectionItem[]): number {
  const evaluable = items.filter(i => i.status !== 'na');
  if (evaluable.length === 0) return 100;
  const ok = evaluable.filter(i => i.status === 'ok').length;
  return Math.round((ok / evaluable.length) * 100);
}

export async function createInspection(
  input: Omit<Inspection, 'id' | 'createdAt' | 'score'> & { score?: number },
): Promise<Inspection> {
  const all = await listInspections();
  let next: Inspection = {
    ...input,
    id: rid('ins'),
    score: input.score ?? computeScore(input.items),
    createdAt: new Date().toISOString(),
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('inspections').insert(insToRow(next)).select().single();
      if (!error && data) next = insFromRow(data);
    } catch { /* offline */ }
  }
  all.unshift(next);
  await AsyncStorage.setItem(INS_KEY, JSON.stringify(all));
  return next;
}

export async function updateInspection(
  id: string,
  patch: Partial<Inspection>,
): Promise<Inspection | undefined> {
  const all = await listInspections();
  const i = all.findIndex(x => x.id === id);
  if (i < 0) return undefined;
  const merged = { ...all[i], ...patch, id: all[i].id };
  if (patch.items) merged.score = computeScore(merged.items);
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try {
      const row: any = insToRow(merged);
      delete row.created_at;
      await supabase.from('inspections').update(row).eq('id', id);
    } catch { /* offline */ }
  }
  all[i] = merged;
  await AsyncStorage.setItem(INS_KEY, JSON.stringify(all));
  return merged;
}

export async function deleteInspection(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('inspections').delete().eq('id', id); } catch { /* offline */ }
  }
  const all = await listInspections();
  await AsyncStorage.setItem(INS_KEY, JSON.stringify(all.filter(x => x.id !== id)));
}

// Hazır kontrol listesi şablonları
export const INSPECTION_TEMPLATES: Record<InspectionType, { title: string; questions: string[] }> = {
  audit: {
    title: 'Genel Denetim',
    questions: [
      'Saha güvenli ve düzenli mi?',
      'Acil çıkış yolları açık mı?',
      'Yangın söndürücüler erişilebilir mi?',
      'Etiketleme ve uyarı işaretleri tam mı?',
      'Kayıtlar güncel ve eksiksiz mi?',
    ],
  },
  safety: {
    title: 'İş Güvenliği Kontrol',
    questions: [
      'KKD eksiksiz kullanılıyor mu?',
      'Topraklama bağlantıları sağlam mı?',
      'Yüksek gerilim ikaz levhaları yerinde mi?',
      'Pano kapakları kilitli mi?',
      'Yangın güvenliği ekipmanı çalışır durumda mı?',
    ],
  },
  quality: {
    title: 'Kalite Kontrol',
    questions: [
      'Montaj projeye uygun mu?',
      'Kablo etiketleri ve renk kodu doğru mu?',
      'Sıkma torkları kontrol edildi mi?',
      'Test sonuçları kabul sınırları içinde mi?',
      'Temizlik ve son işçilik tamam mı?',
    ],
  },
  commissioning: {
    title: 'Devreye Alma',
    questions: [
      'İzolasyon direnci ölçümü uygun mu?',
      'Faz sırası doğru mu?',
      'Koruma röleleri ayarlandı mı?',
      'Yük dengesi kontrol edildi mi?',
      'Müşteri eğitimi verildi mi?',
    ],
  },
  periodic: {
    title: 'Periyodik Kontrol',
    questions: [
      'Önceki periyot uygunsuzlukları kapatıldı mı?',
      'Görsel kontroller yapıldı mı?',
      'Ölçüm değerleri normal mi?',
      'Bağlantı sıkmaları yapıldı mı?',
      'Temizlik ve bakım tamamlandı mı?',
    ],
  },
};

export function buildItemsFromTemplate(type: InspectionType): InspectionItem[] {
  return INSPECTION_TEMPLATES[type].questions.map((q, idx) => ({
    id: 'q' + idx + '_' + Math.random().toString(36).slice(2, 6),
    question: q,
    status: 'ok',
  }));
}

// --- Nonconformities --------------------------------------------------------

export async function listNonconformities(): Promise<Nonconformity[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('nonconformities').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(ncFromRow);
        await AsyncStorage.setItem(NC_KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(NC_KEY);
    return raw ? (JSON.parse(raw) as Nonconformity[]) : [];
  } catch {
    return [];
  }
}

export async function createNonconformity(
  input: Omit<Nonconformity, 'id' | 'createdAt' | 'status'> & { status?: NonconformityStatus },
): Promise<Nonconformity> {
  const all = await listNonconformities();
  let next: Nonconformity = {
    ...input,
    id: rid('nc'),
    status: input.status || 'open',
    createdAt: new Date().toISOString(),
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('nonconformities').insert(ncToRow(next)).select().single();
      if (!error && data) next = ncFromRow(data);
    } catch { /* offline */ }
  }
  all.unshift(next);
  await AsyncStorage.setItem(NC_KEY, JSON.stringify(all));
  return next;
}

export async function updateNonconformity(
  id: string,
  patch: Partial<Nonconformity>,
): Promise<Nonconformity | undefined> {
  const all = await listNonconformities();
  const i = all.findIndex(x => x.id === id);
  if (i < 0) return undefined;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  if (patch.status === 'closed' && !all[i].closedAt) {
    all[i].closedAt = new Date().toISOString();
  }
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try {
      const row: any = ncToRow(all[i]);
      delete row.created_at;
      await supabase.from('nonconformities').update(row).eq('id', id);
    } catch { /* offline */ }
  }
  await AsyncStorage.setItem(NC_KEY, JSON.stringify(all));
  return all[i];
}

export async function deleteNonconformity(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('nonconformities').delete().eq('id', id); } catch { /* offline */ }
  }
  const all = await listNonconformities();
  await AsyncStorage.setItem(NC_KEY, JSON.stringify(all.filter(x => x.id !== id)));
}

export async function listByInspection(inspectionId: string): Promise<Nonconformity[]> {
  const all = await listNonconformities();
  return all.filter(x => x.inspectionId === inspectionId);
}

export const INSPECTION_TYPE_LABEL: Record<InspectionType, string> = {
  audit: 'Genel Denetim',
  safety: 'İş Güvenliği',
  quality: 'Kalite',
  commissioning: 'Devreye Alma',
  periodic: 'Periyodik',
};

export const SEVERITY_LABEL: Record<NonconformitySeverity, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

export const SEVERITY_COLOR: Record<NonconformitySeverity, string> = {
  low: '#0ea5e9',
  medium: '#f59e0b',
  high: '#ea580c',
  critical: '#dc2626',
};

export const NC_STATUS_LABEL: Record<NonconformityStatus, string> = {
  open: 'Açık',
  in_progress: 'Devam',
  closed: 'Kapalı',
  cancelled: 'İptal',
};
