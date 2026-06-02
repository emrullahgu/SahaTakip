// ====================================================================
// Teklif Akış Servisi — POZ-DEV-433
// ====================================================================
import { Quote, WorkOrder } from '../types';
import { workOrdersRepo, quotesRepo } from './data';

/**
 * Kabul edilmiş bir tekliften iş emri objesi türetir.
 */
export function deriveWorkOrderFromQuote(q: Quote, nextWoNumber: number): WorkOrder {
  const woId = `IE-${new Date().getFullYear()}-${String(nextWoNumber).padStart(3, '0')}`;

  return {
    id: woId,
    client: q.customerTitle || q.customerName,
    serviceName: q.title,
    date: new Date().toISOString().slice(0, 10),
    engineer: q.engineer,
    materials: q.lines.map(l => ({
      id: l.pozId,
      name: l.pozName,
      unit: l.unit,
      quantity: l.quantity,
      price: l.materialPrice,
    })) as any,
    otherCost: 0,
    laborCost: q.lines.reduce((s, l) => s + l.installPrice * l.quantity, 0),
    materialCost: q.lines.reduce((s, l) => s + l.materialPrice * l.quantity, 0),
    quoteAmount: q.grandTotal,
    profit: 0,
    status: 'Bekliyor',
    beforePhoto: '',
    afterPhoto: '',
    notes: `Teklif ${q.number} kabulünden oluşturuldu.`,
    priority: 'Normal',
    assignmentStatus: 'Atanmadı',
  };
}

/**
 * Teklifi sunucuda kabul edildi olarak işaretler ve iş emrini kaydeder.
 */
export async function finalizeQuoteAcceptance(
  q: Quote,
  workOrder: WorkOrder,
  signedBy?: string,
  signature?: string
): Promise<void> {
  // 1. İş emrini kaydet
  await workOrdersRepo.insert(workOrder);

  // 2. Teklifi güncelle
  const acceptedQuote: Quote = {
    ...q,
    status: 'Kabul Edildi',
    acceptedAt: new Date().toISOString(),
    acceptedBy: signedBy,
    acceptSignature: signature,
    generatedWorkOrderId: workOrder.id,
  };
  await quotesRepo.update(q.id, acceptedQuote);
}
