// POZ-DEV-241: Ürün Takip (envanter + seri no + lokasyon) servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductItem, ProductItemStatus } from '../types';

const KEY = 'product_items_v1';

export const PRODUCT_ITEM_STATUS_LABEL: Record<ProductItemStatus, string> = {
  in_stock: 'Depoda',
  in_use: 'Kullanımda',
  in_transit: 'Transfer',
  maintenance: 'Bakımda',
  retired: 'Hurda',
};
export const PRODUCT_ITEM_STATUS_COLOR: Record<ProductItemStatus, string> = {
  in_stock: '#22c55e',
  in_use: '#0ea5e9',
  in_transit: '#f59e0b',
  maintenance: '#a855f7',
  retired: '#64748b',
};

export async function listProductItems(): Promise<ProductItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const all = raw ? (JSON.parse(raw) as ProductItem[]) : [];
  return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
export async function getProductItem(id: string): Promise<ProductItem | undefined> {
  return (await listProductItems()).find(p => p.id === id);
}
export async function saveProductItem(p: Omit<ProductItem, 'id' | 'createdAt'> & { id?: string }): Promise<ProductItem> {
  const all = await listProductItems();
  if (p.id) {
    const idx = all.findIndex(x => x.id === p.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...p, id: p.id, updatedAt: new Date().toISOString() } as ProductItem;
      await AsyncStorage.setItem(KEY, JSON.stringify(all));
      return all[idx];
    }
  }
  const created: ProductItem = {
    ...p,
    id: `prd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return created;
}
export async function deleteProductItem(id: string): Promise<void> {
  const all = await listProductItems();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(x => x.id !== id)));
}
export function filterProductItems(
  items: ProductItem[],
  q: { search?: string; status?: ProductItemStatus; customerId?: string; category?: string }
): ProductItem[] {
  const s = (q.search || '').toLowerCase().trim();
  return items.filter(p => {
    if (q.status && p.status !== q.status) return false;
    if (q.customerId && p.customerId !== q.customerId) return false;
    if (q.category && p.category !== q.category) return false;
    if (!s) return true;
    return (
      p.name.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) ||
      (p.serialNo || '').toLowerCase().includes(s) ||
      (p.model || '').toLowerCase().includes(s)
    );
  });
}
