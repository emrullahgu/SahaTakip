// Faz 47 — Executive analytics service
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

const today = () => new Date().toISOString();

// ---------- KPI ----------
const SEED_KPI: ExecKpiCard[] = [
  { key: 'rev', label: 'Aylık Ciro', value: 487500, unit: '₺', deltaPct: 12.4, trend: 'up', color: '#22c55e' },
  { key: 'profit', label: 'Aylık Kâr', value: 134200, unit: '₺', deltaPct: 8.1, trend: 'up', color: '#0ea5e9' },
  { key: 'margin', label: 'Kâr Marjı', value: 27.5, unit: '%', deltaPct: -1.8, trend: 'down', color: '#f59e0b' },
  { key: 'cost', label: 'Operasyon Maliyeti', value: 353300, unit: '₺', deltaPct: 5.2, trend: 'up', color: '#ef4444' },
  { key: 'jobs', label: 'Tamamlanan İş', value: 142, unit: 'adet', deltaPct: 18.3, trend: 'up', color: '#8b5cf6' },
  { key: 'avg', label: 'Ort. İş Süresi', value: 4.6, unit: 'saat', deltaPct: -7.0, trend: 'down', color: '#06b6d4' },
];

export const listKpis = async (): Promise<ExecKpiCard[]> => {
  const raw = await AsyncStorage.getItem(K.kpi);
  if (!raw) { await AsyncStorage.setItem(K.kpi, JSON.stringify(SEED_KPI)); return SEED_KPI; }
  try { return JSON.parse(raw); } catch { return SEED_KPI; }
};

// ---------- Ops Health ----------
const SEED_HEALTH: OpsHealthScoreSnapshot = {
  date: today(),
  overall: 78,
  dimensions: [
    { name: 'Operasyon', score: 82, weight: 25, trend: 'up' },
    { name: 'Finansal', score: 74, weight: 25, trend: 'flat' },
    { name: 'Personel', score: 80, weight: 20, trend: 'up' },
    { name: 'Kalite & İSG', score: 88, weight: 15, trend: 'up' },
    { name: 'Müşteri Memnuniyeti', score: 65, weight: 15, trend: 'down' },
  ],
  insights: [
    '3 gecikmiş iş emri kritik müşteride',
    'Bu hafta personel verimliliği %12 arttı',
    'Müşteri memnuniyeti son 30 günde 7 puan düştü',
    '2 ekipman bakımı bu hafta yaklaşıyor',
  ],
};

export const getOpsHealth = async (): Promise<OpsHealthScoreSnapshot> => {
  const raw = await AsyncStorage.getItem(K.health);
  if (!raw) { await AsyncStorage.setItem(K.health, JSON.stringify(SEED_HEALTH)); return SEED_HEALTH; }
  try { return JSON.parse(raw); } catch { return SEED_HEALTH; }
};

// ---------- Profitable Customers ----------
const SEED_CUST: ProfitableCustomerEntry[] = [
  { customerId: 'c1', customerName: 'Ankara OSB Tekstil', revenue: 145000, cost: 92000, profit: 53000, profitMargin: 36.6, jobsCount: 18 },
  { customerId: 'c2', customerName: 'Konya GES Sahası', revenue: 98000, cost: 71000, profit: 27000, profitMargin: 27.6, jobsCount: 12 },
  { customerId: 'c3', customerName: 'İzmir Lojistik Deposu', revenue: 87500, cost: 58000, profit: 29500, profitMargin: 33.7, jobsCount: 15 },
  { customerId: 'c4', customerName: 'Eskişehir Cam Sanayi', revenue: 76200, cost: 62000, profit: 14200, profitMargin: 18.6, jobsCount: 9 },
  { customerId: 'c5', customerName: 'Bursa Otomotiv', revenue: 56800, cost: 51000, profit: 5800, profitMargin: 10.2, jobsCount: 7 },
  { customerId: 'c6', customerName: 'Adana Mermer Fabrikası', revenue: 42000, cost: 38500, profit: 3500, profitMargin: 8.3, jobsCount: 5 },
];
export const listProfitableCustomers = async (): Promise<ProfitableCustomerEntry[]> => {
  const raw = await AsyncStorage.getItem(K.customers);
  if (!raw) { await AsyncStorage.setItem(K.customers, JSON.stringify(SEED_CUST)); return SEED_CUST; }
  try { return JSON.parse(raw); } catch { return SEED_CUST; }
};

