// ====================================================================
// customerHistory — POZ-DEV-046
// Müşteriye ait teklif + iş emri + belge + puan kayıtlarından
// kronolojik bir timeline türetir.
// ====================================================================

import { Quote, WorkOrder, CustomerTimelineItem, Customer } from '../types';
import { listDocumentsByCustomer } from './customerDocuments';
import { listRatingsByCustomer } from './customerRatings';

export async function buildTimeline(
  customer: Customer,
  quotes: Quote[],
  workOrders: WorkOrder[],
): Promise<CustomerTimelineItem[]> {
  const items: CustomerTimelineItem[] = [];

  // Teklifler
  quotes
    .filter(q => q.customerName === customer.shortName || q.customerTitle === customer.title)
    .forEach(q => {
      items.push({
        id: `q-${q.id}`,
        kind: 'quote',
        title: `Teklif ${q.number}`,
        subtitle: `${q.title} · ${q.status}`,
        date: q.date,
        refId: q.id,
        meta: { amount: q.grandTotal, status: q.status },
      });
    });

  // İş emirleri
  workOrders
    .filter(w => w.client === customer.shortName || w.client === customer.title)
    .forEach(w => {
      items.push({
        id: `w-${w.id}`,
        kind: 'workOrder',
        title: `İş Emri ${w.id}`,
        subtitle: `${w.serviceName} · ${w.status}`,
        date: w.date,
        refId: w.id,
        meta: { status: w.status, amount: w.quoteAmount },
      });
    });

  // Belgeler
  const docs = await listDocumentsByCustomer(customer.id);
  docs.forEach(d => {
    items.push({
      id: `d-${d.id}`,
      kind: 'document',
      title: d.name,
      subtitle: d.category || 'Belge',
      date: d.uploadedAt.slice(0, 10),
      refId: d.id,
    });
  });

  // Puanlar
  const ratings = await listRatingsByCustomer(customer.id);
  ratings.forEach(r => {
    items.push({
      id: `r-${r.id}`,
      kind: 'rating',
      title: `Memnuniyet: ${r.score}/5`,
      subtitle: r.comment || (r.workOrderId ? `İş emri: ${r.workOrderId}` : 'Genel'),
      date: r.createdAt.slice(0, 10),
      refId: r.id,
      meta: { score: r.score },
    });
  });

  // Tarihe göre yeni → eski sırala
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}
