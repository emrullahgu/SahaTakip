import { WorkOrder, Employee, ServiceCatalogItem, MaterialCatalogItem } from '../types';
import { REAL_EMPLOYEES } from './realEmployees';
import { REAL_MATERIALS } from './realMaterials';
import { REAL_PRODUCTS } from './realProducts';
import { REAL_CUSTOMERS } from './realCustomers';

// Saha ekibi için varsayılan hizmet kataloğu. Fiyatlar tahmini olup
// yöneticinin daha sonra düzenleyebileceği başlangıç değerleridir.
export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 'svc-saha', name: 'Saha Servisi', price: 2500, estCost: 1200 },
  { id: 'svc-periyodik-bakim', name: 'Periyodik Bakım', price: 3500, estCost: 1500 },
  { id: 'svc-ariza-tespit', name: 'Arıza Tespit', price: 1500, estCost: 600 },
  { id: 'svc-tamir', name: 'Tamir / Onarım', price: 3000, estCost: 1300 },
  { id: 'svc-montaj', name: 'Montaj / Kurulum', price: 5000, estCost: 2000 },
  { id: 'svc-demontaj', name: 'Demontaj / Söküm', price: 2000, estCost: 900 },
  { id: 'svc-devreye-alma', name: 'Devreye Alma', price: 4000, estCost: 1800 },
  { id: 'svc-test-olcum', name: 'Test & Ölçüm', price: 2500, estCost: 1000 },
  { id: 'svc-yedek-parca', name: 'Yedek Parça Değişimi', price: 2000, estCost: 800 },
  { id: 'svc-danismanlik', name: 'Teknik Danışmanlık', price: 3000, estCost: 1000 },
];

// Eski malzemeleri (REAL_MATERIALS) + ürün listesi (REAL_PRODUCTS) tek katalogta birleştir.
// id veya (lower-case) ad-fiyat çiftinde dedupe. Fiyatı 0 (veya negatif) olanlar elenir.
const _seen = new Set<string>();
const _merged: MaterialCatalogItem[] = [];
for (const m of [...REAL_PRODUCTS, ...REAL_MATERIALS]) {
  if (!m || !(Number(m.price) > 0)) continue; // 0 TL veya tanımsız fiyatları gizle
  const key = m.id || `${(m.name || '').toLocaleLowerCase('tr-TR')}|${m.price}`;
  if (_seen.has(key)) continue;
  _seen.add(key);
  _merged.push(m);
}
export const MATERIAL_CATALOG: MaterialCatalogItem[] = _merged;

// Bir üründe geçen tüm kategori ve markaları toplayalım — picker UI'da chip olarak kullanılır.
export const MATERIAL_CATEGORIES: string[] = Array.from(
  new Set(MATERIAL_CATALOG.map(m => m.category).filter((c): c is string => !!c)),
).sort((a, b) => a.localeCompare(b, 'tr-TR'));

export const MATERIAL_BRANDS: string[] = Array.from(
  new Set(MATERIAL_CATALOG.map(m => m.brand).filter((b): b is string => !!b)),
).sort((a, b) => a.localeCompare(b, 'tr-TR'));

export const CLIENTS: string[] = REAL_CUSTOMERS
  .filter(c => c.type !== 'Tedarikçi')
  .map(c => c.title);

// İş emirleri sahada / Supabase üzerinden oluşur. Demo seed yok.
export const INITIAL_WORK_ORDERS: WorkOrder[] = [];

export const INITIAL_EMPLOYEES: Employee[] = REAL_EMPLOYEES;
