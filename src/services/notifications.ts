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
import { supabase, SUPABASE_CONFIGURED, getCurrentUser } from './supabase';

const KEY = '@SahaTakip:notifications';
const MAX = 200;

function rid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function notifFromRow(r: any): AppNotification {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    channels: r.channels || [],
    relatedId: r.related_id || undefined,
    recipient: r.recipient || undefined,
    read: !!r.read,
    createdAt: r.created_at,
  } as AppNotification;
}

export async function listNotifications(): Promise<AppNotification[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX);
        if (!error && data) {
          const list = data.map(notifFromRow);
          await AsyncStorage.setItem(KEY, JSON.stringify(list));
          return list;
        }
      }
    } catch { /* fallback */ }
  }
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
  let created: AppNotification = {
    id: rid(),
    createdAt: new Date().toISOString(),
    read: false,
    ...n,
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { data, error } = await supabase.from('notifications').insert({
          user_id: user.id,
          type: n.type,
          title: n.title,
          message: n.message,
          channels: n.channels || [],
          related_id: n.relatedId || null,
          recipient: n.recipient || null,
          read: false,
        }).select().single();
        if (!error && data) created = notifFromRow(data);
      }
    } catch { /* offline */ }
  }
  await saveAll([created, ...all]);
  return created;
}

export async function markRead(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('notifications').update({ read: true }).eq('id', id); } catch { /* offline */ } }
  const all = await listNotifications();
  await saveAll(all.map(n => (n.id === id ? { ...n, read: true } : n)));
}

export async function markAllRead(): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    try {
      const user = await getCurrentUser();
      if (user) await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    } catch { /* offline */ }
  }
  const all = await listNotifications();
  await saveAll(all.map(n => ({ ...n, read: true })));
}

export async function deleteNotification(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('notifications').delete().eq('id', id); } catch { /* offline */ } }
  const all = await listNotifications();
  await saveAll(all.filter(n => n.id !== id));
}

export async function clearAll(): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    try {
      const user = await getCurrentUser();
      if (user) await supabase.from('notifications').delete().eq('user_id', user.id);
    } catch { /* offline */ }
  }
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

// ----------- Cross-user uzak bildirim (atama vb. — FARKLI cihaza) -----------

export interface NotifyTarget {
  userIds?: string[];     // hedef auth user id'leri
  userNames?: string[];   // profiles.full_name ile eşleştir (employee→user bağı yoksa)
}

/**
 * Başka kullanıcı(lar)a uzaktan push + bildirim kaydı gönderir. RLS'i aşmak için
 * sunucu tarafı `notify-push` Edge Function'ını çağırır (service role ile token
 * lookup + Expo push + alıcının user_id'sine notifications satırı). Fonksiyon
 * deploy edilmemişse sessizce başarısız döner; uygulama akışı kesilmez.
 */
export async function notifyUsers(
  target: NotifyTarget,
  type: NotificationEventType,
  title: string,
  message: string,
  relatedId?: string,
): Promise<{ ok: boolean; sent?: number; error?: string }> {
  if (!SUPABASE_CONFIGURED) return { ok: false, error: 'offline' };
  if (!target.userIds?.length && !target.userNames?.length) return { ok: false, error: 'hedef yok' };
  try {
    const { data, error } = await supabase.functions.invoke('notify-push', {
      body: {
        userIds: target.userIds,
        userNames: target.userNames,
        type,
        title,
        body: message,
        relatedId: relatedId ?? null,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, sent: (data as any)?.sent };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
  workOrderAssigned: (assignee: string, client: string, workOrderId: string, assigneeUserId?: string) => {
    // Atanan kişiye FARKLI cihazından haber ver (uzak push). user_id biliniyorsa
    // onunla, yoksa ada göre eşleştir. (Best-effort; deploy yoksa sessiz geçer.)
    void notifyUsers(
      assigneeUserId ? { userIds: [assigneeUserId] } : { userNames: [assignee] },
      'work_order_assigned',
      'Size İş Atandı',
      `${client}`,
      workOrderId,
    ).catch(() => { /* sessiz */ });
    // Yöneticinin kendi bildirim merkezi/local push'u için olay kaydı.
    return emitEvent(
      'work_order_assigned',
      'İş Atandı',
      `${assignee} → ${client}`,
      { relatedId: workOrderId },
    );
  },
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
