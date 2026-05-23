// ====================================================================
// materials — POZ-DEV-054
// Malzeme/ürün kataloğu (AsyncStorage).
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Material } from '../types';

const KEY = '@SahaTakip:materials';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listMaterials(): Promise<Material[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Material[]) : [];
  } catch {
    return [];
  }
}

export async function getMaterial(id: string): Promise<Material | null> {
  const all = await listMaterials();
  return all.find(m => m.id === id) ?? null;
}

export async function findByBarcode(code: string): Promise<Material | null> {
  if (!code) return null;
  const all = await listMaterials();
  return all.find(m => m.barcode === code || m.code === code) ?? null;
}

export async function saveMaterials(list: Material[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertMaterial(m: Material) {
  const all = await listMaterials();
  const idx = all.findIndex(x => x.id === m.id);
  if (idx >= 0) all[idx] = m;
  else all.unshift(m);
  await saveMaterials(all);
}

export async function deleteMaterial(id: string) {
  const all = await listMaterials();
  await saveMaterials(all.filter(m => m.id !== id));
}

export function newMaterial(): Material {
  return {
    id: uid(),
    code: '',
    name: '',
    unit: 'adet',
    createdAt: new Date().toISOString(),
  };
}
