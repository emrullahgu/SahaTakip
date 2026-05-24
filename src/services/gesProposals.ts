// POZ-DEV-225: GES Teklif servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GesQuote, GesQuoteInput, GesType } from '../types';

const KEY = 'ges_quotes_v1';

export const GES_TYPE_LABEL: Record<GesType, string> = {
  rooftop: 'Çatı GES',
  ground: 'Arazi GES',
  carport: 'Carport GES',
};
const TYPE_FACTOR: Record<GesType, number> = {
  rooftop: 1.0,
  ground: 1.1,
  carport: 1.25,
};

// Tipik panel + inverter birim fiyatlar (₺)
const PANEL_PRICE_PER_W = 6; // ₺ / Wp
const INVERTER_PRICE_PER_KW = 2200;
const LOGISTICS_PER_KM = 15;

export function calcGesQuote(input: GesQuoteInput): {
  materialCost: number;
  laborCost: number;
  logisticsCost: number;
  subtotal: number;
  margin: number;
  total: number;
} {
  const panelTotal = input.panelCount * input.panelWatt * PANEL_PRICE_PER_W;
  const inverterTotal = input.inverterCount * input.inverterKw * INVERTER_PRICE_PER_KW;
  const structureTotal = input.capacityKwp * input.structurePerKwp;
  const cablingTotal = input.capacityKwp * input.cablingPerKwp;
  const materialCost = (panelTotal + inverterTotal + structureTotal + cablingTotal) * TYPE_FACTOR[input.type];

  const laborCost = input.capacityKwp * input.laborPerKwp * TYPE_FACTOR[input.type];
  const logisticsCost = input.logisticsKm * LOGISTICS_PER_KM;
  const subtotal = materialCost + laborCost + logisticsCost;
  const margin = subtotal * (input.marginPct / 100);
  const total = subtotal + margin;
  return {
    materialCost: Math.round(materialCost),
    laborCost: Math.round(laborCost),
    logisticsCost: Math.round(logisticsCost),
    subtotal: Math.round(subtotal),
    margin: Math.round(margin),
    total: Math.round(total),
  };
}

export async function listGesQuotes(): Promise<GesQuote[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as GesQuote[]) : [];
}
export async function getGesQuote(id: string): Promise<GesQuote | undefined> {
  return (await listGesQuotes()).find(q => q.id === id);
}
export async function saveGesQuote(q: Omit<GesQuote, 'id' | 'createdAt'> & { id?: string }): Promise<GesQuote> {
  const all = await listGesQuotes();
  if (q.id) {
    const idx = all.findIndex(x => x.id === q.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...q, id: q.id } as GesQuote;
      await AsyncStorage.setItem(KEY, JSON.stringify(all));
      return all[idx];
    }
  }
  const created: GesQuote = {
    ...q,
    id: `gq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return created;
}
export async function deleteGesQuote(id: string): Promise<void> {
  const all = await listGesQuotes();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(x => x.id !== id)));
}
