// exportRows.ts — Liste verilerini CSV satırlarına (başlık + veri) çeviren SAF
// fonksiyonlar. buildCsv(...)/shareCsv(...) ile birlikte kullanılır. RN/native
// bağımlılığı yok → kolay test edilir. NaN sızıntısına karşı num() koruması.

import type { Quote, WorkOrder, Customer } from '../types';

type Cell = string | number;
type Rows = Cell[][];

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: any): string => (v === null || v === undefined ? '' : String(v));

export function quotesToRows(quotes: Quote[]): Rows {
  const header: Cell[] = ['Teklif No', 'Müşteri', 'Başlık', 'Tarih', 'Geçerlilik', 'Durum', 'Tutar (TL)'];
  const rows = (quotes ?? []).map((q): Cell[] => [
    str(q.number),
    str(q.customerTitle || q.customerName),
    str(q.title),
    str(q.date),
    str(q.validUntil),
    str(q.status),
    num(q.grandTotal),
  ]);
  return [header, ...rows];
}

export function workOrdersToRows(workOrders: WorkOrder[]): Rows {
  const header: Cell[] = ['İş Emri No', 'Müşteri', 'Hizmet', 'Tarih', 'Mühendis', 'Durum', 'Tutar (TL)', 'Kâr (TL)'];
  const rows = (workOrders ?? []).map((w): Cell[] => [
    str(w.id),
    str(w.client),
    str(w.serviceName),
    str(w.date),
    str(w.engineer),
    str(w.status),
    num(w.quoteAmount),
    num(w.profit),
  ]);
  return [header, ...rows];
}

export function customersToRows(customers: Customer[]): Rows {
  const header: Cell[] = ['Kısa Ad', 'Ünvan', 'Şehir', 'Telefon', 'Vergi No', 'Tür', 'Bakiye (TL)'];
  const rows = (customers ?? []).map((c): Cell[] => [
    str(c.shortName),
    str(c.title),
    str(c.city),
    str(c.phone),
    str(c.taxNumber),
    str(c.type),
    num(c.currentBalance),
  ]);
  return [header, ...rows];
}
