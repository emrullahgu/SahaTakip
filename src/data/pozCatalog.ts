// Poz Katalog — SahaTakipHızlı Teklif Kalemleri (hizli_teklif_kalemleri.csv kaynaklı)
// Her kalem: malzeme birim fiyatı + montaj işçilik + demontaj (opsiyonel) + genel gider% + kâr%

export type PozCategory = 'Malzeme' | 'İşçilik' | 'Servis' | 'Mühendislik' | 'Ulaşım' | 'Diğer';

export interface PozItem {
  id: string;              // Poz No (örn: KE-0089-01)
  name: string;            // İş tanımı / kalem adı
  description?: string;    // Detaylı açıklama
  category: PozCategory;
  unit: string;            // Adet, Mt, m², Kg, Saat
  materialPrice: number;   // Malzeme birim fiyatı (KDV hariç)
  installPrice: number;    // Montaj/işçilik birim fiyatı
  dismantlePrice?: number; // Demontaj birim fiyatı (opsiyonel)
  vatRate: number;         // KDV %
  defaultOverhead: number; // Varsayılan genel gider %
  defaultProfit: number;   // Varsayılan kâr %
}

// Kategori varsayılan oranları
export const DEFAULT_OVERHEAD = 10; // %10 genel gider
export const DEFAULT_PROFIT = 15;   // %15 kâr
export const DEFAULT_VAT = 20;      // %20 KDV

// Tek kaynak: gerçek katalog (realdata/excel-to-json*.json'dan üretildi).
import { REAL_POZ_CATALOG } from './realPozCatalog';
export const POZ_CATALOG: PozItem[] = [...REAL_POZ_CATALOG];

// Kategori listesini hızlıca al
export const POZ_CATEGORIES: PozCategory[] = ['Malzeme', 'İşçilik', 'Servis', 'Mühendislik', 'Ulaşım', 'Diğer'];

// Yardımcı: poz id'den item bul
export const findPoz = (id: string): PozItem | undefined =>
  POZ_CATALOG.find(p => p.id === id);

// Yardımcı: kategoriye göre filtrele
export const pozByCategory = (cat: PozCategory): PozItem[] =>
  POZ_CATALOG.filter(p => p.category === cat);
