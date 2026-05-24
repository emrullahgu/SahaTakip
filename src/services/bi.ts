// bi.ts — POZ-DEV-421 Faz 38 BI & Karar Destek
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  KpiCard, DepartmentKpiSnapshot, StaffPerformanceRecord, VehicleCostRecord,
  StockConsumptionRow, QuoteOutcomeRow, CustomerProfitRow, SlaResultRow,
  RegionHeatPoint, BudgetVsActualRow, ExecutiveSummary,
} from '../types';

const KEYS = {
  kpi: 'bi_kpi_cards_v1',
  dept: 'bi_dept_kpi_v1',
  staff: 'bi_staff_perf_v1',
  vehicle: 'bi_vehicle_cost_v1',
  stock: 'bi_stock_cons_v1',
  quote: 'bi_quote_outcome_v1',
  customer: 'bi_customer_profit_v1',
  sla: 'bi_sla_v1',
  heat: 'bi_region_heat_v1',
  budget: 'bi_budget_actual_v1',
  exec: 'bi_exec_summary_v1',
};

function uid(p: string): string { return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

async function loadList<T>(k: string): Promise<T[]> {
  try { const raw = await AsyncStorage.getItem(k); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; }
}
async function saveList<T>(k: string, list: T[]): Promise<void> { await AsyncStorage.setItem(k, JSON.stringify(list)); }

// ── KPI cards ─────────────────────────────────────────────
export const KPI_CATEGORY_LABEL: Record<KpiCard['category'], string> = {
  finance: 'Finans', operations: 'Operasyon', sales: 'Satış', fleet: 'Filo', hr: 'İK', customer: 'Müşteri',
};
export const KPI_CATEGORY_COLOR: Record<KpiCard['category'], string> = {
  finance: '#22c55e', operations: '#0ea5e9', sales: '#a855f7', fleet: '#f59e0b', hr: '#ec4899', customer: '#06b6d4',
};

const DEFAULT_KPIS: Omit<KpiCard, 'id' | 'updatedAt'>[] = [];

export async function listKpiCards(): Promise<KpiCard[]> {
  // Sahte/seed veri yok — yalnızca gerçek kayıtlar döner.
  return loadList<KpiCard>(KEYS.kpi);
}
export async function resetKpis(): Promise<void> { await AsyncStorage.removeItem(KEYS.kpi); }

// ── Department KPIs ───────────────────────────────────────
export async function listDepartmentKpis(): Promise<DepartmentKpiSnapshot[]> {
  return loadList<DepartmentKpiSnapshot>(KEYS.dept);
}
export async function resetDepartmentKpis(): Promise<void> { await AsyncStorage.removeItem(KEYS.dept); }

// ── Staff performance ─────────────────────────────────────
export async function listStaffPerformance(): Promise<StaffPerformanceRecord[]> {
  return loadList<StaffPerformanceRecord>(KEYS.staff);
}
export async function resetStaffPerformance(): Promise<void> { await AsyncStorage.removeItem(KEYS.staff); }

// ── Vehicle costs ─────────────────────────────────────────
export async function listVehicleCosts(): Promise<VehicleCostRecord[]> {
  return loadList<VehicleCostRecord>(KEYS.vehicle);
}
export async function resetVehicleCosts(): Promise<void> { await AsyncStorage.removeItem(KEYS.vehicle); }

// ── Stock consumption ─────────────────────────────────────
export async function listStockConsumption(): Promise<StockConsumptionRow[]> {
  return loadList<StockConsumptionRow>(KEYS.stock);
}
export async function resetStockConsumption(): Promise<void> { await AsyncStorage.removeItem(KEYS.stock); }

// ── Quote outcomes ────────────────────────────────────────
export const WIN_REASON_LABEL: Record<NonNullable<QuoteOutcomeRow['reason']>, string> = {
  price: 'Fiyat', delivery: 'Teslimat', reference: 'Referans', tech: 'Teknik', service: 'Servis',
  price_high: 'Fiyat Yüksek', delivery_long: 'Teslimat Uzun', no_capacity: 'Kapasite',
  competitor: 'Rakip', no_budget: 'Bütçe', other: 'Diğer',
};

export async function listQuoteOutcomes(): Promise<QuoteOutcomeRow[]> {
  return loadList<QuoteOutcomeRow>(KEYS.quote);
}
export async function resetQuoteOutcomes(): Promise<void> { await AsyncStorage.removeItem(KEYS.quote); }

// ── Customer profitability ────────────────────────────────
export async function listCustomerProfit(): Promise<CustomerProfitRow[]> {
  return loadList<CustomerProfitRow>(KEYS.customer);
}
export async function resetCustomerProfit(): Promise<void> { await AsyncStorage.removeItem(KEYS.customer); }

// ── SLA ───────────────────────────────────────────────────
export async function listSlaResults(): Promise<SlaResultRow[]> {
  return loadList<SlaResultRow>(KEYS.sla);
}
export async function resetSlaResults(): Promise<void> { await AsyncStorage.removeItem(KEYS.sla); }

// ── Region heat ───────────────────────────────────────────
export async function listRegionHeat(): Promise<RegionHeatPoint[]> {
  return loadList<RegionHeatPoint>(KEYS.heat);
}
export async function resetRegionHeat(): Promise<void> { await AsyncStorage.removeItem(KEYS.heat); }

// ── Budget vs Actual ──────────────────────────────────────
export async function listBudgetVsActual(): Promise<BudgetVsActualRow[]> {
  return loadList<BudgetVsActualRow>(KEYS.budget);
}
export async function resetBudgetVsActual(): Promise<void> { await AsyncStorage.removeItem(KEYS.budget); }

// ── Executive summary ─────────────────────────────────────
export async function listExecutiveSummaries(): Promise<ExecutiveSummary[]> { return loadList<ExecutiveSummary>(KEYS.exec); }

export async function generateExecutiveSummary(): Promise<ExecutiveSummary> {
  const kpi = await listKpiCards();
  const dept = await listDepartmentKpis();
  const customers = await listCustomerProfit();
  const slas = await listSlaResults();
  const slaSuccess = slas.length ? Math.round(slas.filter(s => s.success).length / slas.length * 100) : 0;
  const totalRevenue = customers.reduce((a, b) => a + b.revenue, 0);
  const bestDept = [...dept].sort((a, b) => b.margin - a.margin)[0];
  const worstDept = [...dept].sort((a, b) => a.margin - b.margin)[0];
  const top = [...customers].sort((a, b) => b.margin - a.margin).slice(0, 3).map(c => c.customerName).join(', ');
  const highlights = [
    `Aylık toplam ciro ${totalRevenue.toLocaleString('tr-TR')} ₺`,
    bestDept ? `En kârlı departman: ${bestDept.departmentName} (₺${bestDept.margin.toLocaleString('tr-TR')})` : '',
    `SLA başarı oranı: %${slaSuccess}`,
    `En kârlı 3 müşteri: ${top}`,
  ].filter(Boolean);
  const warnings = [
    worstDept && worstDept.margin < 0 ? `${worstDept.departmentName} departmanı zararda` : '',
    slaSuccess < 85 ? `SLA başarısı kritik düzeyde (%${slaSuccess})` : '',
    customers.filter(c => c.margin < 0).length > 0 ? `${customers.filter(c => c.margin < 0).length} müşteride negatif marj` : '',
  ].filter(Boolean) as string[];
  const summary: ExecutiveSummary = {
    id: uid('exs'), period: new Date().toISOString().slice(0, 7),
    generatedAt: new Date().toISOString(), highlights, warnings,
    kpiSnapshot: kpi.slice(0, 6).map(k => ({ label: k.label, value: k.value, unit: k.unit })),
  };
  const list = await loadList<ExecutiveSummary>(KEYS.exec);
  await saveList(KEYS.exec, [summary, ...list].slice(0, 24));
  return summary;
}

// ── Pivot export ──────────────────────────────────────────
export function toCsv(rows: Array<Record<string, any>>): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[,;"\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}
