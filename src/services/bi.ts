// bi.ts — BI & Karar Destek (gerçek Supabase verisinden agregasyon)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
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
async function saveList<T>(k: string, list: T[]): Promise<void> { try { await AsyncStorage.setItem(k, JSON.stringify(list)); } catch { /* cache yazılamadı */ } }

function currentPeriod(): string { return new Date().toISOString().slice(0, 7); }
function periodStart(period: string): string { return period + '-01T00:00:00.000Z'; }
function periodEnd(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString();
}
function safeNum(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// KPI category dictionaries
export const KPI_CATEGORY_LABEL: Record<KpiCard['category'], string> = {
  finance: 'Finans', operations: 'Operasyon', sales: 'Satış', fleet: 'Filo', hr: 'İK', customer: 'Müşteri',
};
export const KPI_CATEGORY_COLOR: Record<KpiCard['category'], string> = {
  finance: '#22c55e', operations: '#0ea5e9', sales: '#a855f7', fleet: '#f59e0b', hr: '#ec4899', customer: '#06b6d4',
};

// KPI cards
export async function listKpiCards(): Promise<KpiCard[]> {
  if (!SUPABASE_CONFIGURED) return loadList<KpiCard>(KEYS.kpi);
  try {
    const period = currentPeriod();
    const pStart = periodStart(period);
    const pEnd = periodEnd(period);
    const [quotes, workOrders, payments, expenses, customers, employees] = await Promise.all([
      supabase.from('quotes').select('id,status,grand_total,date,created_at').gte('created_at', pStart).lt('created_at', pEnd),
      supabase.from('work_orders').select('id,status,started_at,finished_at,created_at').gte('created_at', pStart).lt('created_at', pEnd),
      supabase.from('payments').select('id,amount,status,received_at').gte('received_at', pStart).lt('received_at', pEnd),
      supabase.from('expenses').select('id,amount,date').gte('date', pStart.slice(0, 10)).lt('date', pEnd.slice(0, 10)),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('active', true),
    ]);
    const qRows = (quotes.data || []) as any[];
    const woRows = (workOrders.data || []) as any[];
    const payRows = (payments.data || []) as any[];
    const expRows = (expenses.data || []) as any[];
    const revenue = payRows.filter(p => p.status === 'received').reduce((a, b) => a + safeNum(b.amount), 0);
    const expense = expRows.reduce((a, b) => a + safeNum(b.amount), 0);
    const quoteTotal = qRows.reduce((a, b) => a + safeNum(b.grand_total), 0);
    const quoteWon = qRows.filter(q => q.status === 'Kabul Edildi' || q.status === 'Faturalandırıldı').length;
    const quoteConv = qRows.length ? Math.round(quoteWon / qRows.length * 100) : 0;
    const woCompleted = woRows.filter(w => w.status === 'Tamamlandı' || w.status === 'Faturalandırıldı').length;
    // Açık = terminal olmayan tüm durumlar (geçersiz status adlarına bağımlı kalmadan).
    const woOpen = woRows.filter(w => w.status !== 'Tamamlandı' && w.status !== 'Faturalandırıldı' && w.status !== 'İptal').length;
    const now = new Date().toISOString();
    const cards: KpiCard[] = [
      { id: 'kpi_revenue', label: 'Aylık Ciro', value: revenue, unit: '₺', direction: 'up_is_good', category: 'finance', updatedAt: now },
      { id: 'kpi_expense', label: 'Aylık Gider', value: expense, unit: '₺', direction: 'down_is_good', category: 'finance', updatedAt: now },
      { id: 'kpi_profit', label: 'Net Marj', value: revenue - expense, unit: '₺', direction: 'up_is_good', category: 'finance', updatedAt: now },
      { id: 'kpi_quote_total', label: 'Teklif Hacmi', value: quoteTotal, unit: '₺', direction: 'up_is_good', category: 'sales', updatedAt: now },
      { id: 'kpi_quote_conv', label: 'Teklif Dönüşüm', value: quoteConv, unit: '%', target: 60, direction: 'up_is_good', category: 'sales', updatedAt: now },
      { id: 'kpi_wo_done', label: 'Tamamlanan İş Emri', value: woCompleted, direction: 'up_is_good', category: 'operations', updatedAt: now },
      { id: 'kpi_wo_open', label: 'Açık İş Emri', value: woOpen, direction: 'down_is_good', category: 'operations', updatedAt: now },
      { id: 'kpi_customers', label: 'Toplam Müşteri', value: customers.count || 0, direction: 'up_is_good', category: 'customer', updatedAt: now },
      { id: 'kpi_employees', label: 'Aktif Personel', value: employees.count || 0, direction: 'up_is_good', category: 'hr', updatedAt: now },
    ];
    await saveList(KEYS.kpi, cards);
    return cards;
  } catch {
    return loadList<KpiCard>(KEYS.kpi);
  }
}
export async function resetKpis(): Promise<void> { await AsyncStorage.removeItem(KEYS.kpi); }

// Department KPIs (engineer alanı şu an departman temsilcisi)
export async function listDepartmentKpis(): Promise<DepartmentKpiSnapshot[]> {
  if (!SUPABASE_CONFIGURED) return loadList<DepartmentKpiSnapshot>(KEYS.dept);
  try {
    const period = currentPeriod();
    const pStart = periodStart(period);
    const pEnd = periodEnd(period);
    const [woRes, payRes, expRes] = await Promise.all([
      supabase.from('work_orders').select('id,status,engineer,started_at,finished_at').gte('created_at', pStart).lt('created_at', pEnd),
      supabase.from('payments').select('amount,status,work_order_id,received_at').gte('received_at', pStart).lt('received_at', pEnd),
      supabase.from('expenses').select('amount,work_order_id,date').gte('date', pStart.slice(0, 10)).lt('date', pEnd.slice(0, 10)),
    ]);
    const wos = (woRes.data || []) as any[];
    const pays = (payRes.data || []) as any[];
    const exps = (expRes.data || []) as any[];
    const byDept = new Map<string, any[]>();
    for (const w of wos) {
      const key = (w.engineer || 'Atanmamış').toString().trim() || 'Atanmamış';
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key)!.push(w);
    }
    const payByWo = new Map<string, number>();
    for (const p of pays) if (p.status === 'received' && p.work_order_id) payByWo.set(p.work_order_id, (payByWo.get(p.work_order_id) || 0) + safeNum(p.amount));
    const expByWo = new Map<string, number>();
    for (const e of exps) if (e.work_order_id) expByWo.set(e.work_order_id, (expByWo.get(e.work_order_id) || 0) + safeNum(e.amount));
    const now = new Date().toISOString();
    const rows: DepartmentKpiSnapshot[] = [];
    let i = 0;
    for (const [name, jobs] of byDept) {
      const revenue = jobs.reduce((a, j) => a + (payByWo.get(j.id) || 0), 0);
      const cost = jobs.reduce((a, j) => a + (expByWo.get(j.id) || 0), 0);
      const completed = jobs.filter(j => j.status === 'Tamamlandı' || j.status === 'Faturalandırıldı').length;
      const slaPct = jobs.length ? Math.round(completed / jobs.length * 100) : 0;
      rows.push({
        id: 'dept_' + (i++),
        departmentId: name,
        departmentName: name,
        period,
        revenue,
        cost,
        margin: revenue - cost,
        jobsCompleted: completed,
        slaSuccessPct: slaPct,
        updatedAt: now,
      });
    }
    rows.sort((a, b) => b.margin - a.margin);
    await saveList(KEYS.dept, rows);
    return rows;
  } catch {
    return loadList<DepartmentKpiSnapshot>(KEYS.dept);
  }
}
export async function resetDepartmentKpis(): Promise<void> { await AsyncStorage.removeItem(KEYS.dept); }

