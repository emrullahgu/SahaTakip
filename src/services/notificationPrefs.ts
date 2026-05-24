// notificationPrefs.ts — POZ-DEV-077
// Kullanıcı bildirim tercihleri (kanal + olay matrisi + iletişim bilgileri).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationChannel,
  NotificationEventType,
  NotificationPreferences,
} from '../types';

const KEY = '@SahaTakip:notif_prefs';

export const ALL_CHANNELS: NotificationChannel[] = ['push', 'email', 'sms', 'whatsapp'];

export const ALL_EVENTS: { type: NotificationEventType; label: string }[] = [
  { type: 'work_order_created', label: 'Yeni İş Emri' },
  { type: 'work_order_assigned', label: 'İş Atandı' },
  { type: 'work_order_started', label: 'İş Başladı' },
  { type: 'work_order_completed', label: 'İş Tamamlandı' },
  { type: 'sla_breach', label: 'SLA İhlali / Gecikme' },
  { type: 'quote_sent', label: 'Teklif Gönderildi' },
  { type: 'quote_accepted', label: 'Teklif Onaylandı' },
  { type: 'payment_received', label: 'Tahsilat Alındı' },
];

const DEFAULTS: NotificationPreferences = {
  channelEnabled: { push: true, email: false, sms: false, whatsapp: false },
  eventChannels: {
    work_order_created: ['push'],
    work_order_assigned: ['push'],
    work_order_started: ['push'],
    work_order_completed: ['push'],
    sla_breach: ['push', 'email'],
    quote_sent: ['email'],
    quote_accepted: ['push', 'email'],
    payment_received: ['push'],
  },
};

export async function loadPrefs(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...DEFAULTS,
      ...parsed,
      channelEnabled: { ...DEFAULTS.channelEnabled, ...(parsed.channelEnabled ?? {}) },
      eventChannels: { ...DEFAULTS.eventChannels, ...(parsed.eventChannels ?? {}) },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function savePrefs(prefs: NotificationPreferences): Promise<void> {
  const next = { ...prefs, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function setChannelEnabled(
  channel: NotificationChannel,
  enabled: boolean,
): Promise<NotificationPreferences> {
  const prefs = await loadPrefs();
  prefs.channelEnabled[channel] = enabled;
  await savePrefs(prefs);
  return prefs;
}

export async function toggleEventChannel(
  event: NotificationEventType,
  channel: NotificationChannel,
): Promise<NotificationPreferences> {
  const prefs = await loadPrefs();
  const current = prefs.eventChannels[event] ?? [];
  const next = current.includes(channel)
    ? current.filter(c => c !== channel)
    : [...current, channel];
  prefs.eventChannels[event] = next;
  await savePrefs(prefs);
  return prefs;
}

export async function setPushToken(token: string): Promise<void> {
  const prefs = await loadPrefs();
  prefs.pushToken = token;
  await savePrefs(prefs);
}

export async function setContactField(
  field: 'email' | 'phone' | 'whatsapp',
  value: string,
): Promise<NotificationPreferences> {
  const prefs = await loadPrefs();
  prefs[field] = value;
  await savePrefs(prefs);
  return prefs;
}

export function effectiveChannels(
  prefs: NotificationPreferences,
  event: NotificationEventType,
): NotificationChannel[] {
  const evChannels = prefs.eventChannels[event] ?? [];
  return evChannels.filter(c => prefs.channelEnabled[c]);
}
