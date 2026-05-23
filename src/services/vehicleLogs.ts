// ====================================================================
// vehicleLogs — POZ-DEV-061
// Km / yakıt / bakım / muayene / sigorta kayıtları.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleLog, VehicleLogKind } from '../types';
import { getVehicle, upsertVehicle } from './vehicles';

const KEY = '@SahaTakip:vehicle_logs';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listLogs(): Promise<VehicleLog[]> {
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
  const all = await listLogs();
  const idx = all.findIndex(l => l.id === log.id);
  if (idx >= 0) {
    all[idx] = log;
    await saveAll(all);
  }
}

export async function deleteLog(id: string) {
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
