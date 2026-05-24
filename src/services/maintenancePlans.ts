// maintenancePlans.ts — POZ-DEV-085 Periyodik bakım planı (önleyici/düzeltici)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaintenanceKind, MaintenancePlan } from '../types';

const KEY = '@SahaTakip:maintenance_plans';

function rid(): string {
  return 'mnt_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function listPlans(): Promise<MaintenancePlan[]> {
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
  const next: MaintenancePlan = {
    ...input,
    id: rid(),
    nextDueAt: input.nextDueAt || addDays(now, input.frequencyDays || 30),
    createdAt: now,
  };
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
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return all[i];
}

export async function deletePlan(id: string): Promise<void> {
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