// Staff performance
export async function listStaffPerformance(): Promise<StaffPerformanceRecord[]> {
  if (!SUPABASE_CONFIGURED) return loadList<StaffPerformanceRecord>(KEYS.staff);
  try {
    const period = currentPeriod();
    const pStart = periodStart(period);
    const pEnd = periodEnd(period);
    const { data } = await supabase.from('work_orders')
      .select('id,status,engineer,started_at,finished_at,created_by')
      .gte('created_at', pStart).lt('created_at', pEnd);
    const wos = (data || []) as any[];
    const byUser = new Map<string, any[]>();
    for (const w of wos) {
      const key = (w.engineer || 'Atanmamış').toString();
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(w);
    }
    const rows: StaffPerformanceRecord[] = [];
    let i = 0;
    for (const [name, jobs] of byUser) {
      const completed = jobs.filter(j => j.status === 'Tamamlandı' || j.status === 'Faturalandırıldı');
      const hrs = completed
        .filter(j => j.started_at && j.finished_at)
        .map(j => (new Date(j.finished_at).getTime() - new Date(j.started_at).getTime()) / 3600000);
      const avgHours = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
      rows.push({
        id: 'sp_' + (i++),
        userId: name,
        fullName: name,
        period,
        jobsAssigned: jobs.length,
        jobsCompleted: completed.length,
        avgCompletionHours: Math.round(avgHours * 10) / 10,
        ratingAvg: 0,
        punctualityPct: jobs.length ? Math.round(completed.length / jobs.length * 100) : 0,
      });
    }
    rows.sort((a, b) => b.jobsCompleted - a.jobsCompleted);
    await saveList(KEYS.staff, rows);
    return rows;
  } catch {
    return loadList<StaffPerformanceRecord>(KEYS.staff);
  }
}
export async function resetStaffPerformance(): Promise<void> { await AsyncStorage.removeItem(KEYS.staff); }

