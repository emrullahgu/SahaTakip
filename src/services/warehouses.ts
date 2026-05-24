// ====================================================================
// warehouses — POZ-DEV-054, 056
// Depo / araç / personel zimmet noktaları. Supabase + AsyncStorage cache.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Warehouse, WarehouseKind } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:warehouses';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fromRow(r: any): Warehouse {
  return {
    id: r.id,
    name: r.name ?? '',
    kind: r.kind,
    responsibleId: r.responsible_id ?? undefined,
    responsibleName: r.responsible_name ?? undefined,
    code: r.code ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(w: Warehouse): Record<string, any> {
  const row: Record<string, any> = {
    name: w.name,
    kind: w.kind,
    responsible_id: uuidOrNull(w.responsibleId),
    responsible_name: w.responsibleName ?? null,
    code: w.code ?? null,
    notes: w.notes ?? null,
  };
  if (UUID_RE.test(w.id)) row.id = w.id;
  return row;
}

export async function listWarehouses(): Promise<Warehouse[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Warehouse[]) : [];
  } catch {
    return [];
  }
}

export async function listByKind(kind: WarehouseKind): Promise<Warehouse[]> {
  const all = await listWarehouses();
  return all.filter(w => w.kind === kind);
}

export async function getWarehouse(id: string): Promise<Warehouse | null> {
  const all = await listWarehouses();
  return all.find(w => w.id === id) ?? null;
}

export async function saveWarehouses(list: Warehouse[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertWarehouse(w: Warehouse) {
  let saved: Warehouse = w;
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .upsert(toRow(w), { onConflict: 'id' })
        .select()
        .single();
      if (!error && data) saved = fromRow(data);
    } catch { /* ignore */ }
  }
  const all = await listWarehouses();
  const idx = all.findIndex(x => x.id === saved.id || x.id === w.id);
  if (idx >= 0) all[idx] = saved;
  else all.unshift(saved);
  await saveWarehouses(all);
}

export async function deleteWarehouse(id: string) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('warehouses').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listWarehouses();
  await saveWarehouses(all.filter(w => w.id !== id));
}

export function newWarehouse(kind: WarehouseKind = 'depo'): Warehouse {
  return {
    id: uid(),
    name: '',
    kind,
    createdAt: new Date().toISOString(),
  };
}
