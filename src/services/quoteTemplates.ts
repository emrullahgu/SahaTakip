// ====================================================================
// quoteTemplates.ts — POZ-DEV-041
// Teklif şablonları (lokal AsyncStorage tabanlı).
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuoteTemplate, QuoteLine } from '../types';

const KEY = '@SahaTakip:quote_templates';

const SEED: QuoteTemplate[] = [
  {
    id: 'tpl-komp',
    name: 'Kompanzasyon Standart',
    category: 'Kompanzasyon',
    defaultTitle: 'Kompanzasyon Panosu Kurulumu',
    notes: 'Reaktif güç kompanzasyon panosu kurulumu — 6 kademe, kontaktör + kondansatör + reaktör.',
    lines: [
      {
        pozId: 'POZ-KOMP-001',
        pozName: 'Kompanzasyon Panosu (6 Kademe)',
        unit: 'Adet',
        quantity: 1,
        materialPrice: 28000,
        installPrice: 8000,
        dismantlePrice: 2000,
        withDismantle: false,
        overheadPct: 10,
        profitPct: 20,
        vatPct: 20,
        discountPct: 0,
      },
      {
        pozId: 'POZ-KOMP-002',
        pozName: 'Reaktif Röle (Otomatik)',
        unit: 'Adet',
        quantity: 1,
        materialPrice: 4500,
        installPrice: 800,
        dismantlePrice: 0,
        withDismantle: false,
        overheadPct: 10,
        profitPct: 20,
        vatPct: 20,
        discountPct: 0,
      },
    ],
  },
  {
    id: 'tpl-yg',
    name: 'YG Bakım Standart',
    category: 'YG',
    defaultTitle: 'Yüksek Gerilim Periyodik Bakım',
    notes: 'Trafo + AG/OG hücre bakım, izolasyon ölçüm, termal kamera taraması.',
    lines: [
      {
        pozId: 'POZ-YG-001',
        pozName: 'Trafo Bakımı (Yağ Analizi Dahil)',
        unit: 'Adet',
        quantity: 1,
        materialPrice: 3000,
        installPrice: 6500,
        dismantlePrice: 0,
        withDismantle: false,
        overheadPct: 12,
        profitPct: 22,
        vatPct: 20,
        discountPct: 0,
      },
      {
        pozId: 'POZ-YG-002',
        pozName: 'OG Hücre Bakımı',
        unit: 'Adet',
        quantity: 2,
        materialPrice: 800,
        installPrice: 2200,
        dismantlePrice: 0,
        withDismantle: false,
        overheadPct: 10,
        profitPct: 20,
        vatPct: 20,
        discountPct: 0,
      },
    ],
  },
  {
    id: 'tpl-tava',
    name: 'Kablo Tava Sistemi',
    category: 'Kablo Tava',
    defaultTitle: 'Kablo Tava Tesisi',
    lines: [
      {
        pozId: 'POZ-TAVA-001',
        pozName: 'Galvaniz Kablo Tavası 300mm',
        unit: 'Mt',
        quantity: 50,
        materialPrice: 320,
        installPrice: 120,
        dismantlePrice: 0,
        withDismantle: false,
        overheadPct: 8,
        profitPct: 18,
        vatPct: 20,
        discountPct: 0,
      },
    ],
  },
];

export async function listQuoteTemplates(): Promise<QuoteTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      await AsyncStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as QuoteTemplate[];
  } catch {
    return SEED;
  }
}

export async function saveQuoteTemplates(list: QuoteTemplate[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertQuoteTemplate(t: QuoteTemplate): Promise<void> {
  const list = await listQuoteTemplates();
  const idx = list.findIndex(x => x.id === t.id);
  if (idx >= 0) list[idx] = t;
  else list.push(t);
  await saveQuoteTemplates(list);
}

export async function deleteQuoteTemplate(id: string): Promise<void> {
  const list = await listQuoteTemplates();
  await saveQuoteTemplates(list.filter(x => x.id !== id));
}

/** Şablon satırlarını teklif satırlarına çevir (lineNo atar). */
export function templateToLines(t: QuoteTemplate): QuoteLine[] {
  return t.lines.map((l, i) => ({ ...l, lineNo: i + 1 }));
}
