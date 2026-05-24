// ====================================================================
// vehicles — POZ-DEV-060
// Araç kataloğu + sürücü eşleştirme. Supabase + AsyncStorage cache.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vehicle } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:vehicles';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fromRow(r: any): Vehicle {
  return {
    id: r.id,
    plate: r.plate ?? '',
    brand: r.brand ?? undefined,
    model: r.model ?? undefined,
    year: r.year ?? undefined,
    color: r.color ?? undefined,
    driverId: r.driver_id ?? undefined,
    driverName: r.driver_name ?? undefined,
    kmTotal: r.km_total == null ? undefined : Number(r.km_total),
    fuelType: r.fuel_type ?? undefined,
    inspectionDueAt: r.inspection_due_at ?? undefined,
    insuranceDueAt: r.insurance_due_at ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(v: Vehicle): Record<string, any> {
  const row: Record<string, any> = {
    plate: v.plate,
    brand: v.brand ?? null,
    model: v.model ?? null,
    year: v.year ?? null,
    color: v.color ?? null,
    driver_id: uuidOrNull(v.driverId),
    driver_name: v.driverName ?? null,
    km_total: v.kmTotal ?? null,
    fuel_type: v.fuelType ?? null,
    inspection_due_at: v.inspectionDueAt ?? null,
    insurance_due_at: v.insuranceDueAt ?? null,
    notes: v.notes ?? null,
  };
  if (UUID_RE.test(v.id)) row.id = v.id;
  return row;
}

export async function listVehicles(): Promise<Vehicle[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
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
    return raw ? (JSON.parse(raw) as Vehicle[]) : [];
  } catch {
    return [];
  }
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const all = await listVehicles();
  return all.find(v => v.id === id) ?? null;
}

export async function findVehicleByPlate(plate: string): Promise<Vehicle | null> {
  if (!plate) return null;
  const all = await listVehicles();
  const norm = plate.replace(/\s+/g, '').toUpperCase();
  return all.find(v => v.plate.replace(/\s+/g, '').toUpperCase() === norm) ?? null;
}

export async function saveVehicles(list: Vehicle[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertVehicle(v: Vehicle) {
  let saved: Vehicle = v;
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .upsert(toRow(v), { onConflict: 'id' })
        .select()
        .single();
      if (!error && data) saved = fromRow(data);
    } catch { /* ignore */ }
  }
  const all = await listVehicles();
  const idx = all.findIndex(x => x.id === saved.id || x.id === v.id);
  if (idx >= 0) all[idx] = saved;
  else all.unshift(saved);
  await saveVehicles(all);
}

export async function deleteVehicle(id: string) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('vehicles').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listVehicles();
  await saveVehicles(all.filter(v => v.id !== id));
}

export function newVehicle(): Vehicle {
  return {
    id: uid(),
    plate: '',
    createdAt: new Date().toISOString(),
  };
}

// Yaklaşan vade kontrolü (muayene + sigorta)
export interface VehicleAlert {
  vehicle: Vehicle;
  kind: 'inspection' | 'insurance';
  dueAt: string;
  daysLeft: number;
}

export async function listVehicleAlerts(thresholdDays = 30): Promise<VehicleAlert[]> {
  const all = await listVehicles();
  const today = new Date();
  const out: VehicleAlert[] = [];
  for (const v of all) {
    if (v.inspectionDueAt) {
      const due = new Date(v.inspectionDueAt);
      const days = Math.floor((due.getTime() - today.getTime()) / 86400000);
      if (days <= thresholdDays) {
        out.push({ vehicle: v, kind: 'inspection', dueAt: v.inspectionDueAt, daysLeft: days });
      }
    }
    if (v.insuranceDueAt) {
      const due = new Date(v.insuranceDueAt);
      const days = Math.floor((due.getTime() - today.getTime()) / 86400000);
      if (days <= thresholdDays) {
        out.push({ vehicle: v, kind: 'insurance', dueAt: v.insuranceDueAt, daysLeft: days });
      }
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
