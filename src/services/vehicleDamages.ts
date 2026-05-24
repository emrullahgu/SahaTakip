// ====================================================================
// vehicleDamages — POZ-DEV-062
// Araç hasar bildirimi. Supabase + AsyncStorage cache.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleDamage } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:vehicle_damages';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fromRow(r: any): VehicleDamage {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    description: r.description ?? '',
    severity: r.severity,
    status: r.status,
    photos: Array.isArray(r.photos) ? r.photos : [],
    kmAt: r.km_at == null ? undefined : Number(r.km_at),
    reportedBy: r.reported_by ?? undefined,
    reportedAt: r.reported_at ?? new Date().toISOString(),
    repairedAt: r.repaired_at ?? undefined,
    repairCost: r.repair_cost == null ? undefined : Number(r.repair_cost),
    notes: r.notes ?? undefined,
  };
}
function toRow(d: VehicleDamage): Record<string, any> {
  const row: Record<string, any> = {
    vehicle_id: d.vehicleId,
    description: d.description,
    severity: d.severity,
    status: d.status,
    photos: d.photos ?? [],
    km_at: d.kmAt ?? null,
    reported_by: d.reportedBy ?? null,
    repaired_at: d.repairedAt ?? null,
    repair_cost: d.repairCost ?? null,
    notes: d.notes ?? null,
  };
  if (UUID_RE.test(d.id)) row.id = d.id;
  return row;
}

export async function listDamages(): Promise<VehicleDamage[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('vehicle_damages')
        .select('*')
        .order('reported_at', { ascending: false });
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VehicleDamage[]) : [];
  } catch {
    return [];
  }
}

export async function listDamagesByVehicle(vehicleId: string): Promise<VehicleDamage[]> {
  const all = await listDamages();
  return all
    .filter(d => d.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

export async function getDamage(id: string): Promise<VehicleDamage | null> {
  const all = await listDamages();
  return all.find(d => d.id === id) ?? null;
}

async function saveAll(list: VehicleDamage[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertDamage(d: VehicleDamage) {
  let saved = d;
  if (SUPABASE_CONFIGURED && UUID_RE.test(d.vehicleId)) {
    try {
      const { data, error } = await supabase
        .from('vehicle_damages')
        .upsert(toRow(d), { onConflict: 'id' })
        .select()
        .single();
      if (!error && data) saved = fromRow(data);
    } catch { /* ignore */ }
  }
  const all = await listDamages();
  const idx = all.findIndex(x => x.id === saved.id || x.id === d.id);
  if (idx >= 0) all[idx] = saved;
  else all.unshift(saved);
  await saveAll(all);
}

export async function deleteDamage(id: string) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('vehicle_damages').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listDamages();
  await saveAll(all.filter(d => d.id !== id));
}

export function newDamage(vehicleId: string): VehicleDamage {
  return {
    id: uid(),
    vehicleId,
    description: '',
    severity: 'low',
    status: 'open',
    photos: [],
    reportedAt: new Date().toISOString(),
  };
}
