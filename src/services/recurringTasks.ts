// ====================================================================
// RecurringTasks — POZ-DEV-029
// Periyodik bakım gibi tekrarlayan iş emri şablonları.
// Lokal AsyncStorage'te saklanır + nextRunDate geldiğinde yeni iş emri üretir.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecurringTemplate, WorkOrder } from '../types';

const KEY = '@SahaTakip:recurring_templates';

export async function listTemplates(): Promise<RecurringTemplate[]> {
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
  const list = await listTemplates();
  const idx = list.findIndex(x => x.id === t.id);
  if (idx >= 0) list[idx] = t;
  else list.unshift(t);
  await saveTemplates(list);
}

export async function deleteTemplate(id: string): Promise<void> {
  const list = await listTemplates();
  await saveTemplates(list.filter(t => t.id !== id));
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * nextRunDate <= bugün olan tüm aktif şablonları çalıştırır,
 * yeni iş emirleri döndürür ve şablonların nextRunDate'ini ileri taşır.
 */
export async function runDueTemplates(): Promise<WorkOrder[]> {
  const list = await listTemplates();
  const today = new Date().toISOString().slice(0, 10);
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
  if (newOrders.length) await saveTemplates(updated);
  return newOrders;
}
