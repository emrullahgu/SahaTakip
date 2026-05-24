// salesVisits.ts — POZ-DEV-089 Satış ziyaret formu + rakip bilgisi
// Supabase + AsyncStorage cache. customerName/salespersonName local-only (not in schema).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SalesVisit, SalesVisitOutcome } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:sales_visits';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function rid(): string {
  return 'sv_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function fromRow(r: any, prev?: SalesVisit): SalesVisit {
  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: prev?.customerName ?? '',
    visitDate: r.visit_date,
    salespersonId: r.salesperson_id ?? undefined,
    salespersonName: prev?.salespersonName,
    purpose: r.purpose ?? undefined,
    summary: r.summary ?? undefined,
    nextStep: r.next_step ?? undefined,
    nextStepDate: r.next_step_date ?? undefined,
    outcome: r.outcome,
    estimatedAmount: r.estimated_amount == null ? undefined : Number(r.estimated_amount),
    competitor: r.competitor ?? undefined,
    photos: Array.isArray(r.photos) ? r.photos : undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(v: SalesVisit): Record<string, any> {
  const row: Record<string, any> = {
    customer_id: v.customerId,
    visit_date: v.visitDate,
    salesperson_id: uuidOrNull(v.salespersonId),
    purpose: v.purpose ?? null,
    summary: v.summary ?? null,
    next_step: v.nextStep ?? null,
    next_step_date: v.nextStepDate ?? null,
    outcome: v.outcome,
    estimated_amount: v.estimatedAmount ?? null,
    competitor: v.competitor ?? null,
    photos: v.photos ?? null,
  };
  if (UUID_RE.test(v.id)) row.id = v.id;
  return row;
}

export async function listVisits(): Promise<SalesVisit[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('sales_visits')
        .select('*')
        .order('visit_date', { ascending: false });
      if (!error && data) {
        // Preserve customerName/salespersonName from cache if available
        const cacheRaw = await AsyncStorage.getItem(KEY);
        const cache: SalesVisit[] = cacheRaw ? JSON.parse(cacheRaw) : [];
        const cacheById = new Map(cache.map(c => [c.id, c]));
        const list = data.map((r: any) => fromRow(r, cacheById.get(r.id)));
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
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
  let next: SalesVisit = {
    ...input,
    id: rid(),
    visitDate: input.visitDate || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  if (SUPABASE_CONFIGURED && UUID_RE.test(next.customerId)) {
    try {
      const { data, error } = await supabase
        .from('sales_visits')
        .insert(toRow(next))
        .select()
        .single();
      if (!error && data) next = fromRow(data, next);
    } catch { /* keep local */ }
  }
  const all = await listVisits();
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
  const merged: SalesVisit = { ...all[i], ...patch, id: all[i].id };
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try {
      const { data, error } = await supabase
        .from('sales_visits')
        .update(toRow(merged))
        .eq('id', id)
        .select()
        .single();
      if (!error && data) all[i] = fromRow(data, merged);
      else all[i] = merged;
    } catch { all[i] = merged; }
  } else {
    all[i] = merged;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return all[i];
}

export async function deleteVisit(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('sales_visits').delete().eq('id', id); } catch { /* ignore */ }
  }
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
