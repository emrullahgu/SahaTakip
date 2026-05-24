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
export const listKpis = async (): Promise<ExecKpiCard[]> => loadList<ExecKpiCard>(K.kpi);

// ---------- Ops Health ----------
const DEFAULT_HEALTH: OpsHealthScoreSnapshot = {
  date: new Date().toISOString(),
  overall: 0,
  dimensions: [],
  insights: [],
};
export const getOpsHealth = async (): Promise<OpsHealthScoreSnapshot> =>
  loadObj<OpsHealthScoreSnapshot>(K.health, DEFAULT_HEALTH);

// ---------- Profitable Customers ----------
export const listProfitableCustomers = async (): Promise<ProfitableCustomerEntry[]> =>
  loadList<ProfitableCustomerEntry>(K.customers);

// ---------- Costly Work Orders ----------
export const listCostlyWorkOrders = async (): Promise<CostlyWorkOrderEntry[]> =>
  loadList<CostlyWorkOrderEntry>(K.costly);

// ---------- Employee Productivity ----------
export const listEmployeeProductivity = async (): Promise<EmployeeProductivityEntry[]> =>
  loadList<EmployeeProductivityEntry>(K.employees);

// ---------- Vehicle Efficiency ----------
export const listVehicleProductivity = async (): Promise<VehicleProductivityEntry[]> =>
  loadList<VehicleProductivityEntry>(K.vehicles);

// ---------- Stock Turnover ----------
export const listStockTurnover = async (): Promise<StockTurnoverEntry[]> =>
  loadList<StockTurnoverEntry>(K.stock);

// ---------- Quote Conversion ----------
export const listQuoteConversion = async (): Promise<QuoteConversionEntry[]> =>
  loadList<QuoteConversionEntry>(K.quotes);

// ---------- AI Summary ----------
const DEFAULT_AI: AiExecSummary = {
  generatedAt: new Date().toISOString(),
  headline: '',
  bullets: [],
  kpiSnapshot: { revenue: 0, profit: 0, openJobs: 0, overdueQuotes: 0 },
};
export const getAiSummary = async (): Promise<AiExecSummary> =>
  loadObj<AiExecSummary>(K.ai, DEFAULT_AI);

// Color helpers
export const TREND_COLOR: Record<'up' | 'down' | 'flat', string> = { up: '#22c55e', down: '#ef4444', flat: '#64748b' };
export const TREND_ICON: Record<'up' | 'down' | 'flat', string> = { up: 'trending-up', down: 'trending-down', flat: 'remove' };
export const AI_SEV_COLOR: Record<'info' | 'warning' | 'critical' | 'opportunity', string> = {
  info: '#0ea5e9', warning: '#f59e0b', critical: '#ef4444', opportunity: '#22c55e',
};
export const AI_SEV_ICON: Record<'info' | 'warning' | 'critical' | 'opportunity', string> = {
  info: 'information-circle', warning: 'warning', critical: 'alert-circle', opportunity: 'bulb',
};
