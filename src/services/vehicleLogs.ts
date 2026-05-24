// ====================================================================
// vehicleLogs — POZ-DEV-061
// Km / yakıt / bakım / muayene / sigorta kayıtları.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleLog, VehicleLogKind } from '../types';
import { getVehicle, upsertVehicle } from './vehicles';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:vehicle_logs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fromRow(r: any): VehicleLog {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    kind: r.kind,
    km: r.km == null ? undefined : Number(r.km),
    liters: r.liters == null ? undefined : Number(r.liters),
    unitPrice: r.unit_price == null ? undefined : Number(r.unit_price),
    totalCost: r.total_cost == null ? undefined : Number(r.total_cost),
    serviceType: r.service_type ?? undefined,
    dueAt: r.due_at ?? undefined,
    note: r.note ?? undefined,
    performedBy: r.performed_by ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(l: VehicleLog): Record<string, any> {
  return {
    vehicle_id: l.vehicleId,
    kind: l.kind,
    km: l.km ?? null,
    liters: l.liters ?? null,
    unit_price: l.unitPrice ?? null,
    total_cost: l.totalCost ?? null,
    service_type: l.serviceType ?? null,
    due_at: l.dueAt ?? null,
    note: l.note ?? null,
    performed_by: l.performedBy ?? null,
  };
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listLogs(): Promise<VehicleLog[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('vehicle_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VehicleLog[]) : [];
  } catch {
    return [];
  }
}

export async function listLogsByVehicle(vehicleId: string): Promise<VehicleLog[]> {
  const all = await listLogs();
  return all
    .filter(l => l.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listLogsByKind(kind: VehicleLogKind): Promise<VehicleLog[]> {
  const all = await listLogs();
  return all.filter(l => l.kind === kind);
}

export async function getLog(id: string): Promise<VehicleLog | null> {
  const all = await listLogs();
  return all.find(l => l.id === id) ?? null;
}

async function saveAll(list: VehicleLog[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function addLog(input: Omit<VehicleLog, 'id' | 'createdAt'>): Promise<VehicleLog> {
  const log: VehicleLog = {
    id: uid(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  if (SUPABASE_CONFIGURED && UUID_RE.test(input.vehicleId)) {
    try {
      const { data, error } = await supabase.from('vehicle_logs').insert(toRow(log)).select().single();
      if (!error && data) {
        log.id = data.id;
        log.createdAt = data.created_at ?? log.createdAt;
      }
    } catch { /* keep local */ }
  }
  const all = await listLogs();
  await saveAll([log, ...all]);

  // Aracın km/sigorta/muayene alanlarını otomatik güncelle
  const v = await getVehicle(input.vehicleId);
  if (v) {
    let updated = false;
    const next = { ...v };
    if (typeof input.km === 'number' && (!v.kmTotal || input.km > v.kmTotal)) {
      next.kmTotal = input.km;
      updated = true;
    }
    if (input.kind === 'inspection' && input.dueAt) {
      next.inspectionDueAt = input.dueAt;
      updated = true;
    }
    if (input.kind === 'insurance' && input.dueAt) {
      next.insuranceDueAt = input.dueAt;
      updated = true;
    }
    if (updated) await upsertVehicle(next);
  }

  return log;
}

export async function updateLog(log: VehicleLog) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(log.id)) {
    try { await supabase.from('vehicle_logs').update(toRow(log)).eq('id', log.id); } catch { /* ignore */ }
  }
  const all = await listLogs();
  const idx = all.findIndex(l => l.id === log.id);
  if (idx >= 0) {
    all[idx] = log;
    await saveAll(all);
  }
}

export async function deleteLog(id: string) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('vehicle_logs').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listLogs();
  await saveAll(all.filter(l => l.id !== id));
}

// Yakıt verimliliği özeti (vehicleId için)
export interface FuelSummary {
  totalLiters: number;
  totalCost: number;
  totalKm: number;
  avgConsumption: number; // L / 100km
}

export async function fuelSummary(vehicleId: string): Promise<FuelSummary> {
  const logs = (await listLogsByVehicle(vehicleId)).filter(l => l.kind === 'fuel');
  const totalLiters = logs.reduce((s, l) => s + (l.liters ?? 0), 0);
  const totalCost = logs.reduce((s, l) => s + (l.totalCost ?? 0), 0);
  const kms = logs.map(l => l.km ?? 0).filter(k => k > 0).sort((a, b) => a - b);
  const totalKm = kms.length >= 2 ? kms[kms.length - 1] - kms[0] : 0;
  const avgConsumption = totalKm > 0 ? (totalLiters / totalKm) * 100 : 0;
  return { totalLiters, totalCost, totalKm, avgConsumption };
}
