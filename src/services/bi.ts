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
function rand(min: number, max: number): number { return Math.round(min + Math.random() * (max - min)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

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

const DEFAULT_KPIS: Omit<KpiCard, 'id' | 'updatedAt'>[] = [
  { label: 'Aylık Gelir', value: 1_250_000, unit: '₺', target: 1_500_000, direction: 'up_is_good', trendPct: 8.4, category: 'finance' },
  { label: 'Brüt Kâr', value: 312_500, unit: '₺', target: 400_000, direction: 'up_is_good', trendPct: 5.1, category: 'finance' },
  { label: 'Tamamlanan İş Emri', value: 287, target: 300, direction: 'up_is_good', trendPct: 12, category: 'operations' },
  { label: 'SLA Başarısı', value: 92, unit: '%', target: 95, direction: 'up_is_good', trendPct: 2.1, category: 'operations' },
  { label: 'Aktif Teklifler', value: 42, target: 60, direction: 'up_is_good', trendPct: -3.2, category: 'sales' },
  { label: 'Kazanım Oranı', value: 38, unit: '%', target: 50, direction: 'up_is_good', trendPct: 1.4, category: 'sales' },
  { label: 'Filo Maliyeti', value: 78_400, unit: '₺', target: 70_000, direction: 'down_is_good', trendPct: 4.2, category: 'fleet' },
  { label: 'Yakıt Tüketimi', value: 4_850, unit: 'L', target: 5_000, direction: 'down_is_good', trendPct: -1.8, category: 'fleet' },
  { label: 'Aktif Personel', value: 24, direction: 'neutral', trendPct: 0, category: 'hr' },
  { label: 'Müşteri Memnuniyeti', value: 4.5, unit: '/5', target: 4.7, direction: 'up_is_good', trendPct: 0.6, category: 'customer' },
];

export async function listKpiCards(): Promise<KpiCard[]> {
  const cur = await loadList<KpiCard>(KEYS.kpi);
  if (cur.length > 0) return cur;
  const now = new Date().toISOString();
  const seeded: KpiCard[] = DEFAULT_KPIS.map(k => ({ ...k, id: uid('kpi'), updatedAt: now }));
  await saveList(KEYS.kpi, seeded);
  return seeded;
}
export async function resetKpis(): Promise<void> { await AsyncStorage.removeItem(KEYS.kpi); }

// ── Department KPIs ───────────────────────────────────────
const DEPT_NAMES = ['HVAC', 'Soğutma', 'Otomasyon', 'Bakım', 'Kurulum'];
export async function listDepartmentKpis(): Promise<DepartmentKpiSnapshot[]> {
  const cur = await loadList<DepartmentKpiSnapshot>(KEYS.dept);
  if (cur.length > 0) return cur;
  const period = new Date().toISOString().slice(0, 7);
  const seeded: DepartmentKpiSnapshot[] = DEPT_NAMES.map((n, i) => {
    const rev = rand(200_000, 800_000);
    const cost = Math.round(rev * (0.55 + Math.random() * 0.2));
    return {
      id: uid('dk'), departmentId: 'dept_' + i, departmentName: n, period,
      revenue: rev, cost, margin: rev - cost,
      jobsCompleted: rand(20, 80), slaSuccessPct: rand(75, 99),
      updatedAt: new Date().toISOString(),
    };
  });
  await saveList(KEYS.dept, seeded);
  return seeded;
}
export async function resetDepartmentKpis(): Promise<void> { await AsyncStorage.removeItem(KEYS.dept); }

// ── Staff performance ─────────────────────────────────────
const STAFF_NAMES = ['Ali Demir', 'Mehmet Kaya', 'Ayşe Yıldız', 'Fatma Çelik', 'Hasan Polat', 'Zeynep Acar', 'Mustafa Şahin'];
export async function listStaffPerformance(): Promise<StaffPerformanceRecord[]> {
  const cur = await loadList<StaffPerformanceRecord>(KEYS.staff);
  if (cur.length > 0) return cur;
  const period = new Date().toISOString().slice(0, 7);
  const seeded = STAFF_NAMES.map((n, i) => {
    const assigned = rand(15, 40);
    const completed = rand(Math.floor(assigned * 0.6), assigned);
    return {
      id: uid('sp'), userId: 'u' + i, fullName: n, period,
      jobsAssigned: assigned, jobsCompleted: completed,
      avgCompletionHours: Math.round((Math.random() * 6 + 1.5) * 10) / 10,
      ratingAvg: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      punctualityPct: rand(70, 99),
    };
  });
  await saveList(KEYS.staff, seeded);
  return seeded;
}
export async function resetStaffPerformance(): Promise<void> { await AsyncStorage.removeItem(KEYS.staff); }

// ── Vehicle costs ─────────────────────────────────────────
const PLATES = ['34 ABC 123', '34 XYZ 456', '06 DEF 789', '35 GHI 012', '16 JKL 345'];
export async function listVehicleCosts(): Promise<VehicleCostRecord[]> {
  const cur = await loadList<VehicleCostRecord>(KEYS.vehicle);
  if (cur.length > 0) return cur;
  const period = new Date().toISOString().slice(0, 7);
  const seeded = PLATES.map((p, i) => {
    const km = rand(1500, 5000);
    const fuelL = Math.round(km * (0.08 + Math.random() * 0.05));
    const fuelCost = fuelL * 42;
    const maint = rand(500, 4000);
    const repair = Math.random() > 0.6 ? rand(800, 6000) : 0;
    return {
      id: uid('vc'), vehicleId: 'v' + i, plate: p, period,
      fuelLiters: fuelL, fuelCost, maintenanceCost: maint, repairCost: repair,
      km, cph: Math.round((fuelCost + maint + repair) / km * 100),
    };
  });
  await saveList(KEYS.vehicle, seeded);
  return seeded;
}
export async function resetVehicleCosts(): Promise<void> { await AsyncStorage.removeItem(KEYS.vehicle); }

// ── Stock consumption ─────────────────────────────────────
const MATERIALS = [
  { name: 'Bakır Boru Ø22', unit: 'm' }, { name: 'Yalıtım K-Flex 19mm', unit: 'm' },
  { name: 'R410A Gaz', unit: 'kg' }, { name: 'PVC Boru Ø32', unit: 'm' },
  { name: 'Elektrik Kablosu 3x2.5', unit: 'm' }, { name: 'Vana 1/2"', unit: 'adet' },
];
export async function listStockConsumption(): Promise<StockConsumptionRow[]> {
  const cur = await loadList<StockConsumptionRow>(KEYS.stock);
  if (cur.length > 0) return cur;
  const period = new Date().toISOString().slice(0, 7);
  const seeded = MATERIALS.map((m, i) => {
    const qty = rand(50, 800);
    return {
      id: uid('sc'), materialId: 'm' + i, materialName: m.name, unit: m.unit, period,
      quantity: qty, cost: qty * rand(8, 250), jobsCount: rand(5, 40),
    };
  });
  await saveList(KEYS.stock, seeded);
  return seeded;
}
export async function resetStockConsumption(): Promise<void> { await AsyncStorage.removeItem(KEYS.stock); }

// ── Quote outcomes ────────────────────────────────────────
export const WIN_REASON_LABEL: Record<NonNullable<QuoteOutcomeRow['reason']>, string> = {
  price: 'Fiyat', delivery: 'Teslimat', reference: 'Referans', tech: 'Teknik', service: 'Servis',
  price_high: 'Fiyat Yüksek', delivery_long: 'Teslimat Uzun', no_capacity: 'Kapasite',
  competitor: 'Rakip', no_budget: 'Bütçe', other: 'Diğer',
};

export async function listQuoteOutcomes(): Promise<QuoteOutcomeRow[]> {
  const cur = await loadList<QuoteOutcomeRow>(KEYS.quote);
  if (cur.length > 0) return cur;
  const winR: any[] = ['price', 'delivery', 'reference', 'tech', 'service'];
  const lossR: any[] = ['price_high', 'delivery_long', 'no_capacity', 'competitor', 'no_budget'];
  const seeded: QuoteOutcomeRow[] = [];
  for (let i = 0; i < 30; i++) {
    const won = Math.random() > 0.55;
    seeded.push({
      id: uid('qo'), quoteId: 'q' + i, customerId: 'c' + rand(1, 10),
      decidedAt: new Date(Date.now() - rand(0, 90) * 86400000).toISOString(),
      outcome: won ? 'won' : 'lost', amount: rand(10_000, 250_000),
      reason: pick(won ? winR : lossR),
    });
  }
  await saveList(KEYS.quote, seeded);
  return seeded;
}
export async function resetQuoteOutcomes(): Promise<void> { await AsyncStorage.removeItem(KEYS.quote); }

// ── Customer profitability ────────────────────────────────
const CUSTOMERS = ['ABC Ltd', 'XYZ A.Ş.', 'Mega Holding', 'Star Tekstil', 'Eko İnşaat', 'Mavi Lojistik', 'Yıldız Gıda'];
export async function listCustomerProfit(): Promise<CustomerProfitRow[]> {
  const cur = await loadList<CustomerProfitRow>(KEYS.customer);
  if (cur.length > 0) return cur;
  const seeded = CUSTOMERS.map((n, i) => {
    const rev = rand(80_000, 600_000);
    const cost = Math.round(rev * (0.55 + Math.random() * 0.3));
    const margin = rev - cost;
    return {
      customerId: 'c' + i, customerName: n,
      revenue: rev, cost, margin, marginPct: Math.round(margin / rev * 100),
      workOrderCount: rand(5, 40),
      lastEngagementAt: new Date(Date.now() - rand(1, 60) * 86400000).toISOString(),
    };
  });
  await saveList(KEYS.customer, seeded);
  return seeded;
}
export async function resetCustomerProfit(): Promise<void> { await AsyncStorage.removeItem(KEYS.customer); }

// ── SLA ───────────────────────────────────────────────────
export async function listSlaResults(): Promise<SlaResultRow[]> {
  const cur = await loadList<SlaResultRow>(KEYS.sla);
  if (cur.length > 0) return cur;
  const cats = ['Acil', 'Standart', 'Bakım', 'Kurulum'];
  const seeded: SlaResultRow[] = [];
  for (let i = 0; i < 24; i++) {
    const target = pick([4, 8, 24, 48]);
    const actual = Math.round(target * (0.6 + Math.random() * 0.8));
    seeded.push({
      id: uid('sla'), workOrderId: 'wo' + i, customerId: 'c' + rand(1, 8),
      targetHours: target, actualHours: actual, success: actual <= target,
      recordedAt: new Date(Date.now() - rand(0, 60) * 86400000).toISOString(),
      category: pick(cats),
    });
  }
  await saveList(KEYS.sla, seeded);
  return seeded;
}
export async function resetSlaResults(): Promise<void> { await AsyncStorage.removeItem(KEYS.sla); }

// ── Region heat ───────────────────────────────────────────
export async function listRegionHeat(): Promise<RegionHeatPoint[]> {
  const cur = await loadList<RegionHeatPoint>(KEYS.heat);
  if (cur.length > 0) return cur;
  const regions = [
    { n: 'Kadıköy', lat: 40.99, lng: 29.03 },
    { n: 'Ümraniye', lat: 41.02, lng: 29.12 },
    { n: 'Beşiktaş', lat: 41.05, lng: 29.00 },
    { n: 'Bakırköy', lat: 40.98, lng: 28.87 },
    { n: 'Pendik', lat: 40.88, lng: 29.25 },
    { n: 'Avcılar', lat: 40.99, lng: 28.72 },
    { n: 'Çankaya', lat: 39.91, lng: 32.86 },
    { n: 'Konak', lat: 38.41, lng: 27.13 },
  ];
  const seeded: RegionHeatPoint[] = regions.map((r, i) => ({
    id: 'rh' + i, regionName: r.n, lat: r.lat, lng: r.lng,
    intensity: Math.random(), jobCount: rand(5, 80),
  }));
  await saveList(KEYS.heat, seeded);
  return seeded;
}
export async function resetRegionHeat(): Promise<void> { await AsyncStorage.removeItem(KEYS.heat); }

// ── Budget vs Actual ──────────────────────────────────────
const BUDGET_CATS = ['Personel', 'Yakıt', 'Malzeme', 'Bakım', 'Ofis', 'Pazarlama', 'Lojistik'];
export async function listBudgetVsActual(): Promise<BudgetVsActualRow[]> {
  const cur = await loadList<BudgetVsActualRow>(KEYS.budget);
  if (cur.length > 0) return cur;
  const period = new Date().toISOString().slice(0, 7);
  const seeded = BUDGET_CATS.map((c, i) => {
    const planned = rand(40_000, 300_000);
    const actual = Math.round(planned * (0.7 + Math.random() * 0.6));
    const variance = actual - planned;
    return {
      id: uid('bva'), category: c, period, planned, actual, variance,
      variancePct: Math.round(variance / planned * 100),
    };
  });
  await saveList(KEYS.budget, seeded);
  return seeded;
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
