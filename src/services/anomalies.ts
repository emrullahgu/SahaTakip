// services/anomalies.ts — POZ-DEV-094 Anomali tespiti (kural + z-score)
import { Anomaly, AnomalySeverity, Employee, Payment, Quote, WorkOrder } from '../types';

function rid(): string {
  return `an_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.floor((b - a) / DAY_MS);
}
function daysSince(iso: string): number {
  return daysBetween(iso, new Date().toISOString());
}
function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
}

function sevByScore(score: number): AnomalySeverity {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export interface AnomalyInput {
  workOrders: WorkOrder[];
  payments: Payment[];
  employees: Employee[];
  quotes: Quote[];
}

export function detectAnomalies({ workOrders, payments, employees, quotes }: AnomalyInput): Anomaly[] {
  const out: Anomaly[] = [];
  const nowIso = new Date().toISOString();

  // 1) WO overdue (plannedEnd geçmiş ve hâlâ tamamlanmadı)
  for (const w of workOrders) {
    if (!w.plannedEnd) continue;
    const done = w.status === 'Tamamlandı' || w.status === 'Faturalandırıldı' || w.status === 'İptal';
    if (done) continue;
    const overdue = daysSince(w.plannedEnd);
    if (overdue > 0) {
      const score = Math.min(100, 40 + overdue * 8);
      out.push({
        id: rid(),
        kind: 'wo_overdue',
        severity: sevByScore(score),
        title: `Gecikmiş iş emri: ${w.serviceName}`,
        description: `${w.client} · ${overdue} gün gecikmiş (planlanan bitiş: ${new Date(w.plannedEnd).toLocaleDateString('tr-TR')})`,
        targetType: 'workOrder',
        targetId: w.id,
        targetLabel: w.serviceName,
        score,
        detectedAt: nowIso,
      });
    }
  }

  // 2) WO çok uzun (actualLaborMinutes z-score)
  const durations = workOrders
    .map(w => w.actualLaborMinutes || 0)
    .filter(d => d > 0);
  const dMean = mean(durations);
  const dStd = stddev(durations);
  if (dStd > 0) {
    for (const w of workOrders) {
      const d = w.actualLaborMinutes || 0;
      if (d <= 0) continue;
      const z = (d - dMean) / dStd;
      if (z > 2) {
        const score = Math.min(100, 40 + z * 15);
        out.push({
          id: rid(),
          kind: 'wo_long_duration',
          severity: sevByScore(score),
          title: `Aşırı uzun süren iş: ${w.serviceName}`,
          description: `${Math.round(d / 60)} saat (ort. ${Math.round(dMean / 60)} sa). Z-skor: ${z.toFixed(1)}`,
          targetType: 'workOrder',
          targetId: w.id,
          targetLabel: w.serviceName,
          score,
          detectedAt: nowIso,
        });
      }
    }
  }

  // 3) Geç ödeme (pending payments > 30 gün)
  for (const p of payments) {
    if (p.status !== 'pending') continue;
    const age = daysSince(p.createdAt || p.receivedAt);
    if (age > 30) {
      const score = Math.min(100, 30 + age);
      out.push({
        id: rid(),
        kind: 'payment_late',
        severity: sevByScore(score),
        title: `Geciken tahsilat: ${p.customerName}`,
        description: `₺${p.amount.toLocaleString('tr-TR')} · ${age} gündür beklemede`,
        targetType: 'payment',
        targetId: p.id,
        targetLabel: p.customerName,
        score,
        detectedAt: nowIso,
      });
    }
  }

  // 4) Pasif personel (son 30 günde atama yok)
  const woByEmp = new Map<string, WorkOrder[]>();
  for (const w of workOrders) {
    const key = w.assignedToId || w.engineer || '';
    if (!key) continue;
    if (!woByEmp.has(key)) woByEmp.set(key, []);
    woByEmp.get(key)!.push(w);
  }
  for (const e of employees) {
    const list = woByEmp.get(e.id) || woByEmp.get(e.name) || [];
    if (list.length === 0) continue; // never assigned → skip
    const lastDate = list.reduce<string>((acc, w) => (w.date > acc ? w.date : acc), '1970-01-01');
    const age = daysSince(lastDate);
    if (age > 30) {
      const score = Math.min(100, 20 + age);
      out.push({
        id: rid(),
        kind: 'employee_inactive',
        severity: sevByScore(score),
        title: `Pasif personel: ${e.name}`,
        description: `${age} gündür yeni iş atanmamış`,
        targetType: 'employee',
        targetId: e.id,
        targetLabel: e.name,
        score,
        detectedAt: nowIso,
      });
    }
  }

  // 5) Bayat teklif (60+ gün, kararsız)
  for (const q of quotes) {
    const qq = q as unknown as { id: string; status?: string; createdAt?: string; date?: string; customerName?: string };
    const status = qq.status || 'pending';
    if (['accepted', 'rejected', 'expired', 'cancelled'].includes(status)) continue;
    const created = qq.createdAt || qq.date;
    if (!created) continue;
    const age = daysSince(created);
    if (age > 60) {
      const score = Math.min(100, 30 + age * 0.5);
      out.push({
        id: rid(),
        kind: 'quote_stale',
        severity: sevByScore(score),
        title: `Bayat teklif: ${qq.customerName || qq.id}`,
        description: `${age} gündür yanıt bekleniyor`,
        targetType: 'quote',
        targetId: qq.id,
        targetLabel: qq.customerName,
        score,
        detectedAt: nowIso,
      });
    }
  }

  // 6) Maliyet patlaması (WO materialCost+laborCost+otherCost vs quoteAmount)
  for (const w of workOrders) {
    const cost = (w.materialCost || 0) + (w.laborCost || 0) + (w.otherCost || 0);
    if (cost <= 0 || w.quoteAmount <= 0) continue;
    const ratio = cost / w.quoteAmount;
    if (ratio > 1.2) {
      const score = Math.min(100, 40 + (ratio - 1) * 80);
      out.push({
        id: rid(),
        kind: 'cost_spike',
        severity: sevByScore(score),
        title: `Maliyet patlaması: ${w.serviceName}`,
        description: `Maliyet/teklif oranı: ${(ratio * 100).toFixed(0)}% (₺${cost.toLocaleString('tr-TR')} / ₺${w.quoteAmount.toLocaleString('tr-TR')})`,
        targetType: 'workOrder',
        targetId: w.id,
        targetLabel: w.serviceName,
        score,
        detectedAt: nowIso,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score);
}

export const ANOMALY_KIND_LABEL: Record<Anomaly['kind'], string> = {
  wo_overdue: 'Gecikmiş İş',
  wo_long_duration: 'Uzun Süren İş',
  payment_late: 'Geç Tahsilat',
  employee_inactive: 'Pasif Personel',
  quote_stale: 'Bayat Teklif',
  cost_spike: 'Maliyet Patlaması',
};
export const ANOMALY_KIND_ICON: Record<Anomaly['kind'], string> = {
  wo_overdue: 'time-outline',
  wo_long_duration: 'hourglass-outline',
  payment_late: 'cash-outline',
  employee_inactive: 'person-remove-outline',
  quote_stale: 'document-outline',
  cost_spike: 'trending-up-outline',
};
export const ANOMALY_SEVERITY_COLOR: Record<AnomalySeverity, string> = {
  low: '#0ea5e9',
  medium: '#f59e0b',
  high: '#dc2626',
};
export const ANOMALY_SEVERITY_LABEL: Record<AnomalySeverity, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};
