// Faz 59 — Orders service (Ord*)
// Sahte demo seed kaldirildi; gercek siparis tablosu (orders) olusturuldugunda Supabase'e baglanacak.
// Su an icin bos liste / sifir ozet doner.
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

export const ORD_RECURRING_FREQ_LABEL: Record<OrdRecurringTemplate['frequency'], string> = {
  weekly: 'Haftalık', biweekly: '2 Haftada Bir', monthly: 'Aylık', quarterly: '3 Aylık',
};

export async function listOrders(): Promise<Order[]> {
  return [];
}

export async function getOrder(_id: string): Promise<Order | undefined> {
  return undefined;
}

export async function listRecurringOrders(): Promise<OrdRecurringTemplate[]> {
  return [];
}

export async function getOrdSummary(): Promise<OrdSummary> {
  const byStatus: Record<OrdStatus, number> = {
    draft: 0, submitted: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0,
  };
  return {
    totalOrders: 0,
    totalValue: 0,
    byStatus,
    avgOrderValue: 0,
    topProducts: [],
  };
}

export function nextStatus(s: OrdStatus): OrdStatus | null {
  const flow: OrdStatus[] = ['draft', 'submitted', 'confirmed', 'preparing', 'shipped', 'delivered'];
  const i = flow.indexOf(s);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}
