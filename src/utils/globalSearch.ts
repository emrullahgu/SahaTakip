// globalSearch.ts — Çapraz-varlık arama (müşteri + teklif + iş emri tek sorguda).
// Aramalar bugün her ekranda izole; bu saf fonksiyon AppContext'teki RAM verisi
// üzerinden Türkçe aksan-toleranslı tek bir sonuç listesi üretir. SAF → test edilir.

import { matchesAnyField } from './search';
import type { Quote, Customer, WorkOrder } from '../types';

export type GlobalResultKind = 'customer' | 'quote' | 'workOrder';

export interface GlobalResult {
  kind: GlobalResultKind;
  id: string;       // navigation parametresi (customerId / quoteId / workOrderId)
  primary: string;  // başlık satırı
  secondary: string; // alt satır (ek bağlam)
}

export interface GlobalSearchData {
  quotes: Quote[];
  customers: Customer[];
  workOrders: WorkOrder[];
}

/** Boş/whitespace sorgu → boş sonuç. Aksi halde üç varlıkta arar, tek listeye indirir. */
export function buildGlobalResults(query: string, data: GlobalSearchData): GlobalResult[] {
  const q = (query ?? '').trim();
  if (!q) return [];

  const out: GlobalResult[] = [];

  for (const c of data.customers ?? []) {
    if (matchesAnyField([c.shortName, c.title, c.city, c.phone, c.taxNumber], q)) {
      out.push({
        kind: 'customer',
        id: c.id,
        primary: c.title || c.shortName || c.id,
        secondary: [c.city, c.phone].filter(Boolean).join(' · ') || 'Müşteri',
      });
    }
  }

  for (const qu of data.quotes ?? []) {
    if (matchesAnyField([qu.number, qu.customerName, qu.customerTitle, qu.title], q)) {
      out.push({
        kind: 'quote',
        id: qu.id,
        primary: `${qu.number} · ${qu.customerName || ''}`.trim(),
        secondary: [qu.title, qu.status].filter(Boolean).join(' · ') || 'Teklif',
      });
    }
  }

  for (const w of data.workOrders ?? []) {
    if (matchesAnyField([w.id, w.client, w.serviceName, w.engineer], q)) {
      out.push({
        kind: 'workOrder',
        id: w.id,
        primary: `${w.id} · ${w.client || ''}`.trim(),
        secondary: [w.serviceName, w.status].filter(Boolean).join(' · ') || 'İş Emri',
      });
    }
  }

  return out;
}
