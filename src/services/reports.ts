// reports.ts — POZ-DEV-064, 065, 070
// İş emirlerinden / tekliflerden / müşterilerden günlük/haftalık/aylık özet üretir.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Report,
  ReportPeriod,
  ReportKpi,
  ReportBucket,
  WorkOrder,
  Quote,
  Customer,
  SlaItem,
} from '../types';

const KEY = '@SahaTakip:reports';

const uid = () =>
  `rpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// -------- depo --------
export async function listReports(): Promise<Report[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Report[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function getReport(id: string): Promise<Report | null> {
  const all = await listReports();
  return all.find(r => r.id === id) ?? null;
}

export async function saveReport(r: Report) {
  const all = await listReports();
  const idx = all.findIndex(x => x.id === r.id);
  if (idx >= 0) all[idx] = r;
  else all.unshift(r);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function deleteReport(id: string) {
  const all = await listReports();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(r => r.id !== id)));
}

// -------- yardımcılar --------
function isoDay(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

function inRange(dateStr: string | undefined, start: string, end: string) {
  if (!dateStr) return false;
  const d = isoDay(dateStr);
  return d >= start && d <= end;
}

export function rangeFor(period: ReportPeriod, anchor: Date = new Date()) {
  const a = new Date(anchor);
  let start: Date;
  let end: Date;
  if (period === 'daily') {
    start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    end = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  } else if (period === 'weekly') {
    const dow = (a.getDay() + 6) % 7; // pazartesi=0
    const monday = new Date(a.getFullYear(), a.getMonth(), a.getDate() - dow);
    start = monday;
    end = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  } else {
    start = new Date(a.getFullYear(), a.getMonth(), 1);
    end = new Date(a.getFullYear(), a.getMonth() + 1, 0);
  }
  return { startDate: isoDay(start), endDate: isoDay(end) };
}

function totalLaborMinutes(wo: WorkOrder): number {
  if (typeof wo.actualLaborMinutes === 'number') return wo.actualLaborMinutes;
  if (!wo.timeLogs?.length) return 0;
  return wo.timeLogs.reduce((s, t: any) => s + (t.minutes ?? 0), 0);
}

function isSlaBreach(wo: WorkOrder, now = new Date()): boolean {
  if (wo.status === 'Tamamlandı' || wo.status === 'İptal') return false;
  if (wo.plannedEnd) return new Date(wo.plannedEnd) < now;
  if (wo.slaHours && wo.date) {
    const due = new Date(new Date(wo.date).getTime() + wo.slaHours * 3_600_000);
    return due < now;
  }
  return false;
}

function tally<T>(items: T[], key: (t: T) => string, val: (t: T) => number): ReportBucket[] {
  const m = new Map<string, number>();
  items.forEach(it => {
    const k = key(it) || 'Diğer';
    m.set(k, (m.get(k) ?? 0) + val(it));
  });
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// -------- üretim --------
export function computeKpi(
  period: ReportPeriod,
  startDate: string,
  endDate: string,
  workOrders: WorkOrder[],
  quotes: Quote[],
  customers: Customer[],
): { kpi: ReportKpi; byStatus: ReportBucket[]; byEngineer: ReportBucket[]; byCustomer: ReportBucket[] } {
  const wos = workOrders.filter(w => inRange(w.date, startDate, endDate));
  const qs = quotes.filter(q => inRange((q as any).date ?? (q as any).createdAt, startDate, endDate));

  const completed = wos.filter(w => w.status === 'Tamamlandı');
  const cancelled = wos.filter(w => w.status === 'İptal');
  const open = wos.filter(
    w => w.status !== 'Tamamlandı' && w.status !== 'İptal',
  );

  const revenue = wos.reduce((s, w) => s + (w.quoteAmount ?? 0), 0);
  const cost = wos.reduce(
    (s, w) => s + (w.laborCost ?? 0) + (w.materialCost ?? 0) + (w.otherCost ?? 0),
    0,
  );
  const profit = revenue - cost;
  const laborMinutes = wos.reduce((s, w) => s + totalLaborMinutes(w), 0);
  const customersTouched = new Set(wos.map(w => w.client)).size;

  const quotesCreated = qs.length;
  const quotesAccepted = qs.filter(q => (q as any).status === 'Kabul Edildi').length;
  const slaBreaches = wos.filter(w => isSlaBreach(w)).length;

  const kpi: ReportKpi = {
    workOrdersTotal: wos.length,
    workOrdersCompleted: completed.length,
    workOrdersCancelled: cancelled.length,
    workOrdersOpen: open.length,
    revenue,
    cost,
    profit,
    laborMinutes,
    customersTouched,
    quotesCreated,
    quotesAccepted,
    slaBreaches,
  };

  const byStatus = tally(wos, w => w.status, () => 1);
  const byEngineer = tally(
    wos,
    w => w.assignedToName ?? w.engineer ?? '—',
    w => w.quoteAmount ?? 0,
  );
  const byCustomer = tally(wos, w => w.client ?? '—', w => w.quoteAmount ?? 0).slice(
    0,
    10,
  );

  // küçük lint için customers'a referans
  void customers;
  void period;

  return { kpi, byStatus, byEngineer, byCustomer };
}

export async function generateReport(
  period: ReportPeriod,
  anchor: Date,
  workOrders: WorkOrder[],
  quotes: Quote[],
  customers: Customer[],
  notes?: string,
): Promise<Report> {
  const { startDate, endDate } = rangeFor(period, anchor);
  const buckets = computeKpi(period, startDate, endDate, workOrders, quotes, customers);
  const r: Report = {
    id: uid(),
    period,
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    kpi: buckets.kpi,
    byStatus: buckets.byStatus,
    byEngineer: buckets.byEngineer,
    byCustomer: buckets.byCustomer,
    notes,
  };
  await saveReport(r);
  return r;
}

// -------- SLA --------
export function listSlaItems(workOrders: WorkOrder[]): SlaItem[] {
  const now = new Date();
  return workOrders
    .filter(w => isSlaBreach(w, now))
    .map<SlaItem>(w => {
      let due = w.plannedEnd
        ? new Date(w.plannedEnd)
        : w.slaHours && w.date
          ? new Date(new Date(w.date).getTime() + w.slaHours * 3_600_000)
          : new Date(w.date);
      const hoursOverdue = Math.max(0, (now.getTime() - due.getTime()) / 3_600_000);
      return {
        workOrderId: w.id,
        client: w.client,
        serviceName: w.serviceName,
        engineer: w.engineer,
        assignedToName: w.assignedToName,
        plannedEnd: w.plannedEnd,
        slaHours: w.slaHours,
        hoursOverdue,
        status: w.status,
      };
    })
    .sort((a, b) => b.hoursOverdue - a.hoursOverdue);
}
