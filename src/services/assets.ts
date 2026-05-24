// assets.ts — POZ-DEV-086 Cihaz/ekipman geçmişi (asset tracking)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset, AssetType } from '../types';

const KEY = '@SahaTakip:assets';

function rid(): string {
  return 'asset_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export async function listAssets(): Promise<Asset[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Asset[]) : [];
  } catch {
    return [];
  }
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  const all = await listAssets();
  return all.find(a => a.id === id);
}

export async function createAsset(input: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> {
  const all = await listAssets();
  const next: Asset = { ...input, id: rid(), createdAt: new Date().toISOString() };
  all.unshift(next);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export async function updateAsset(id: string, patch: Partial<Asset>): Promise<Asset | undefined> {
  const all = await listAssets();
  const i = all.findIndex(a => a.id === id);
  if (i < 0) return undefined;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return all[i];
}

export async function deleteAsset(id: string): Promise<void> {
  const all = await listAssets();
  const next = all.filter(a => a.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function listByCustomer(customerId: string): Promise<Asset[]> {
  const all = await listAssets();
  return all.filter(a => a.customerId === customerId);
}

export async function findByCode(code: string): Promise<Asset | undefined> {
  const all = await listAssets();
  return all.find(a => a.code === code);
}

export const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'meter', label: 'Sayaç', icon: 'speedometer-outline' },
  { value: 'panel', label: 'Pano', icon: 'grid-outline' },
  { value: 'transformer', label: 'Trafo', icon: 'flash-outline' },
  { value: 'ges_inverter', label: 'GES Inverter', icon: 'sunny-outline' },
  { value: 'ges_panel', label: 'GES Panel', icon: 'sunny-outline' },
  { value: 'compensation', label: 'Kompanzasyon', icon: 'pulse-outline' },
  { value: 'machine', label: 'Makine', icon: 'cog-outline' },
  { value: 'other', label: 'Diğer', icon: 'cube-outline' },
];

export const ASSET_TYPE_LABEL: Record<AssetType, string> = ASSET_TYPES.reduce(
  (acc, t) => { acc[t.value] = t.label; return acc; },
  {} as Record<AssetType, string>,
);