// Vehicle costs
export async function listVehicleCosts(): Promise<VehicleCostRecord[]> {
  if (!SUPABASE_CONFIGURED) return loadList<VehicleCostRecord>(KEYS.vehicle);
  try {
    const period = currentPeriod();
    const pStart = periodStart(period);
    const pEnd = periodEnd(period);
    const [vehRes, logRes] = await Promise.all([
      supabase.from('vehicles').select('id,plate'),
      supabase.from('vehicle_logs').select('vehicle_id,kind,km,liters,total_cost,created_at').gte('created_at', pStart).lt('created_at', pEnd),
    ]);
    const vehicles = (vehRes.data || []) as any[];
    const logs = (logRes.data || []) as any[];
    const byVeh = new Map<string, any[]>();
    for (const l of logs) {
      if (!byVeh.has(l.vehicle_id)) byVeh.set(l.vehicle_id, []);
      byVeh.get(l.vehicle_id)!.push(l);
    }
    const rows: VehicleCostRecord[] = [];
    for (const v of vehicles) {
      const ls = byVeh.get(v.id) || [];
      if (!ls.length) continue;
      const fuel = ls.filter(l => l.kind === 'fuel');
      const maint = ls.filter(l => l.kind === 'maintenance');
      const repair = ls.filter(l => l.kind === 'inspection' || l.kind === 'insurance');
      const km = ls.filter(l => l.kind === 'km').reduce((a, l) => a + safeNum(l.km), 0);
      const fuelLiters = fuel.reduce((a, l) => a + safeNum(l.liters), 0);
      const fuelCost = fuel.reduce((a, l) => a + safeNum(l.total_cost), 0);
      const maintCost = maint.reduce((a, l) => a + safeNum(l.total_cost), 0);
      const repairCost = repair.reduce((a, l) => a + safeNum(l.total_cost), 0);
      rows.push({
        id: 'veh_' + v.id,
        vehicleId: v.id,
        plate: v.plate,
        period,
        fuelLiters,
        fuelCost,
        maintenanceCost: maintCost,
        repairCost,
        km,
        cph: km > 0 ? Math.round((fuelCost + maintCost + repairCost) / km * 100 * 100) / 100 : 0,
      });
    }
    rows.sort((a, b) => (b.fuelCost + b.maintenanceCost + b.repairCost) - (a.fuelCost + a.maintenanceCost + a.repairCost));
    await saveList(KEYS.vehicle, rows);
    return rows;
  } catch {
    return loadList<VehicleCostRecord>(KEYS.vehicle);
  }
}
export async function resetVehicleCosts(): Promise<void> { await AsyncStorage.removeItem(KEYS.vehicle); }

