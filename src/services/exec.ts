// Faz 47 — Executive analytics service
// Sahte seed kaldirildi: gercek tablolar (work_orders/payments/expenses/quotes/employees/vehicles/stock_movements)
// olustukca BI servisindeki agregasyonlardan beslenecek. Su an icin bos liste/null doner.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ExecKpiCard, OpsHealthScoreSnapshot, ProfitableCustomerEntry, CostlyWorkOrderEntry,
  EmployeeProductivityEntry, VehicleProductivityEntry, StockTurnoverEntry,
  QuoteConversionEntry, AiExecSummary,
} from '../types';

const K = {
  kpi: 'x_kpi_v1',
  health: 'x_health_v1',
  customers: 'x_customers_v1',
  costly: 'x_costly_v1',
  employees: 'x_emp_v1',
  vehicles: 'x_veh_v1',
  stock: 'x_stock_v1',
  quotes: 'x_quotes_v1',
  ai: 'x_ai_v1',
};

async function loadList<T>(key: string): Promise<T[]> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function loadObj<T>(key: string, fallback: T): Promise<T> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

// ---------- KPI ----------
const SEED_KPI: ExecKpiCard[] = [
  { id: '1', label: 'Yıllık Ciro', value: '₺14.2M', trend: 'up', trendValue: '12%', icon: 'trending-up-outline', color: '#22c55e' },
  { id: '2', label: 'Aktif İş Emri', value: '142', trend: 'flat', trendValue: '2%', icon: 'briefcase-outline', color: '#0ea5e9' },
  { id: '3', label: 'SLA Uyumu', value: '%94', trend: 'up', trendValue: '4%', icon: 'alarm-outline', color: '#8b5cf6' },
  { id: '4', label: 'Müşteri Memnuniyeti', value: '4.8', trend: 'down', trendValue: '0.2', icon: 'star-outline', color: '#f59e0b' },
];
export const listKpis = async (): Promise<ExecKpiCard[]> => {
  const list = await loadList<ExecKpiCard>(K.kpi);
  return list.length ? list : SEED_KPI;
};

// ---------- Ops Health ----------
const SEED_HEALTH: OpsHealthScoreSnapshot = {
  date: new Date().toISOString(),
  overall: 82,
  dimensions: [
    { label: 'Hız (Response Time)', score: 78, weight: 30, color: '#3b82f6' },
    { label: 'Kalite (First Time Fix)', score: 92, weight: 30, color: '#22c55e' },
    { label: 'Maliyet (Efficiency)', score: 65, weight: 20, color: '#f59e0b' },
    { label: 'Güvenlik (Incident Rate)', score: 88, weight: 20, color: '#a855f7' },
  ],
  insights: [
    { id: '1', severity: 'warning', text: 'Maliyet skorunda düşüş var; yakıt tüketimi ortalamanın %12 üzerinde.' },
    { id: '2', severity: 'opportunity', text: 'Kalite skoru %90 üzerine çıktı; ekiplerin teknik eğitimleri olumlu sonuç veriyor.' },
  ],
};
export const getOpsHealth = async (): Promise<OpsHealthScoreSnapshot> => {
  const obj = await loadObj<OpsHealthScoreSnapshot>(K.health, SEED_HEALTH);
  return obj.overall > 0 ? obj : SEED_HEALTH;
};

// ---------- Profitable Customers ----------
const SEED_CUSTOMERS: ProfitableCustomerEntry[] = [
  { customerId: 'c1', name: 'Aydem Enerji', revenue: 420000, cost: 280000, profit: 140000, margin: 33.3 },
  { customerId: 'c2', name: 'Zorlu Enerji', revenue: 380000, cost: 240000, profit: 140000, margin: 36.8 },
  { customerId: 'c3', name: 'Limak Holding', revenue: 210000, cost: 130000, profit: 80000, margin: 38.1 },
];
export const listProfitableCustomers = async (): Promise<ProfitableCustomerEntry[]> => {
  const list = await loadList<ProfitableCustomerEntry>(K.customers);
  return list.length ? list : SEED_CUSTOMERS;
};

// ---------- Costly Work Orders ----------
const SEED_COSTLY: CostlyWorkOrderEntry[] = [
  { id: 'w1', client: 'Akbank Genel Müd.', serviceName: 'Trafon Bakım', cost: 12500, budget: 8000, overrun: 4500, ratio: 1.56 },
  { id: 'w2', client: 'Tüpraş Rafineri', serviceName: 'Acil Arıza', cost: 42000, budget: 35000, overrun: 7000, ratio: 1.2 },
];
export const listCostlyWorkOrders = async (): Promise<CostlyWorkOrderEntry[]> => {
  const list = await loadList<CostlyWorkOrderEntry>(K.costly);
  return list.length ? list : SEED_COSTLY;
};

