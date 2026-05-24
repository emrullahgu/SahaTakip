// POZ-DEV-218: YG Trafo İşletme Sorumlusu Teklif servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransformerCustomerType, TransformerQuote, TransformerQuoteInput } from '../types';

const KEY = 'transformer_quotes_v1';

export const TRANSFORMER_CUSTOMER_TYPE_LABEL: Record<TransformerCustomerType, string> = {
  sanayi: 'Sanayi',
  ticarethane: 'Ticarethane',
  osb: 'OSB',
  sanayi_sitesi: 'Sanayi Sitesi',
  kamu: 'Kamu',
};
const CUSTOMER_MULT: Record<TransformerCustomerType, number> = {
  sanayi: 1.0,
  ticarethane: 0.9,
  osb: 1.15,
  sanayi_sitesi: 0.85,
  kamu: 1.1,
};

// Birim ücret: 50 ₺ / kVA / ay (örnek baz fiyat)
const BASE_PER_KVA_MONTH = 50;

export function calcTransformerQuote(input: TransformerQuoteInput): { monthlyFee: number; totalFee: number } {
  const base = BASE_PER_KVA_MONTH * input.kvaPerUnit * input.unitCount;
  const customerMult = CUSTOMER_MULT[input.customerType] ?? 1;
  const distanceMult = 1 + Math.max(0, input.distanceKm) * 0.005;
  const addons =
    (input.nightShift ? 0.1 : 0) +
    (input.periodicTest ? 0.05 : 0) +
    (input.emergencyResponse ? 0.07 : 0);
  const monthly = base * customerMult * distanceMult * (1 + addons);
  const discount = input.contractMonths >= 12 ? 0.9 : 1; // 12+ ay %10 indirim
  const total = monthly * input.contractMonths * discount;
  return { monthlyFee: Math.round(monthly), totalFee: Math.round(total) };
}

export async function listTransformerQuotes(): Promise<TransformerQuote[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as TransformerQuote[]) : [];
}
export async function getTransformerQuote(id: string): Promise<TransformerQuote | undefined> {
  return (await listTransformerQuotes()).find(q => q.id === id);
}
export async function saveTransformerQuote(q: Omit<TransformerQuote, 'id' | 'createdAt'> & { id?: string }): Promise<TransformerQuote> {
  const all = await listTransformerQuotes();
  if (q.id) {
    const idx = all.findIndex(x => x.id === q.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...q, id: q.id } as TransformerQuote;
      await AsyncStorage.setItem(KEY, JSON.stringify(all));
      return all[idx];
    }
  }
  const created: TransformerQuote = {
    ...q,
    id: `tq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return created;
}
export async function deleteTransformerQuote(id: string): Promise<void> {
  const all = await listTransformerQuotes();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(x => x.id !== id)));
}