// Stock consumption
export async function listStockConsumption(): Promise<StockConsumptionRow[]> {
  if (!SUPABASE_CONFIGURED) return loadList<StockConsumptionRow>(KEYS.stock);
  try {
    const period = currentPeriod();
    const pStart = periodStart(period);
    const pEnd = periodEnd(period);
    const { data } = await supabase.from('stock_movements')
      .select('material_id,material_name,material_unit,qty,unit_price,kind,work_order_id,created_at')
      .in('kind', ['cikis', 'is-emri'])
      .gte('created_at', pStart).lt('created_at', pEnd);
    const moves = (data || []) as any[];
    const byMat = new Map<string, { name: string; unit: string; qty: number; cost: number; jobs: Set<string> }>();
    for (const m of moves) {
      const key = m.material_id;
      if (!byMat.has(key)) byMat.set(key, { name: m.material_name, unit: m.material_unit, qty: 0, cost: 0, jobs: new Set() });
      const slot = byMat.get(key)!;
      const q = safeNum(m.qty);
      slot.qty += q;
      slot.cost += q * safeNum(m.unit_price);
      if (m.work_order_id) slot.jobs.add(m.work_order_id);
    }
    const rows: StockConsumptionRow[] = [];
    for (const [matId, s] of byMat) {
      rows.push({
        id: 'stk_' + matId,
        materialId: matId,
        materialName: s.name,
        unit: s.unit,
        period,
        quantity: Math.round(s.qty * 100) / 100,
        cost: Math.round(s.cost * 100) / 100,
        jobsCount: s.jobs.size,
      });
    }
    rows.sort((a, b) => b.cost - a.cost);
    await saveList(KEYS.stock, rows);
    return rows;
  } catch {
    return loadList<StockConsumptionRow>(KEYS.stock);
  }
}
export async function resetStockConsumption(): Promise<void> { await AsyncStorage.removeItem(KEYS.stock); }

// Quote outcomes
export const WIN_REASON_LABEL: Record<NonNullable<QuoteOutcomeRow['reason']>, string> = {
  price: 'Fiyat', delivery: 'Teslimat', reference: 'Referans', tech: 'Teknik', service: 'Servis',
  price_high: 'Fiyat Yüksek', delivery_long: 'Teslimat Uzun', no_capacity: 'Kapasite',
  competitor: 'Rakip', no_budget: 'Bütçe', other: 'Diğer',
};

export async function listQuoteOutcomes(): Promise<QuoteOutcomeRow[]> {
  if (!SUPABASE_CONFIGURED) return loadList<QuoteOutcomeRow>(KEYS.quote);
  try {
    const { data } = await supabase.from('quotes')
      .select('id,customer_id,status,grand_total,updated_at,created_at')
      .in('status', ['Kabul Edildi', 'Reddedildi', 'Faturalandırıldı'])
      .order('updated_at', { ascending: false })
      .limit(500);
    const rows: QuoteOutcomeRow[] = ((data || []) as any[]).map((q: any) => ({
      id: 'qo_' + q.id,
      quoteId: q.id,
      customerId: q.customer_id || undefined,
      decidedAt: q.updated_at || q.created_at,
      outcome: (q.status === 'Reddedildi' ? 'lost' : 'won') as 'won' | 'lost',
      amount: safeNum(q.grand_total),
    }));
    await saveList(KEYS.quote, rows);
    return rows;
  } catch {
    return loadList<QuoteOutcomeRow>(KEYS.quote);
  }
}
export async function resetQuoteOutcomes(): Promise<void> { await AsyncStorage.removeItem(KEYS.quote); }

