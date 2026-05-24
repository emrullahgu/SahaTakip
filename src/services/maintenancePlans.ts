// maintenancePlans.ts — POZ-DEV-085 Periyodik bakım planı (önleyici/düzeltici)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaintenanceKind, MaintenancePlan } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:maintenance_plans';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function planFromRow(r: any): MaintenancePlan {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    assetId: r.asset_id || undefined,
    customerId: r.customer_id || undefined,
    frequencyDays: r.frequency_days,
    lastDoneAt: r.last_done_at || undefined,
    nextDueAt: r.next_due_at,
    assignedTo: r.assigned_to || undefined,
    active: r.active !== false,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  } as MaintenancePlan;
}
function planToRow(p: MaintenancePlan) {
  return {
    name: p.name,
    kind: p.kind,
    asset_id: uuidOrNull(p.assetId),
    customer_id: uuidOrNull(p.customerId),
    frequency_days: p.frequencyDays,
    last_done_at: p.lastDoneAt || null,
    next_due_at: p.nextDueAt,
    assigned_to: uuidOrNull(p.assignedTo),
    active: p.active !== false,
    notes: p.notes || null,
    created_at: p.createdAt,
  };
}

function rid(): string {
  return 'mnt_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function listPlans(): Promise<MaintenancePlan[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('maintenance_plans').select('*').order('next_due_at', { ascending: true });
      if (!error && data) {
        const list = data.map(planFromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MaintenancePlan[]) : [];
  } catch {
    return [];
  }
}

export async function createPlan(
  input: Omit<MaintenancePlan, 'id' | 'createdAt' | 'nextDueAt'> & { nextDueAt?: string },
): Promise<MaintenancePlan> {
  const all = await listPlans();
  const now = new Date().toISOString();
  let next: MaintenancePlan = {
    ...input,
    id: rid(),
    nextDueAt: input.nextDueAt || addDays(now, input.frequencyDays || 30),
    createdAt: now,
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('maintenance_plans').insert(planToRow(next)).select().single();
      if (!error && data) next = planFromRow(data);
    } catch { /* offline */ }
  }
  all.unshift(next);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export async function updatePlan(
  id: string,
  patch: Partial<MaintenancePlan>,
): Promise<MaintenancePlan | undefined> {
  const all = await listPlans();
  const i = all.findIndex(p => p.id === id);
  if (i < 0) return undefined;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try {
      const row: any = planToRow(all[i]);
      delete row.created_at;
      await supabase.from('maintenance_plans').update(row).eq('id', id);
    } catch { /* offline */ }
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return all[i];
}

export async function deletePlan(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('maintenance_plans').delete().eq('id', id); } catch { /* offline */ }
  }
  const all = await listPlans();
  const next = all.filter(p => p.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

// Bakım tamamlandığında nextDueAt'i ileri öteler
export async function markDone(id: string, doneAt?: string): Promise<MaintenancePlan | undefined> {
  const all = await listPlans();
  const p = all.find(x => x.id === id);
  if (!p) return undefined;
  const t = doneAt || new Date().toISOString();
  return updatePlan(id, {
    lastDoneAt: t,
    nextDueAt: addDays(t, p.frequencyDays),
  });
}

export async function listByAsset(assetId: string): Promise<MaintenancePlan[]> {
  const all = await listPlans();
  return all.filter(p => p.assetId === assetId);
}

export async function dueSoon(days: number = 7): Promise<MaintenancePlan[]> {
  const all = await listPlans();
  const limit = Date.now() + days * 86_400_000;
  return all
    .filter(p => p.active !== false && new Date(p.nextDueAt).getTime() <= limit)
    .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
}

export const MAINTENANCE_KIND_LABEL: Record<MaintenanceKind, string> = {
  preventive: 'Önleyici',
  corrective: 'Düzeltici',
};