// ---------- Costly Work Orders ----------
const SEED_COSTLY: CostlyWorkOrderEntry[] = [
  { workOrderId: 'wo1', title: 'Trafo bakım + revizyon', customerName: 'Ankara OSB Tekstil', totalCost: 28500, laborCost: 14200, materialCost: 14300, overrunPct: 22, durationHours: 38 },
  { workOrderId: 'wo2', title: 'GES inverter değişimi', customerName: 'Konya GES Sahası', totalCost: 18200, laborCost: 6500, materialCost: 11700, overrunPct: 15, durationHours: 16 },
  { workOrderId: 'wo3', title: 'Jeneratör acil servis', customerName: 'Bursa Otomotiv', totalCost: 16800, laborCost: 8200, materialCost: 8600, overrunPct: 45, durationHours: 24 },
  { workOrderId: 'wo4', title: 'Termal kamera taraması + onarım', customerName: 'Eskişehir Cam Sanayi', totalCost: 12400, laborCost: 4400, materialCost: 8000, overrunPct: 8, durationHours: 12 },
  { workOrderId: 'wo5', title: 'Pano değişim + test', customerName: 'İzmir Lojistik Deposu', totalCost: 11800, laborCost: 5800, materialCost: 6000, overrunPct: -3, durationHours: 18 },
];
export const listCostlyWorkOrders = async (): Promise<CostlyWorkOrderEntry[]> => {
  const raw = await AsyncStorage.getItem(K.costly);
  if (!raw) { await AsyncStorage.setItem(K.costly, JSON.stringify(SEED_COSTLY)); return SEED_COSTLY; }
  try { return JSON.parse(raw); } catch { return SEED_COSTLY; }
};

// ---------- Employee Productivity ----------
const SEED_EMP: EmployeeProductivityEntry[] = [
  { employeeId: 'e1', employeeName: 'Ali Yılmaz', jobsCompleted: 28, hoursWorked: 168, revenueGenerated: 84500, efficiencyScore: 92, ranking: 1 },
  { employeeId: 'e2', employeeName: 'Ayşe Kaya', jobsCompleted: 24, hoursWorked: 160, revenueGenerated: 71200, efficiencyScore: 88, ranking: 2 },
  { employeeId: 'e3', employeeName: 'Hakan Çelik', jobsCompleted: 22, hoursWorked: 172, revenueGenerated: 65800, efficiencyScore: 81, ranking: 3 },
  { employeeId: 'e4', employeeName: 'Mehmet Demir', jobsCompleted: 19, hoursWorked: 164, revenueGenerated: 58400, efficiencyScore: 76, ranking: 4 },
  { employeeId: 'e5', employeeName: 'Selin Acar', jobsCompleted: 17, hoursWorked: 158, revenueGenerated: 51900, efficiencyScore: 73, ranking: 5 },
];
export const listEmployeeProductivity = async (): Promise<EmployeeProductivityEntry[]> => {
  const raw = await AsyncStorage.getItem(K.employees);
  if (!raw) { await AsyncStorage.setItem(K.employees, JSON.stringify(SEED_EMP)); return SEED_EMP; }
  try { return JSON.parse(raw); } catch { return SEED_EMP; }
};

// ---------- Vehicle Efficiency ----------
const SEED_VEH: VehicleProductivityEntry[] = [
  { vehicleId: 'v1', plate: '06 ABC 123', brand: 'Ford Transit', kmTotal: 4280, fuelCost: 18500, maintenanceCost: 4200, jobsServed: 42, costPerJob: 540, ranking: 1 },
  { vehicleId: 'v2', plate: '06 DEF 456', brand: 'Renault Trafic', kmTotal: 3950, fuelCost: 17200, maintenanceCost: 5800, jobsServed: 38, costPerJob: 605, ranking: 2 },
  { vehicleId: 'v3', plate: '06 GHI 789', brand: 'Fiat Doblo', kmTotal: 5120, fuelCost: 21800, maintenanceCost: 6900, jobsServed: 35, costPerJob: 820, ranking: 3 },
  { vehicleId: 'v4', plate: '06 JKL 012', brand: 'VW Caddy', kmTotal: 2980, fuelCost: 13400, maintenanceCost: 8200, jobsServed: 22, costPerJob: 982, ranking: 4 },
];
export const listVehicleProductivity = async (): Promise<VehicleProductivityEntry[]> => {
  const raw = await AsyncStorage.getItem(K.vehicles);
  if (!raw) { await AsyncStorage.setItem(K.vehicles, JSON.stringify(SEED_VEH)); return SEED_VEH; }
  try { return JSON.parse(raw); } catch { return SEED_VEH; }
};