// Customer profitability
export async function listCustomerProfit(): Promise<CustomerProfitRow[]> {
  if (!SUPABASE_CONFIGURED) return loadList<CustomerProfitRow>(KEYS.customer);
  try {
    const [custRes, payRes, expRes, woRes] = await Promise.all([
      supabase.from('customers').select('id,short_name,title'),
      supabase.from('payments').select('customer_id,amount,status'),
      supabase.from('expenses').select('amount,work_order_id'),
      supabase.from('work_orders').select('id,customer_id,finished_at,created_at'),
    ]);
    const customers = (custRes.data || []) as any[];
    const pays = (payRes.data || []) as any[];
    const exps = (expRes.data || []) as any[];
    const wos = (woRes.data || []) as any[];
    const woToCust = new Map<string, string>();
    const woCountByCust = new Map<string, number>();
    const lastEngageByCust = new Map<string, string>();
    for (const w of wos) {
      if (!w.customer_id) continue;
      woToCust.set(w.id, w.customer_id);
      woCountByCust.set(w.customer_id, (woCountByCust.get(w.customer_id) || 0) + 1);
      const t = w.finished_at || w.created_at;
      if (t && (!lastEngageByCust.get(w.customer_id) || t > lastEngageByCust.get(w.customer_id)!)) lastEngageByCust.set(w.customer_id, t);
    }
    const revByCust = new Map<string, number>();
    for (const p of pays) if (p.status === 'received' && p.customer_id) revByCust.set(p.customer_id, (revByCust.get(p.customer_id) || 0) + safeNum(p.amount));
    const costByCust = new Map<string, number>();
    for (const e of exps) {
      const cid = e.work_order_id ? woToCust.get(e.work_order_id) : undefined;
      if (cid) costByCust.set(cid, (costByCust.get(cid) || 0) + safeNum(e.amount));
    }
    const rows: CustomerProfitRow[] = customers.map(c => {
      const revenue = revByCust.get(c.id) || 0;
      const cost = costByCust.get(c.id) || 0;
      const margin = revenue - cost;
      return {
        customerId: c.id,
        customerName: c.short_name || c.title,
        revenue,
        cost,
        margin,
        marginPct: revenue > 0 ? Math.round(margin / revenue * 1000) / 10 : 0,
        workOrderCount: woCountByCust.get(c.id) || 0,
        lastEngagementAt: lastEngageByCust.get(c.id),
      };
    }).filter(r => r.revenue > 0 || r.workOrderCount > 0);
    rows.sort((a, b) => b.margin - a.margin);
    await saveList(KEYS.customer, rows);
    return rows;
  } catch {
    return loadList<CustomerProfitRow>(KEYS.customer);
  }
}
export async function resetCustomerProfit(): Promise<void> { await AsyncStorage.removeItem(KEYS.customer); }

// SLA
const SLA_DEFAULT_HOURS = 48;
export async function listSlaResults(): Promise<SlaResultRow[]> {
  if (!SUPABASE_CONFIGURED) return loadList<SlaResultRow>(KEYS.sla);
  try {
    const { data } = await supabase.from('work_orders')
      .select('id,customer_id,started_at,finished_at,status')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(500);
    const rows: SlaResultRow[] = ((data || []) as any[])
      .filter(w => w.started_at && w.finished_at)
      .map((w: any) => {
        const hrs = (new Date(w.finished_at).getTime() - new Date(w.started_at).getTime()) / 3600000;
        return {
          id: 'sla_' + w.id,
          workOrderId: w.id,
          customerId: w.customer_id || undefined,
          targetHours: SLA_DEFAULT_HOURS,
          actualHours: Math.round(hrs * 10) / 10,
          success: hrs <= SLA_DEFAULT_HOURS,
          recordedAt: w.finished_at,
        };
      });
    await saveList(KEYS.sla, rows);
    return rows;
  } catch {
    return loadList<SlaResultRow>(KEYS.sla);
  }
}
export async function resetSlaResults(): Promise<void> { await AsyncStorage.removeItem(KEYS.sla); }

