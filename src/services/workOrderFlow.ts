// ====================================================================
// İş emri durum akışı yardımcıları — FAZ 3
// ====================================================================

import type { WorkOrder, WorkOrderPriority, WorkOrderJobType } from '../types';

// ---- İş türü (saha / ofis / uzaktan) ----
export const WORK_ORDER_JOB_TYPES: { value: WorkOrderJobType; label: string; icon: string }[] = [
  { value: 'FIELD', label: 'Saha İşi', icon: 'location' },
  { value: 'OFFICE', label: 'Ofis İşi', icon: 'business' },
  { value: 'REMOTE', label: 'Uzaktan Destek', icon: 'laptop' },
];

export function jobTypeLabel(t?: WorkOrderJobType): string {
  return WORK_ORDER_JOB_TYPES.find(x => x.value === t)?.label ?? 'Saha İşi';
}

/** Sadece saha işleri (FIELD) lokasyon/check-in gerektirir; ofis/uzaktan gerektirmez. */
export function requiresCheckIn(wo: Pick<WorkOrder, 'jobType'>): boolean {
  return (wo.jobType ?? 'FIELD') === 'FIELD';
}

export const WORK_STATUS_FLOW: WorkOrder['status'][] = [
  'Bekliyor',
  'Atandı',
  'Yolda',
  'Başladı',
  'Tamamlandı',
];

export const TERMINAL_STATUSES: WorkOrder['status'][] = [
  'Tamamlandı',
  'İptal',
  'Faturalandırıldı',
];

/** Bir sonraki adıma izin verilen geçişler */
export const NEXT_STATUS: Record<string, WorkOrder['status'][]> = {
  Bekliyor: ['Atandı', 'İptal'],
  Atandı: ['Yolda', 'Bekliyor', 'İptal'],
  Yolda: ['Başladı', 'Atandı', 'İptal'],
  Başladı: ['Tamamlandı', 'Yolda', 'İptal'],
  Tamamlandı: ['Onay Bekliyor'],
  'Onay Bekliyor': ['Teklif Gönderildi', 'Tamamlandı'],
  'Teklif Gönderildi': ['Faturalandırıldı'],
  Faturalandırıldı: [],
  İptal: [],
};

export function canTransition(from: WorkOrder['status'], to: WorkOrder['status']): boolean {
  return (NEXT_STATUS[from] ?? []).includes(to);
}

export function statusColor(status: WorkOrder['status']): string {
  switch (status) {
    case 'Bekliyor':
      return '#64748b';
    case 'Atandı':
      return '#3b82f6';
    case 'Yolda':
      return '#0ea5e9';
    case 'Başladı':
      return '#f59e0b';
    case 'Tamamlandı':
      return '#22c55e';
    case 'İptal':
      return '#dc2626';
    case 'Onay Bekliyor':
      return '#a855f7';
    case 'Teklif Gönderildi':
      return '#06b6d4';
    case 'Faturalandırıldı':
      return '#16a34a';
    default:
      return '#475569';
  }
}

export function priorityColor(p?: WorkOrderPriority): string {
  switch (p) {
    case 'Acil':
      return '#dc2626';
    case 'Yüksek':
      return '#f59e0b';
    case 'Normal':
    default:
      return '#64748b';
  }
}

/**
 * SLA aşımı kontrolü — plannedEnd veya plannedStart+slaHours geçmişse true.
 */
export function isSlaBreached(w: WorkOrder, now = new Date()): boolean {
  if (TERMINAL_STATUSES.includes(w.status)) return false;
  if (w.plannedEnd) {
    return new Date(w.plannedEnd).getTime() < now.getTime();
  }
  if (w.plannedStart && w.slaHours) {
    const deadline = new Date(w.plannedStart).getTime() + w.slaHours * 3600 * 1000;
    return deadline < now.getTime();
  }
  return false;
}

/**
 * SLA'ya kalan süre (ms). Negatifse geçmiş.
 */
export function slaRemainingMs(w: WorkOrder, now = new Date()): number | null {
  if (w.plannedEnd) {
    return new Date(w.plannedEnd).getTime() - now.getTime();
  }
  if (w.plannedStart && w.slaHours) {
    return (
      new Date(w.plannedStart).getTime() + w.slaHours * 3600 * 1000 - now.getTime()
    );
  }
  return null;
}

export function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const sign = ms < 0 ? '-' : '';
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${sign}${d}g ${h % 24}s`;
  }
  return `${sign}${h}s ${m}d`;
}

/**
 * Zaman loglarından toplam dakikayı hesaplar.
 */
export function totalLabourMinutes(logs?: WorkOrder['timeLogs']): number {
  if (!logs) return 0;
  return logs.reduce((sum, l) => {
    if (l.minutes != null) return sum + l.minutes;
    if (l.endAt) {
      return sum + Math.round((new Date(l.endAt).getTime() - new Date(l.startAt).getTime()) / 60000);
    }
    return sum;
  }, 0);
}

/**
 * Tamamlanan iş emrinin maliyet hesabı.
 * laborCost: birim dakika oranı varsa hesaplar; yoksa mevcut laborCost kalır.
 */
export function recomputeWorkOrderCosts(w: WorkOrder, dailyRatePerHour = 250): WorkOrder {
  const minutes = totalLabourMinutes(w.timeLogs);
  const computedLabor = minutes > 0 ? Math.round((minutes / 60) * dailyRatePerHour) : w.laborCost;
  // İskontoyu UYGULA + SAVUNMACI oku — bazı kayıtlar qty yerine quantity kullaniyor
  // (teklif-kabul yolu); ham çarpım NaN/negatif tutar üretmesin (denetim).
  const materialCost = w.materials.reduce((s, m: any) => {
    const price = Number(m.price) || 0;
    const qty = Number(m.qty ?? m.quantity) || 0;
    const disc = Math.min(100, Math.max(0, Number(m.discountPct) || 0));
    return s + price * qty * (1 - disc / 100);
  }, 0);
  return {
    ...w,
    actualLaborMinutes: minutes,
    laborCost: computedLabor,
    materialCost,
    profit: (w.quoteAmount || 0) - computedLabor - materialCost - (w.otherCost || 0),
  };
}
