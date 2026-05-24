// POZ-DEV-310: Takvim servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEvent, CalendarEventKind } from '../types';

const KEY = 'calendar_events_v1';

export const EVENT_KIND_LABEL: Record<CalendarEventKind, string> = {
  meeting: 'Toplantı',
  task: 'Görev',
  visit: 'Saha Ziyareti',
  reminder: 'Hatırlatma',
  holiday: 'Tatil',
  other: 'Diğer',
};

export const EVENT_KIND_COLOR: Record<CalendarEventKind, string> = {
  meeting: '#0ea5e9',
  task: '#8b5cf6',
  visit: '#f59e0b',
  reminder: '#22c55e',
  holiday: '#ef4444',
  other: '#64748b',
};

export const EVENT_KIND_ICON: Record<CalendarEventKind, string> = {
  meeting: 'people-outline',
  task: 'checkmark-done-outline',
  visit: 'location-outline',
  reminder: 'alarm-outline',
  holiday: 'flag-outline',
  other: 'ellipse-outline',
};

export async function listEvents(): Promise<CalendarEvent[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const all = raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  return all.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function getEvent(id: string): Promise<CalendarEvent | undefined> {
  return (await listEvents()).find(e => e.id === id);
}

export async function saveEvent(input: Omit<CalendarEvent, 'id' | 'createdAt'> & { id?: string }): Promise<CalendarEvent> {
  const all = (await listEvents()).slice();
  if (input.id) {
    const i = all.findIndex(e => e.id === input.id);
    if (i >= 0) {
      const merged: CalendarEvent = {
        ...all[i],
        ...input,
        id: input.id,
        updatedAt: new Date().toISOString(),
      } as CalendarEvent;
      all[i] = merged;
      await AsyncStorage.setItem(KEY, JSON.stringify(all));
      return merged;
    }
  }
  const created: CalendarEvent = {
    ...input,
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  } as CalendarEvent;
  all.push(created);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return created;
}

export async function deleteEvent(id: string): Promise<void> {
  const all = await listEvents();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(e => e.id !== id)));
}

export function eventsForMonth(all: CalendarEvent[], monthIso: string): CalendarEvent[] {
  // monthIso = YYYY-MM
  return all.filter(e => e.startAt.slice(0, 7) === monthIso);
}

export function eventsForDay(all: CalendarEvent[], dayIso: string): CalendarEvent[] {
  return all.filter(e => e.startAt.slice(0, 10) === dayIso);
}

export function upcomingEvents(all: CalendarEvent[], limit = 5): CalendarEvent[] {
  const now = new Date().toISOString();
  return all.filter(e => e.startAt >= now).slice(0, limit);
}