// Region heat (müşteri şehirleri + work order başlangıç koordinatları)
export async function listRegionHeat(): Promise<RegionHeatPoint[]> {
  if (!SUPABASE_CONFIGURED) return loadList<RegionHeatPoint>(KEYS.heat);
  try {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const [woRes, custRes] = await Promise.all([
      supabase.from('work_orders').select('id,customer_id,start_lat,start_lng,created_at').gte('created_at', since),
      supabase.from('customers').select('id,city'),
    ]);
    const wos = (woRes.data || []) as any[];
    const custs = (custRes.data || []) as any[];
    const cityByCust = new Map<string, string>();
    for (const c of custs) if (c.city) cityByCust.set(c.id, c.city);
    const byRegion = new Map<string, { lat: number; lng: number; n: number; count: number }>();
    for (const w of wos) {
      const region = (w.customer_id && cityByCust.get(w.customer_id)) || 'Bilinmiyor';
      if (!byRegion.has(region)) byRegion.set(region, { lat: 0, lng: 0, n: 0, count: 0 });
      const r = byRegion.get(region)!;
      r.count += 1;
      if (typeof w.start_lat === 'number' && typeof w.start_lng === 'number') {
        r.lat += safeNum(w.start_lat); r.lng += safeNum(w.start_lng); r.n += 1;
      }
    }
    const maxCount = Math.max(1, ...Array.from(byRegion.values()).map(r => r.count));
    const rows: RegionHeatPoint[] = [];
    let i = 0;
    for (const [name, r] of byRegion) {
      rows.push({
        id: 'rg_' + (i++),
        regionName: name,
        lat: r.n > 0 ? r.lat / r.n : 0,
        lng: r.n > 0 ? r.lng / r.n : 0,
        intensity: r.count / maxCount,
        jobCount: r.count,
      });
    }
    rows.sort((a, b) => b.jobCount - a.jobCount);
    await saveList(KEYS.heat, rows);
    return rows;
  } catch {
    return loadList<RegionHeatPoint>(KEYS.heat);
  }
}
export async function resetRegionHeat(): Promise<void> { await AsyncStorage.removeItem(KEYS.heat); }

// Budget vs Actual (gider kategorileri; plan = son 3 ay ort.)
export async function listBudgetVsActual(): Promise<BudgetVsActualRow[]> {
  if (!SUPABASE_CONFIGURED) return loadList<BudgetVsActualRow>(KEYS.budget);
  try {
    const period = currentPeriod();
    const pStart = periodStart(period).slice(0, 10);
    const pEnd = periodEnd(period).slice(0, 10);
    const { data } = await supabase.from('expenses')
      .select('category,amount,date').gte('date', pStart).lt('date', pEnd);
    const byCat = new Map<string, number>();
    for (const e of (data || [])) byCat.set(e.category || 'Diğer', (byCat.get(e.category || 'Diğer') || 0) + safeNum(e.amount));
    const prevStart = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const { data: prev } = await supabase.from('expenses')
      .select('category,amount,date').gte('date', prevStart).lt('date', pStart);
    const prevByCat = new Map<string, number>();
    for (const e of (prev || [])) {
      const k = e.category || 'Diğer';
      prevByCat.set(k, (prevByCat.get(k) || 0) + safeNum(e.amount));
    }
    const rows: BudgetVsActualRow[] = [];
    let i = 0;
    for (const [cat, actual] of byCat) {
      const planned = Math.round(((prevByCat.get(cat) || actual) / 3) * 100) / 100;
      const variance = actual - planned;
      rows.push({
        id: 'bvar_' + (i++),
        category: cat,
        period,
        planned,
        actual,
        variance,
        variancePct: planned > 0 ? Math.round(variance / planned * 1000) / 10 : 0,
      });
    }
    rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    await saveList(KEYS.budget, rows);
    return rows;
  } catch {
    return loadList<BudgetVsActualRow>(KEYS.budget);
  }
}
export async function resetBudgetVsActual(): Promise<void> { await AsyncStorage.removeItem(KEYS.budget); }

// Executive summary
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
    top ? `En kârlı 3 müşteri: ${top}` : '',
  ].filter(Boolean);
  const warnings = [
    worstDept && worstDept.margin < 0 ? `${worstDept.departmentName} departmanı zararda` : '',
    slaSuccess < 85 && slas.length > 0 ? `SLA başarısı kritik düzeyde (%${slaSuccess})` : '',
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

// CSV pivot export
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
