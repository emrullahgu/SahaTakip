// POZ-DEV-251: Bordro & Puantaj servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PayrollItem, PayrollRun, TimesheetEntry, TimesheetStatus } from '../types';

const TS_KEY = 'timesheet_v1';
const RUN_KEY = 'payroll_runs_v1';

export const TIMESHEET_STATUS_LABEL: Record<TimesheetStatus, string> = {
  present: 'Geldi',
  absent: 'Gelmedi',
  leave: 'İzin',
  sick: 'Raporlu',
  holiday: 'Tatil',
};
export const TIMESHEET_STATUS_COLOR: Record<TimesheetStatus, string> = {
  present: '#22c55e',
  absent: '#ef4444',
  leave: '#0ea5e9',
  sick: '#f59e0b',
  holiday: '#a855f7',
};

export async function listTimesheet(): Promise<TimesheetEntry[]> {
  const raw = await AsyncStorage.getItem(TS_KEY);
  return raw ? (JSON.parse(raw) as TimesheetEntry[]) : [];
}
export async function saveTimesheetEntry(t: Omit<TimesheetEntry, 'id' | 'createdAt'> & { id?: string }): Promise<TimesheetEntry> {
  const all = await listTimesheet();
  // upsert by (employeeId, date)
  const sameDay = all.findIndex(x => x.employeeId === t.employeeId && x.date === t.date);
  if (t.id || sameDay >= 0) {
    const idx = t.id ? all.findIndex(x => x.id === t.id) : sameDay;
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...t, id: all[idx].id } as TimesheetEntry;
      await AsyncStorage.setItem(TS_KEY, JSON.stringify(all));
      return all[idx];
    }
  }
  const created: TimesheetEntry = {
    ...t,
    id: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(TS_KEY, JSON.stringify(all));
  return created;
}
export async function deleteTimesheetEntry(id: string): Promise<void> {
  const all = await listTimesheet();
  await AsyncStorage.setItem(TS_KEY, JSON.stringify(all.filter(x => x.id !== id)));
}
export function timesheetForMonth(all: TimesheetEntry[], employeeId: string, monthIso: string): TimesheetEntry[] {
  return all.filter(t => t.employeeId === employeeId && t.date.startsWith(monthIso));
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const raw = await AsyncStorage.getItem(RUN_KEY);
  const all = raw ? (JSON.parse(raw) as PayrollRun[]) : [];
  return all.sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
}
export async function getPayrollRun(id: string): Promise<PayrollRun | undefined> {
  return (await listPayrollRuns()).find(r => r.id === id);
}

export function computePayroll(input: {
  employeeId: string;
  employeeName: string;
  periodMonth: string; // YYYY-MM
  monthlyWage: number;
  daysWorked: number;
  overtimeHours: number;
  overtimeRate?: number; // ₺ / saat
  bonus?: number;
  advance?: number;
  expense?: number;
  deduction?: number;
}): Omit<PayrollRun, 'id' | 'createdAt' | 'status' | 'paidAt'> {
  const otRate = input.overtimeRate ?? Math.round((input.monthlyWage / 30 / 8) * 1.5);
  const overtimeAmt = Math.round(otRate * input.overtimeHours);
  const items: PayrollItem[] = [
    { kind: 'base', label: 'Maaş', amount: input.monthlyWage },
    { kind: 'overtime', label: `Mesai (${input.overtimeHours} sa)`, amount: overtimeAmt },
  ];
  if (input.bonus) items.push({ kind: 'bonus', label: 'Prim', amount: input.bonus });
  if (input.expense) items.push({ kind: 'expense', label: 'Gider İadesi', amount: input.expense });
  if (input.advance) items.push({ kind: 'advance', label: 'Avans Düşüşü', amount: -Math.abs(input.advance) });
  if (input.deduction) items.push({ kind: 'deduction', label: 'Kesinti', amount: -Math.abs(input.deduction) });
  const gross = items.filter(i => i.amount > 0).reduce((s, i) => s + i.amount, 0);
  const deductions = items.filter(i => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0);
  const net = gross - deductions;
  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    periodMonth: input.periodMonth,
    daysWorked: input.daysWorked,
    overtimeHours: input.overtimeHours,
    items,
    gross,
    deductions,
    net,
  };
}

export async function savePayrollRun(run: Omit<PayrollRun, 'id' | 'createdAt'> & { id?: string }): Promise<PayrollRun> {
  const all = await listPayrollRuns();
  if (run.id) {
    const idx = all.findIndex(x => x.id === run.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...run, id: run.id } as PayrollRun;
      await AsyncStorage.setItem(RUN_KEY, JSON.stringify(all));
      return all[idx];
    }
  }
  const created: PayrollRun = {
    ...run,
    id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(RUN_KEY, JSON.stringify(all));
  return created;
}
export async function deletePayrollRun(id: string): Promise<void> {
  const all = await listPayrollRuns();
  await AsyncStorage.setItem(RUN_KEY, JSON.stringify(all.filter(x => x.id !== id)));
}
