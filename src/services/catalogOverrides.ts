// catalogOverrides — MATERIAL_CATALOG (hardcoded) üzerine paylaşımlı fiyat/silme
// katmanı. Yönetici katalogda fiyat değiştirir veya ürün siler; herkesin
// teklif/picker'ında geçerli olur. Supabase (catalog_overrides) + AsyncStorage cache.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import type { MaterialCatalogItem } from '../types';

const CACHE_KEY = '@SahaTakip:catalog_overrides';

export interface CatalogOverride { price?: number | null; deleted: boolean }
export type OverrideMap = Record<string, CatalogOverride>;

/** Tüm override'ları map olarak yükle (online → Supabase, offline → cache). */
export async function loadOverrides(): Promise<OverrideMap> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('catalog_overrides').select('product_id, price, deleted');
      if (!error && data) {
        const map: OverrideMap = {};
        for (const r of data) map[r.product_id] = { price: r.price, deleted: !!r.deleted };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
        return map;
      }
    } catch { /* fallback cache */ }
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch { return {}; }
}

async function upsert(productId: string, patch: Partial<{ price: number | null; deleted: boolean }>): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error('Çevrimiçi olmanız gerekiyor.');
  const { error } = await supabase
    .from('catalog_overrides')
    .upsert({ product_id: productId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'product_id' });
  if (error) throw new Error(error.message);
}

/** Bir ürünün katalog fiyatını değiştir. */
export async function setProductPrice(productId: string, price: number): Promise<void> {
  await upsert(productId, { price });
}
/** Ürünü katalogdan sil (soft) / geri al. */
export async function setProductDeleted(productId: string, deleted: boolean): Promise<void> {
  await upsert(productId, { deleted });
}

/** Base katalog + override → efektif katalog (silinenler düşer, fiyatlar güncellenir). */
export function applyOverrides(base: MaterialCatalogItem[], ovr: OverrideMap): MaterialCatalogItem[] {
  if (!ovr || !Object.keys(ovr).length) return base;
  const out: MaterialCatalogItem[] = [];
  for (const m of base) {
    const o = ovr[m.id];
    if (o?.deleted) continue;
    if (o && o.price != null && o.price !== m.price) out.push({ ...m, price: o.price, listPrice: o.price });
    else out.push(m);
  }
  return out;
}

/** Yalnız silinmiş ürünleri döndür (geri alma ekranı için). */
export function deletedIds(ovr: OverrideMap): string[] {
  return Object.keys(ovr).filter(id => ovr[id]?.deleted);
}
