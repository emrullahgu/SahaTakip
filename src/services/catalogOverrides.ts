// catalogOverrides — MATERIAL_CATALOG (hardcoded) üzerine paylaşımlı fiyat/silme
// katmanı. Yönetici katalogda fiyat değiştirir veya ürün siler; herkesin
// teklif/picker'ında geçerli olur. Supabase (catalog_overrides) + AsyncStorage cache.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import type { MaterialCatalogItem } from '../types';

const CACHE_KEY = '@SahaTakip:catalog_overrides';

export interface CatalogOverride { price?: number | null; name?: string | null; deleted: boolean }
export type OverrideMap = Record<string, CatalogOverride>;

/** Tüm override'ları map olarak yükle (online → Supabase, offline → cache). */
export async function loadOverrides(): Promise<OverrideMap> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('catalog_overrides').select('product_id, price, name, deleted');
      if (!error && data) {
        const map: OverrideMap = {};
        for (const r of data) map[r.product_id] = { price: r.price, name: r.name, deleted: !!r.deleted };
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

async function upsert(productId: string, patch: Partial<{ price: number | null; name: string | null; deleted: boolean }>): Promise<void> {
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
/** Bir ürünün katalog adını değiştir. */
export async function setProductName(productId: string, name: string): Promise<void> {
  await upsert(productId, { name });
}
/** Ürünü katalogdan sil (soft) / geri al. */
export async function setProductDeleted(productId: string, deleted: boolean): Promise<void> {
  await upsert(productId, { deleted });
}

/** Base katalog + override → efektif katalog (silinenler düşer, ad/fiyat güncellenir). */
export function applyOverrides(base: MaterialCatalogItem[], ovr: OverrideMap): MaterialCatalogItem[] {
  if (!ovr || !Object.keys(ovr).length) return base;
  const out: MaterialCatalogItem[] = [];
  for (const m of base) {
    const o = ovr[m.id];
    if (o?.deleted) continue;
    if (o && (o.price != null || (o.name != null && o.name !== ''))) {
      out.push({
        ...m,
        ...(o.price != null ? { price: o.price, listPrice: o.price } : {}),
        ...(o.name ? { name: o.name } : {}),
      });
    } else out.push(m);
  }
  return out;
}

/** Yalnız silinmiş ürünleri döndür (geri alma ekranı için). */
export function deletedIds(ovr: OverrideMap): string[] {
  return Object.keys(ovr).filter(id => ovr[id]?.deleted);
}

// ---------- Kullanıcı tarafından eklenen ürünler ----------
function newId(): string {
  try { const g: any = globalThis as any; if (g?.crypto?.randomUUID) return 'custom-' + g.crypto.randomUUID(); } catch { /* ignore */ }
  return 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Elle eklenmiş, silinmemiş ürünleri MaterialCatalogItem olarak döner. */
export async function loadCustomProducts(): Promise<MaterialCatalogItem[]> {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const { data, error } = await supabase
      .from('catalog_custom_products').select('*').eq('deleted', false).order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id, name: r.name, price: Number(r.price) || 0, listPrice: Number(r.price) || 0,
      category: r.category ?? undefined, brand: r.brand ?? undefined, code: r.code ?? undefined,
      unit: r.unit ?? undefined, currency: 'TL',
    }) as MaterialCatalogItem);
  } catch { return []; }
}

/** Yeni ürün ekle (kataloğa). */
export async function addCustomProduct(input: { name: string; price: number; category?: string; brand?: string; code?: string; unit?: string }): Promise<MaterialCatalogItem> {
  if (!SUPABASE_CONFIGURED) throw new Error('Çevrimiçi olmanız gerekiyor.');
  const id = newId();
  const { error } = await supabase.from('catalog_custom_products').insert({
    id, name: input.name.trim(), price: input.price,
    category: input.category ?? null, brand: input.brand ?? null, code: input.code ?? null, unit: input.unit ?? null,
  });
  if (error) throw new Error(error.message);
  return { id, name: input.name.trim(), price: input.price, listPrice: input.price, category: input.category, brand: input.brand, code: input.code, currency: 'TL' } as MaterialCatalogItem;
}

/** Elle eklenen ürünün ad/fiyatını güncelle. */
export async function updateCustomProduct(id: string, patch: { name?: string; price?: number }): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error('Çevrimiçi olmanız gerekiyor.');
  const { error } = await supabase.from('catalog_custom_products').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Bir ürün id'si elle eklenmiş (custom) mi? */
export const isCustomProduct = (id: string) => id.startsWith('custom-');

/** Elle eklenen ürünü sil. */
export async function deleteCustomProduct(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error('Çevrimiçi olmanız gerekiyor.');
  const { error } = await supabase.from('catalog_custom_products').update({ deleted: true }).eq('id', id);
  if (error) throw new Error(error.message);
}
