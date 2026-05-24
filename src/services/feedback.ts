// feedback.ts — POZ-DEV-322 Kullanıcı geri bildirim toplama servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeedbackEntry, FeedbackCategory, FeedbackStatus } from '../types';

const KEY = 'feedback_entries_v1';

function uid(): string {
  return 'fb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export async function listFeedback(): Promise<FeedbackEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr: FeedbackEntry[] = JSON.parse(raw);
    return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function getFeedback(id: string): Promise<FeedbackEntry | undefined> {
  const list = await listFeedback();
  return list.find(f => f.id === id);
}

export async function saveFeedback(entry: Omit<FeedbackEntry, 'id' | 'createdAt' | 'status'> & { id?: string; status?: FeedbackStatus }): Promise<FeedbackEntry> {
  const list = await listFeedback();
  if (entry.id) {
    const idx = list.findIndex(f => f.id === entry.id);
    if (idx >= 0) {
      const updated: FeedbackEntry = { ...list[idx], ...entry, id: entry.id, status: entry.status ?? list[idx].status };
      list[idx] = updated;
      await AsyncStorage.setItem(KEY, JSON.stringify(list));
      return updated;
    }
  }
  const fresh: FeedbackEntry = {
    ...(entry as any),
    id: uid(),
    createdAt: new Date().toISOString(),
    status: entry.status ?? 'open',
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([fresh, ...list]));
  return fresh;
}

export async function deleteFeedback(id: string): Promise<void> {
  const list = await listFeedback();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter(f => f.id !== id)));
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  const list = await listFeedback();
  const idx = list.findIndex(f => f.id === id);
  if (idx >= 0) {
    list[idx].status = status;
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  }
}

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'Hata',
  feature: 'Özellik',
  ui: 'Arayüz',
  performance: 'Performans',
  other: 'Diğer',
};

export const FEEDBACK_CATEGORY_COLOR: Record<FeedbackCategory, string> = {
  bug: '#ef4444',
  feature: '#0ea5e9',
  ui: '#a855f7',
  performance: '#f59e0b',
  other: '#64748b',
};

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Açık',
  in_review: 'İnceleniyor',
  planned: 'Planlandı',
  closed: 'Kapandı',
};

export const FEEDBACK_STATUS_COLOR: Record<FeedbackStatus, string> = {
  open: '#0ea5e9',
  in_review: '#f59e0b',
  planned: '#a855f7',
  closed: '#22c55e',
};
