// ====================================================================
// warehouses — POZ-DEV-054, 056
// Depo / araç / personel zimmet noktaları.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Warehouse, WarehouseKind } from '../types';

const KEY = '@SahaTakip:warehouses';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listWarehouses(): Promise<Warehouse[]> {
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
  const all = await listWarehouses();
  const idx = all.findIndex(x => x.id === w.id);
  if (idx >= 0) all[idx] = w;
  else all.unshift(w);
  await saveWarehouses(all);
}

export async function deleteWarehouse(id: string) {
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