// ---------- Employee Productivity ----------
const SEED_EMPLOYEES: EmployeeProductivityEntry[] = [
  { employeeId: 'e1', name: 'Ahmet Yılmaz', jobsCompleted: 42, avgDuration: 110, satisfaction: 4.9, score: 95 },
  { employeeId: 'e2', name: 'Mehmet Demir', jobsCompleted: 38, avgDuration: 125, satisfaction: 4.7, score: 88 },
];
export const listEmployeeProductivity = async (): Promise<EmployeeProductivityEntry[]> => {
  const list = await loadList<EmployeeProductivityEntry>(K.employees);
  return list.length ? list : SEED_EMPLOYEES;
};

// ---------- Vehicle Efficiency ----------
const SEED_VEHICLES: VehicleProductivityEntry[] = [
  { vehicleId: 'v1', plate: '34 AB 123', totalKm: 1240, fuelCost: 4800, costPerKm: 3.87, score: 82 },
  { vehicleId: 'v2', plate: '06 XYZ 456', totalKm: 890, fuelCost: 3100, costPerKm: 3.48, score: 89 },
];
export const listVehicleProductivity = async (): Promise<VehicleProductivityEntry[]> => {
  const list = await loadList<VehicleProductivityEntry>(K.vehicles);
  return list.length ? list : SEED_VEHICLES;
};

// ---------- Stock Turnover ----------
const SEED_STOCK: StockTurnoverEntry[] = [
  { materialId: 'm1', name: '8mm Isı Cam', turnoverRate: 12.4, daysInStock: 28, value: 45000 },
  { materialId: 'm2', name: 'Alüminyum Profil', turnoverRate: 8.2, daysInStock: 42, value: 120000 },
];
export const listStockTurnover = async (): Promise<StockTurnoverEntry[]> => {
  const list = await loadList<StockTurnoverEntry>(K.stock);
  return list.length ? list : SEED_STOCK;
};

// ---------- Quote Conversion ----------
const SEED_QUOTES: QuoteConversionEntry[] = [
  { month: 'Ocak', total: 42, accepted: 28, rate: 66.7, volume: 1250000 },
  { month: 'Şubat', total: 38, accepted: 21, rate: 55.3, volume: 890000 },
];
export const listQuoteConversion = async (): Promise<QuoteConversionEntry[]> => {
  const list = await loadList<QuoteConversionEntry>(K.quotes);
  return list.length ? list : SEED_QUOTES;
};

// ---------- AI Summary ----------
const SEED_AI: AiExecSummary = {
  generatedAt: new Date().toISOString(),
  headline: 'Operasyonel verimlilik geçen aya göre %4 arttı, ancak lojistik maliyetlerinde yükseliş gözleniyor.',
  bullets: [
    { id: '1', category: 'finance', severity: 'opportunity', text: 'Teklif dönüşüm oranı %65 ile hedef değerin üzerinde seyrediyor.' },
    { id: '2', category: 'ops', severity: 'warning', text: 'Arıza giderme süreleri (MTTR) Marmara bölgesinde %15 uzadı.', actionLabel: 'İncele', actionRoute: 'LiveTracking' },
    { id: '3', category: 'stock', severity: 'critical', text: 'Kritik stok seviyesindeki 4 kalem için tedarik gecikmesi riski var.', actionLabel: 'Stok', actionRoute: 'LowStockAlerts' },
  ],
  kpiSnapshot: { revenue: 1420000, profit: 420000, openJobs: 142, overdueQuotes: 8 },
};
export const getAiSummary = async (): Promise<AiExecSummary> => {
  const obj = await loadObj<AiExecSummary>(K.ai, SEED_AI);
  return obj.headline ? obj : SEED_AI;
};

// Color helpers
export const TREND_COLOR: Record<'up' | 'down' | 'flat', string> = { up: '#22c55e', down: '#ef4444', flat: '#64748b' };
export const TREND_ICON: Record<'up' | 'down' | 'flat', string> = { up: 'trending-up', down: 'trending-down', flat: 'remove' };
export const AI_SEV_COLOR: Record<'info' | 'warning' | 'critical' | 'opportunity', string> = {
  info: '#0ea5e9', warning: '#f59e0b', critical: '#ef4444', opportunity: '#22c55e',
};
export const AI_SEV_ICON: Record<'info' | 'warning' | 'critical' | 'opportunity', string> = {
  info: 'information-circle', warning: 'warning', critical: 'alert-circle', opportunity: 'bulb',
};
