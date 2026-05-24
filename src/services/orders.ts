// Faz 59 — Orders service (Ord*) — STATIC demo dataset
import type { Order, OrdStatus, OrdRecurringTemplate, OrdSummary } from '../types';

export const ORD_STATUS_LABEL: Record<OrdStatus, string> = {
  draft: 'Taslak',
  submitted: 'Gönderildi',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Sevk Edildi',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

export const ORD_STATUS_COLOR: Record<OrdStatus, string> = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  confirmed: '#06b6d4',
  preparing: '#f59e0b',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

export const ORD_STATUS_ICON: Record<OrdStatus, string> = {
  draft: 'document-outline',
  submitted: 'send',
  confirmed: 'checkmark-circle',
  preparing: 'cube',
  shipped: 'car',
  delivered: 'checkmark-done-circle',
  cancelled: 'close-circle',
};

export const ORD_CHANNEL_LABEL: Record<Order['channel'], string> = {
  field: 'Saha',
  phone: 'Telefon',
  portal: 'Müşteri Portalı',
  recurring: 'Tekrarlayan',
};

const ORDERS: Order[] = [
  {
    id: 'o1', code: 'SP-2026-0142', customerId: 'c1', customerName: 'Yıldız Endüstri A.Ş.',
    orderDate: '2026-05-22', deliveryDate: '2026-05-28', status: 'preparing',
    items: [
      { id: 'i1', productName: 'Trafo 1000kVA', sku: 'TR-1000', qty: 2, unit: 'adet', unitPrice: 185000, discount: 5000, vatRate: 20, total: 432000 },
      { id: 'i2', productName: 'OG Hücre', sku: 'OG-24', qty: 4, unit: 'adet', unitPrice: 45000, discount: 0, vatRate: 20, total: 216000 },
    ],
    subtotal: 540000, discountTotal: 5000, vatTotal: 108000, total: 648000, currency: 'TRY',
    salesRepId: 's1', salesRepName: 'Ahmet Yılmaz', paymentTerms: '30 gün vadeli', channel: 'field',
    notes: 'Müşteri öncelikli teslimat istedi.', createdAt: '2026-05-22 14:30',
  },
  {
    id: 'o2', code: 'SP-2026-0141', customerId: 'c2', customerName: 'Mavi İnşaat Ltd.',
    orderDate: '2026-05-21', status: 'submitted',
    items: [
      { id: 'i3', productName: 'Pano Malzemesi Set', sku: 'PNL-S', qty: 1, unit: 'set', unitPrice: 78000, discount: 3000, vatRate: 20, total: 90000 },
    ],
    subtotal: 78000, discountTotal: 3000, vatTotal: 15000, total: 90000, currency: 'TRY',
    salesRepId: 's2', salesRepName: 'Mehmet Kaya', paymentTerms: 'Peşin', channel: 'phone', createdAt: '2026-05-21 11:00',
  },
  {
    id: 'o3', code: 'SP-2026-0140', customerId: 'c3', customerName: 'Anadolu OSB',
    orderDate: '2026-05-20', deliveryDate: '2026-05-25', status: 'delivered',
    items: [
      { id: 'i4', productName: 'Kablo NYY 4x16', sku: 'KB-4x16', qty: 500, unit: 'm', unitPrice: 145, discount: 0, vatRate: 20, total: 87000 },
    ],
    subtotal: 72500, discountTotal: 0, vatTotal: 14500, total: 87000, currency: 'TRY',
    salesRepId: 's1', salesRepName: 'Ahmet Yılmaz', paymentTerms: '60 gün vadeli', channel: 'field', createdAt: '2026-05-20 09:15',
  },
  {
    id: 'o4', code: 'SP-2026-0139', customerId: 'c4', customerName: 'GES Solar Proje',
    orderDate: '2026-05-19', status: 'confirmed',
    items: [
      { id: 'i5', productName: 'PV Panel 550W', sku: 'PV-550', qty: 120, unit: 'adet', unitPrice: 3200, discount: 12000, vatRate: 20, total: 446400 },
      { id: 'i6', productName: 'İnverter 50kW', sku: 'INV-50', qty: 3, unit: 'adet', unitPrice: 95000, discount: 0, vatRate: 20, total: 342000 },
    ],
    subtotal: 669000, discountTotal: 12000, vatTotal: 131400, total: 788400, currency: 'TRY',
    salesRepId: 's3', salesRepName: 'Ayşe Demir', paymentTerms: '50% peşin 50% teslimat', channel: 'portal', createdAt: '2026-05-19 16:45',
  },
  {
    id: 'o5', code: 'SP-2026-0138', customerId: 'c5', customerName: 'Acar Tekstil',
    orderDate: '2026-05-18', status: 'shipped',
    items: [
      { id: 'i7', productName: 'Bakım Servisi (yıllık)', sku: 'SRV-BAKIM', qty: 1, unit: 'sözleşme', unitPrice: 48000, discount: 0, vatRate: 20, total: 57600 },
    ],
    subtotal: 48000, discountTotal: 0, vatTotal: 9600, total: 57600, currency: 'TRY',
    salesRepId: 's2', salesRepName: 'Mehmet Kaya', paymentTerms: 'Aylık ödeme', channel: 'recurring', createdAt: '2026-05-18 10:00',
  },
  {
    id: 'o6', code: 'SP-2026-0137', customerId: 'c6', customerName: 'Demir Holding',
    orderDate: '2026-05-17', status: 'draft',
    items: [
      { id: 'i8', productName: 'UPS 20kVA', sku: 'UPS-20', qty: 1, unit: 'adet', unitPrice: 125000, discount: 0, vatRate: 20, total: 150000 },
    ],
    subtotal: 125000, discountTotal: 0, vatTotal: 25000, total: 150000, currency: 'TRY',
    salesRepId: 's1', salesRepName: 'Ahmet Yılmaz', paymentTerms: 'Görüşülecek', channel: 'field', createdAt: '2026-05-17 13:20',
  },
  {
    id: 'o7', code: 'SP-2026-0136', customerId: 'c2', customerName: 'Mavi İnşaat Ltd.',
    orderDate: '2026-05-15', status: 'cancelled',
    items: [
      { id: 'i9', productName: 'Aydınlatma Armatürü', sku: 'ARM-LED', qty: 50, unit: 'adet', unitPrice: 850, discount: 0, vatRate: 20, total: 51000 },
    ],
    subtotal: 42500, discountTotal: 0, vatTotal: 8500, total: 51000, currency: 'TRY',
    salesRepId: 's3', salesRepName: 'Ayşe Demir', paymentTerms: 'Peşin', channel: 'phone', notes: 'Müşteri proje iptali bildirdi.', createdAt: '2026-05-15 15:10',
  },
  {
    id: 'o8', code: 'SP-2026-0135', customerId: 'c1', customerName: 'Yıldız Endüstri A.Ş.',
    orderDate: '2026-05-14', deliveryDate: '2026-05-20', status: 'delivered',
    items: [
      { id: 'i10', productName: 'Topraklama Seti', sku: 'TPR-SET', qty: 5, unit: 'set', unitPrice: 18500, discount: 0, vatRate: 20, total: 111000 },
    ],
    subtotal: 92500, discountTotal: 0, vatTotal: 18500, total: 111000, currency: 'TRY',
    salesRepId: 's1', salesRepName: 'Ahmet Yılmaz', paymentTerms: '30 gün vadeli', channel: 'field', createdAt: '2026-05-14 09:00',
  },
];

const RECURRING: OrdRecurringTemplate[] = [
  { id: 'r1', name: 'Aylık bakım sözleşmesi', customerName: 'Acar Tekstil', frequency: 'monthly', nextRun: '2026-06-18', itemCount: 1, estimatedTotal: 57600, active: true },
  { id: 'r2', name: 'Haftalık sarf malzeme', customerName: 'Mavi İnşaat Ltd.', frequency: 'weekly', nextRun: '2026-05-28', itemCount: 4, estimatedTotal: 18500, active: true },
  { id: 'r3', name: 'Üç aylık periyodik kontrol', customerName: 'Anadolu OSB', frequency: 'quarterly', nextRun: '2026-08-15', itemCount: 2, estimatedTotal: 32000, active: true },
  { id: 'r4', name: '2 haftalık servis ziyareti', customerName: 'Yıldız Endüstri A.Ş.', frequency: 'biweekly', nextRun: '2026-06-04', itemCount: 1, estimatedTotal: 24000, active: false },
];

export const ORD_RECURRING_FREQ_LABEL: Record<OrdRecurringTemplate['frequency'], string> = {
  weekly: 'Haftalık', biweekly: '2 Haftada Bir', monthly: 'Aylık', quarterly: '3 Aylık',
};

export async function listOrders(): Promise<Order[]> {
  return ORDERS.slice().sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return ORDERS.find(o => o.id === id);
}

export async function listRecurringOrders(): Promise<OrdRecurringTemplate[]> {
  return RECURRING;
}

export async function getOrdSummary(): Promise<OrdSummary> {
  const byStatus: Record<OrdStatus, number> = {
    draft: 0, submitted: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0,
  };
  let totalValue = 0;
  const productMap = new Map<string, { qty: number; revenue: number }>();
  ORDERS.forEach(o => {
    byStatus[o.status]++;
    if (o.status !== 'cancelled' && o.status !== 'draft') totalValue += o.total;
    o.items.forEach(it => {
      const prev = productMap.get(it.productName) ?? { qty: 0, revenue: 0 };
      productMap.set(it.productName, { qty: prev.qty + it.qty, revenue: prev.revenue + it.total });
    });
  });
  const topProducts = [...productMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const validCount = ORDERS.length - byStatus.cancelled - byStatus.draft;
  return {
    totalOrders: ORDERS.length,
    totalValue,
    byStatus,
    avgOrderValue: validCount > 0 ? totalValue / validCount : 0,
    topProducts,
  };
}

export function nextStatus(s: OrdStatus): OrdStatus | null {
  const flow: OrdStatus[] = ['draft', 'submitted', 'confirmed', 'preparing', 'shipped', 'delivered'];
  const i = flow.indexOf(s);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}
