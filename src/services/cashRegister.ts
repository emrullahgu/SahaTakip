// cashRegister.ts — POZ-DEV-081
// Saha personeli kasa takibi (yerel ledger).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CashEntry, CashEntryKind, CashSummary, Employee } from '../types';

const KEY = '@SahaTakip:cash_entries';

function rid(): string {
  return 'cash_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function listEntries(): Promise<CashEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CashEntry[];
  } catch {
    return [];
  }
}

async function saveAll(items: CashEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function addEntry(
  data: Omit<CashEntry, 'id' | 'createdAt' | 'date'> & { id?: string; date?: string },
): Promise<CashEntry> {
  const all = await listEntries();
  const next: CashEntry = {
    ...data,
    id: data.id ?? rid(),
    date: data.date ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await saveAll([next, ...all]);
  return next;
}

export async function deleteEntry(id: string): Promise<void> {
  const all = await listEntries();
  await saveAll(all.filter(e => e.id !== id));
}

export async function listByEmployee(employeeId: string): Promise<CashEntry[]> {
  const all = await listEntries();
  return all
    .filter(e => e.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function aggregate(entries: CashEntry[]): Omit<CashSummary, 'employeeId' | 'employeeName'> {
  let opening = 0, collected = 0, spent = 0, deposited = 0, adjustments = 0;
  let lastEntryAt: string | undefined;

  for (const e of entries) {
    if (!lastEntryAt || e.date > lastEntryAt) lastEntryAt = e.date;
    switch (e.kind) {
      case 'opening': opening += e.amount; break;
      case 'collection': collected += e.amount; break;
      case 'expense': spent += e.amount; break;
      case 'deposit': deposited += e.amount; break;
      case 'adjustment': adjustments += e.amount; break;
    }
  }

  return {
    opening,
    collected,
    spent,
    deposited,
    adjustments,
    balance: opening + collected - spent - deposited + adjustments,
    lastEntryAt,
  };
}

export async function summaryForEmployee(
  employeeId: string,
  employeeName: string,
): Promise<CashSummary> {
  const entries = await listByEmployee(employeeId);
  return { employeeId, employeeName, ...aggregate(entries) };
}

export async function summariesForAll(employees: Employee[]): Promise<CashSummary[]> {
  const all = await listEntries();
  return employees.map(emp => {
    const entries = all.filter(e => e.employeeId === emp.id);
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      ...aggregate(entries),
    };
  });
}

export const CASH_KIND_LABEL: Record<CashEntryKind, string> = {
  opening: 'Açılış',
  collection: 'Tahsilat',
  expense: 'Harcama',
  deposit: 'Teslim',
  adjustment: 'Düzeltme',
};

export const CASH_KIND_SIGN: Record<CashEntryKind, '+' | '-' | '±'> = {
  opening: '+',
  collection: '+',
  expense: '-',
  deposit: '-',
  adjustment: '±',
};
