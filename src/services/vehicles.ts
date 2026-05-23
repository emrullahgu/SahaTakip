// ====================================================================
// vehicles — POZ-DEV-060
// Araç kataloğu + sürücü eşleştirme.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vehicle } from '../types';

const KEY = '@SahaTakip:vehicles';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listVehicles(): Promise<Vehicle[]> {
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
  const all = await listVehicles();
  const idx = all.findIndex(x => x.id === v.id);
  if (idx >= 0) all[idx] = v;
  else all.unshift(v);
  await saveVehicles(all);
}

export async function deleteVehicle(id: string) {
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
