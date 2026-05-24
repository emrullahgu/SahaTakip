// notifications.ts — POZ-DEV-073, 074, 075, 076
// Olay akışı + çoklu kanal dağıtımı (push/email/sms/whatsapp).
// E-posta/SMS/WhatsApp için supabase.functions.invoke ile Edge Function uçları
// hazır değilse sessizce queue'lanır; uygulama dışı backend kurulumu beklenir.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppNotification,
  NotificationChannel,
  NotificationEventType,
  NotificationPreferences,
} from '../types';
import { effectiveChannels, loadPrefs } from './notificationPrefs';
import { sendLocalPush } from './pushNotifications';
import { supabase } from './supabase';

const KEY = '@SahaTakip:notifications';
const MAX = 200;

function rid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function listNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

async function saveAll(items: AppNotification[]): Promise<void> {
  const trimmed = items.slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
}

export async function addNotification(
  n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
): Promise<AppNotification> {
  const all = await listNotifications();
  const created: AppNotification = {
    id: rid(),
    createdAt: new Date().toISOString(),
    read: false,
    ...n,
  };
  await saveAll([created, ...all]);
  return created;
}

export async function markRead(id: string): Promise<void> {
  const all = await listNotifications();
  await saveAll(all.map(n => (n.id === id ? { ...n, read: true } : n)));
}

export async function markAllRead(): Promise<void> {
  const all = await listNotifications();
  await saveAll(all.map(n => ({ ...n, read: true })));
}

export async function deleteNotification(id: string): Promise<void> {
  const all = await listNotifications();
  await saveAll(all.filter(n => n.id !== id));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function unreadCount(): Promise<number> {
  const all = await listNotifications();
  return all.filter(n => !n.read).length;
}

// ------------- Channel dispatch (placeholders) -------------

async function dispatchEmail(
  to: string | undefined,
  title: string,
  body: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!to) return { ok: false, message: 'E-posta adresi yok' };
  try {
    // POZ-DEV-074: Resend Edge Function
    // supabase functions deploy notify-email
    const { error } = await supabase.functions.invoke('notify-email', {
      body: { to, subject: title, html: `<p>${body}</p>` },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

async function dispatchSms(
  to: string | undefined,
  body: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!to) return { ok: false, message: 'Telefon yok' };
  try {
    // POZ-DEV-075: Netgsm / İletimerkezi Edge Function
    const { error } = await supabase.functions.invoke('notify-sms', {
      body: { to, message: body },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

async function dispatchWhatsapp(
  to: string | undefined,
  body: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!to) return { ok: false, message: 'WhatsApp numarası yok' };
  try {
    // POZ-DEV-076: Meta WhatsApp Business webhook
    const { error } = await supabase.functions.invoke('notify-whatsapp', {
      body: { to, message: body },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export interface EmitOptions {
  relatedId?: string;
  channels?: NotificationChannel[]; // override
  recipient?: string;                // override
}

export interface EmitResult {
  notification: AppNotification;
  channels: NotificationChannel[];
  dispatch: Partial<Record<NotificationChannel, { ok: boolean; message?: string }>>;
}

export async function emitEvent(
  type: NotificationEventType,
  title: string,
  message: string,
  opts: EmitOptions = {},
): Promise<EmitResult> {
  const prefs: NotificationPreferences = await loadPrefs();
  const channels = opts.channels ?? effectiveChannels(prefs, type);

  const notification = await addNotification({
    type,
    title,
    message,
    channels,
    relatedId: opts.relatedId,
    recipient: opts.recipient,
  });

  const dispatch: EmitResult['dispatch'] = {};

  for (const ch of channels) {
    if (ch === 'push') {
      const id = await sendLocalPush(title, message, { type, relatedId: opts.relatedId });
      dispatch.push = { ok: !!id, message: id ? undefined : 'Push gönderilemedi' };
    } else if (ch === 'email') {
      dispatch.email = await dispatchEmail(opts.recipient ?? prefs.email, title, message);
    } else if (ch === 'sms') {
      dispatch.sms = await dispatchSms(opts.recipient ?? prefs.phone, message);
    } else if (ch === 'whatsapp') {
      dispatch.whatsapp = await dispatchWhatsapp(
        opts.recipient ?? prefs.whatsapp,
        message,
      );
    }
  }

  return { notification, channels, dispatch };
}

// Convenience emitters
export const Notify = {
  workOrderCreated: (client: string, service: string, workOrderId: string) =>
    emitEvent(
      'work_order_created',
      'Yeni İş Emri',
      `${client} — ${service}`,
      { relatedId: workOrderId },
    ),
  workOrderAssigned: (assignee: string, client: string, workOrderId: string) =>
    emitEvent(
      'work_order_assigned',
      'İş Atandı',
      `${assignee} → ${client}`,
      { relatedId: workOrderId },
    ),
  workOrderStarted: (client: string, workOrderId: string) =>
    emitEvent('work_order_started', 'İş Başladı', client, { relatedId: workOrderId }),
  workOrderCompleted: (client: string, workOrderId: string) =>
    emitEvent('work_order_completed', 'İş Tamamlandı', client, { relatedId: workOrderId }),
  slaBreach: (client: string, hoursOverdue: number, workOrderId: string) =>
    emitEvent(
      'sla_breach',
      'SLA İhlali',
      `${client} — ${hoursOverdue.toFixed(1)} sa gecikme`,
      { relatedId: workOrderId },
    ),
  quoteSent: (client: string, quoteId: string) =>
    emitEvent('quote_sent', 'Teklif Gönderildi', client, { relatedId: quoteId }),
  quoteAccepted: (client: string, quoteId: string) =>
    emitEvent('quote_accepted', 'Teklif Onaylandı', client, { relatedId: quoteId }),
  paymentReceived: (client: string, amount: number, paymentId: string) =>
    emitEvent(
      'payment_received',
      'Tahsilat Alındı',
      `${client} — ${amount.toLocaleString('tr-TR')} ₺`,
      { relatedId: paymentId },
    ),
};
