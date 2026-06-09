// cashRegister.ts — POZ-DEV-081
// Saha personeli kasa takibi (yerel ledger).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CashEntry, CashEntryKind, CashSummary, Employee } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { auditRepo } from './data/auditRepo';

const KEY = '@SahaTakip:cash_entries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function fromRow(r: any): CashEntry {
  return {
    id: r.id,
    employeeId: r.employee_id ?? '',
    employeeName: r.employee_name ?? '',
    kind: r.kind,
    amount: Number(r.amount ?? 0),
    date: r.date ?? new Date().toISOString(),
    paymentId: r.payment_id ?? undefined,
    workOrderId: r.work_order_id ?? undefined,
    note: r.note ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(e: CashEntry): Record<string, any> {
  const row: Record<string, any> = {
    employee_id: uuidOrNull(e.employeeId),
    employee_name: e.employeeName,
    kind: e.kind,
    amount: e.amount,
    date: e.date,
    payment_id: uuidOrNull(e.paymentId),
    work_order_id: uuidOrNull(e.workOrderId),
    note: e.note ?? null,
  };
  if (UUID_RE.test(e.id)) row.id = e.id;
  return row;
}

function rid(): string {
  return 'cash_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function listEntries(): Promise<CashEntry[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('cash_entries')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
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
  let next: CashEntry = {
    ...data,
    id: data.id ?? rid(),
    date: data.date ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data: row, error } = await supabase
        .from('cash_entries')
        .insert(toRow(next))
        .select()
        .single();
      if (!error && row) next = fromRow(row);
    } catch { /* keep local */ }
  }
  await saveAll([next, ...all]);
  void auditRepo.logCurrent({ action: 'cash.entry.create', tableName: 'cash_entries', refId: next.id, meta: { kind: next.kind, amount: next.amount, employeeId: next.employeeId } });
  return next;
}

export async function deleteEntry(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('cash_entries').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listEntries();
  await saveAll(all.filter(e => e.id !== id));
  void auditRepo.logCurrent({ action: 'cash.entry.delete', tableName: 'cash_entries', refId: id });
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