// ---------- Stock Turnover ----------
const SEED_STOCK: StockTurnoverEntry[] = [
  { productId: 's1', productName: 'XLPE Kablo 4x16', category: 'Kablo', stockOnHand: 850, turnoverPerYear: 12.4, daysOnHand: 29, trend: 'up' },
  { productId: 's2', productName: 'Termik Manyetik Şalter 63A', category: 'Şalter', stockOnHand: 24, turnoverPerYear: 18.2, daysOnHand: 20, trend: 'up' },
  { productId: 's3', productName: 'Kontaktör 25A', category: 'Kontaktör', stockOnHand: 36, turnoverPerYear: 9.8, daysOnHand: 37, trend: 'flat' },
  { productId: 's4', productName: 'Pano Sigorta Bloğu', category: 'Pano', stockOnHand: 58, turnoverPerYear: 6.2, daysOnHand: 59, trend: 'down' },
  { productId: 's5', productName: 'Trafo Yağı 200L', category: 'Sarf', stockOnHand: 6, turnoverPerYear: 14.0, daysOnHand: 26, trend: 'up' },
  { productId: 's6', productName: 'GES Konektörü MC4', category: 'GES', stockOnHand: 1200, turnoverPerYear: 22.5, daysOnHand: 16, trend: 'up' },
];
export const listStockTurnover = async (): Promise<StockTurnoverEntry[]> => {
  const raw = await AsyncStorage.getItem(K.stock);
  if (!raw) { await AsyncStorage.setItem(K.stock, JSON.stringify(SEED_STOCK)); return SEED_STOCK; }
  try { return JSON.parse(raw); } catch { return SEED_STOCK; }
};

// ---------- Quote Conversion ----------
const SEED_QUOTES: QuoteConversionEntry[] = [
  { period: 'Bu Ay', sent: 38, accepted: 22, rejected: 8, pending: 8, conversionPct: 57.9, avgClosureDays: 4.2 },
  { period: 'Geçen Ay', sent: 42, accepted: 24, rejected: 12, pending: 6, conversionPct: 57.1, avgClosureDays: 5.1 },
  { period: '2 Ay Önce', sent: 35, accepted: 18, rejected: 11, pending: 6, conversionPct: 51.4, avgClosureDays: 6.0 },
  { period: '3 Ay Önce', sent: 40, accepted: 25, rejected: 10, pending: 5, conversionPct: 62.5, avgClosureDays: 3.8 },
  { period: '4 Ay Önce', sent: 33, accepted: 19, rejected: 9, pending: 5, conversionPct: 57.6, avgClosureDays: 4.5 },
  { period: '5 Ay Önce', sent: 30, accepted: 16, rejected: 9, pending: 5, conversionPct: 53.3, avgClosureDays: 5.2 },
];
export const listQuoteConversion = async (): Promise<QuoteConversionEntry[]> => {
  const raw = await AsyncStorage.getItem(K.quotes);
  if (!raw) { await AsyncStorage.setItem(K.quotes, JSON.stringify(SEED_QUOTES)); return SEED_QUOTES; }
  try { return JSON.parse(raw); } catch { return SEED_QUOTES; }
};

// ---------- AI Summary ----------
const SEED_AI: AiExecSummary = {
  generatedAt: today(),
  headline: 'Bu hafta operasyon güçlü, müşteri memnuniyetine odaklanın.',
  bullets: [
    { id: 'b1', severity: 'critical', category: 'Müşteri', text: 'Bursa Otomotiv son 30 günde 3 şikayet bildirdi, kâr marjı %10\'a düştü.', actionLabel: 'Müşteriyi aç', actionRoute: 'ProfitableCustomers' },
    { id: 'b2', severity: 'warning', category: 'Operasyon', text: '3 iş emri 2 günden fazla gecikmiş durumda — Bursa, Adana ve Konya sahaları.', actionLabel: 'İş emirleri', actionRoute: 'WorkOrders' },
    { id: 'b3', severity: 'opportunity', category: 'Satış', text: 'Teklif dönüşüm oranı %58, geçen ay ile aynı. Hızlı teklif takip ile %65\'e çıkarılabilir.', actionLabel: 'Teklif Analizi', actionRoute: 'QuoteConversion' },
    { id: 'b4', severity: 'info', category: 'Bakım', text: '2 ekipman bakımı bu hafta vadesinde, planlanmış durumda.', actionLabel: 'Yaklaşan', actionRoute: 'MaintenanceAlerts' },
    { id: 'b5', severity: 'opportunity', category: 'Personel', text: 'Ali Yılmaz bu ay 28 iş tamamladı, ortalamanın %35 üstünde. Performans primi önerilir.', actionLabel: 'Sıralama', actionRoute: 'EmployeeRanking' },
    { id: 'b6', severity: 'warning', category: 'Stok', text: 'Trafo yağı stoku 6 birime düştü, sipariş edilmeli.', actionLabel: 'Stok devri', actionRoute: 'StockTurnover' },
  ],
  kpiSnapshot: { revenue: 487500, profit: 134200, openJobs: 18, overdueQuotes: 3 },
};
export const getAiSummary = async (): Promise<AiExecSummary> => {
  const raw = await AsyncStorage.getItem(K.ai);
  if (!raw) { await AsyncStorage.setItem(K.ai, JSON.stringify(SEED_AI)); return SEED_AI; }
  try { return JSON.parse(raw); } catch { return SEED_AI; }
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
