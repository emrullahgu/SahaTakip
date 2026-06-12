// ====================================================================
// RecurringTasks — POZ-DEV-029
// Periyodik bakım gibi tekrarlayan iş emri şablonları.
// Lokal AsyncStorage'te saklanır + nextRunDate geldiğinde yeni iş emri üretir.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateISO } from '../utils/date';
import { RecurringTemplate, WorkOrder } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:recurring_templates';

function fromRow(r: any): RecurringTemplate {
  return {
    id: r.id,
    title: r.title ?? '',
    serviceName: r.service_name ?? '',
    client: r.client ?? '',
    priority: r.priority ?? 'Normal',
    intervalDays: Number(r.interval_days ?? 30),
    nextRunDate: r.next_run_date,
    defaultEngineer: r.default_engineer ?? undefined,
    active: r.active !== false,
    notes: r.notes ?? undefined,
  };
}
function toRow(t: RecurringTemplate): Record<string, any> {
  return {
    id: t.id,
    title: t.title,
    service_name: t.serviceName,
    client: t.client,
    priority: t.priority,
    interval_days: t.intervalDays,
    next_run_date: t.nextRunDate,
    default_engineer: t.defaultEngineer ?? null,
    active: t.active,
    notes: t.notes ?? null,
  };
}

export async function listTemplates(): Promise<RecurringTemplate[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .order('next_run_date', { ascending: true });
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveTemplates(list: RecurringTemplate[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertTemplate(t: RecurringTemplate): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    try { await supabase.from('recurring_templates').upsert(toRow(t), { onConflict: 'id' }); } catch { /* ignore */ }
  }
  const list = await listTemplates();
  const idx = list.findIndex(x => x.id === t.id);
  if (idx >= 0) list[idx] = t;
  else list.unshift(t);
  await saveTemplates(list);
}

export async function deleteTemplate(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    try { await supabase.from('recurring_templates').delete().eq('id', id); } catch { /* ignore */ }
  }
  const list = await listTemplates();
  await saveTemplates(list.filter(t => t.id !== id));
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

/**
 * nextRunDate <= bugün olan tüm aktif şablonları çalıştırır,
 * yeni iş emirleri döndürür ve şablonların nextRunDate'ini ileri taşır.
 */
export async function runDueTemplates(): Promise<WorkOrder[]> {
  const list = await listTemplates();
  const today = localDateISO();
  const newOrders: WorkOrder[] = [];
  const updated: RecurringTemplate[] = [];
  for (const t of list) {
    if (t.active && t.nextRunDate <= today) {
      const orderId = `RT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      newOrders.push({
        id: orderId,
        client: t.client,
        serviceName: t.serviceName,
        date: today,
        engineer: t.defaultEngineer ?? '',
        materials: [],
        otherCost: 0,
        laborCost: 0,
        materialCost: 0,
        quoteAmount: 0,
        profit: 0,
        status: 'Bekliyor',
        beforePhoto: '',
        afterPhoto: '',
        notes: `Otomatik üretildi (şablon: ${t.title})`,
        priority: t.priority,
        templateId: t.id,
        assignmentStatus: 'Atanmadı',
      });
      updated.push({ ...t, nextRunDate: addDays(t.nextRunDate, t.intervalDays) });
    } else {
      updated.push(t);
    }
  }
  if (newOrders.length) {
    if (SUPABASE_CONFIGURED) {
      for (const t of updated) {
        try { await supabase.from('recurring_templates').upsert(toRow(t), { onConflict: 'id' }); } catch { /* ignore */ }
      }
    }
    await saveTemplates(updated);
  }
  return newOrders;
}
