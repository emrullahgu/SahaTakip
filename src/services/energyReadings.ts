// energyReadings.ts — POZ-DEV-083, POZ-DEV-084
// Sayaç / Pano / Trafo / GES ölçüm kayıtları
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnergyReading, EnergyReadingKind } from '../types';

const KEY = '@SahaTakip:energy_readings';

function rid(): string {
  return 'rd_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export async function listReadings(): Promise<EnergyReading[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EnergyReading[]) : [];
  } catch {
    return [];
  }
}

export async function getReading(id: string): Promise<EnergyReading | undefined> {
  const all = await listReadings();
  return all.find(r => r.id === id);
}

export async function createReading(
  input: Omit<EnergyReading, 'id' | 'createdAt'>,
): Promise<EnergyReading> {
  const all = await listReadings();
  const next: EnergyReading = {
    ...input,
    id: rid(),
    date: input.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  all.unshift(next);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export async function updateReading(
  id: string,
  patch: Partial<EnergyReading>,
): Promise<EnergyReading | undefined> {
  const all = await listReadings();
  const i = all.findIndex(r => r.id === id);
  if (i < 0) return undefined;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return all[i];
}

export async function deleteReading(id: string): Promise<void> {
  const all = await listReadings();
  const next = all.filter(r => r.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function listByAsset(assetId: string): Promise<EnergyReading[]> {
  const all = await listReadings();
  return all.filter(r => r.assetId === assetId);
}

export const READING_KINDS: { value: EnergyReadingKind; label: string; icon: string }[] = [
  { value: 'meter', label: 'Sayaç Okuma', icon: 'speedometer-outline' },
  { value: 'panel', label: 'Pano Kontrol', icon: 'grid-outline' },
  { value: 'transformer', label: 'Trafo Bakım', icon: 'flash-outline' },
  { value: 'ges', label: 'GES Saha', icon: 'sunny-outline' },
];

export const READING_KIND_LABEL: Record<EnergyReadingKind, string> = {
  meter: 'Sayaç',
  panel: 'Pano',
  transformer: 'Trafo',
  ges: 'GES',
};
