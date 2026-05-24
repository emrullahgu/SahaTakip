// ====================================================================
// materials — POZ-DEV-054
// Malzeme/ürün kataloğu. Supabase (public.materials) + AsyncStorage cache.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Material } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:materials';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fromRow(r: any): Material {
  return {
    id: r.id,
    code: r.code ?? '',
    name: r.name ?? '',
    unit: r.unit ?? 'adet',
    price: r.price == null ? undefined : Number(r.price),
    minStock: r.min_stock == null ? undefined : Number(r.min_stock),
    category: r.category ?? undefined,
    barcode: r.barcode ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function toRow(m: Material): Record<string, any> {
  const row: Record<string, any> = {
    code: m.code,
    name: m.name,
    unit: m.unit,
    price: m.price ?? null,
    min_stock: m.minStock ?? null,
    category: m.category ?? null,
    barcode: m.barcode ?? null,
    notes: m.notes ?? null,
  };
  if (UUID_RE.test(m.id)) row.id = m.id;
  return row;
}

export async function listMaterials(): Promise<Material[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fall through */ }
  }
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
  let saved: Material = m;
  if (SUPABASE_CONFIGURED) {
    try {
      const row = toRow(m);
      const { data, error } = await supabase
        .from('materials')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      if (!error && data) saved = fromRow(data);
    } catch { /* ignore, keep local */ }
  }
  const all = await listMaterials();
  const idx = all.findIndex(x => x.id === saved.id || x.id === m.id);
  if (idx >= 0) all[idx] = saved;
  else all.unshift(saved);
  await saveMaterials(all);
}

export async function deleteMaterial(id: string) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('materials').delete().eq('id', id); } catch { /* ignore */ }
  }
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
