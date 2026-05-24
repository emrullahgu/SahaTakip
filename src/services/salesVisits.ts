// salesVisits.ts — POZ-DEV-089 Satış ziyaret formu + rakip bilgisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SalesVisit, SalesVisitOutcome } from '../types';

const KEY = '@SahaTakip:sales_visits';

function rid(): string {
  return 'sv_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export async function listVisits(): Promise<SalesVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SalesVisit[]) : [];
  } catch {
    return [];
  }
}

export async function getVisit(id: string): Promise<SalesVisit | undefined> {
  const all = await listVisits();
  return all.find(v => v.id === id);
}

export async function createVisit(
  input: Omit<SalesVisit, 'id' | 'createdAt'>,
): Promise<SalesVisit> {
  const all = await listVisits();
  const next: SalesVisit = {
    ...input,
    id: rid(),
    visitDate: input.visitDate || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  all.unshift(next);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export async function updateVisit(
  id: string,
  patch: Partial<SalesVisit>,
): Promise<SalesVisit | undefined> {
  const all = await listVisits();
  const i = all.findIndex(v => v.id === id);
  if (i < 0) return undefined;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return all[i];
}

export async function deleteVisit(id: string): Promise<void> {
  const all = await listVisits();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(v => v.id !== id)));
}

export async function listByCustomer(customerId: string): Promise<SalesVisit[]> {
  const all = await listVisits();
  return all.filter(v => v.customerId === customerId);
}

export const OUTCOME_LABEL: Record<SalesVisitOutcome, string> = {
  opportunity: 'Fırsat',
  won: 'Kazandı',
  lost: 'Kaybetti',
  follow_up: 'Takip',
  no_interest: 'İlgisiz',
};

export const OUTCOME_COLOR: Record<SalesVisitOutcome, string> = {
  opportunity: '#0ea5e9',
  won: '#16a34a',
  lost: '#dc2626',
  follow_up: '#f59e0b',
  no_interest: '#6b7280',
};
