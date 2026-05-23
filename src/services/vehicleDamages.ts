// ====================================================================
// vehicleDamages — POZ-DEV-062
// Araç hasar bildirimi (fotoğraflı, çoklu).
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleDamage } from '../types';

const KEY = '@SahaTakip:vehicle_damages';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listDamages(): Promise<VehicleDamage[]> {
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
  const all = await listDamages();
  const idx = all.findIndex(x => x.id === d.id);
  if (idx >= 0) all[idx] = d;
  else all.unshift(d);
  await saveAll(all);
}

export async function deleteDamage(id: string) {
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
