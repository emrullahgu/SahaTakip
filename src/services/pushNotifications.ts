// pushNotifications.ts — POZ-DEV-072
// Expo Push Notification token kayıt + Android kanal kurulumu + local push gönderimi.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { setPushToken } from './notificationPrefs';
import { supabase, SUPABASE_CONFIGURED, getCurrentUser } from './supabase';

let configured = false;

export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SahaTakip Bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
    });
  } catch {
    // sessiz: kanal kurulumu kritik değil
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  configureNotifications();
  await ensureAndroidChannel();

  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (existing.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const projectId =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Notifications as any).getExpoPushTokenAsync ? undefined : undefined;
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = res.data;
    if (token) {
      await setPushToken(token);
      // Paylaşımlı push_tokens tablosuna da yaz — başka kullanıcılar (ör. atama
      // yapan yönetici) bu kullanıcıya uzaktan push gönderebilsin.
      await registerDeviceToken(token);
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Mevcut kullanıcının Expo push token'ını paylaşımlı `push_tokens` tablosuna
 * upsert eder. Çoklu cihaz desteklenir (token doğal anahtar). Cross-user push
 * için notify-push Edge Function'ı bu tablodan okur.
 */
export async function registerDeviceToken(token: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !token) return;
  try {
    const user = await getCurrentUser();
    if (!user) return;
    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token },
      { onConflict: 'token' },
    );
  } catch {
    /* sessiz — tablo/RLS yoksa local push yine çalışır */
  }
}

// ============================================================================
// UZAK PUSH (Expo Push API) — farklı cihazlara bildirim
// ============================================================================
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
}

/** Geçerli bir Expo push token'ı mı? (ExponentPushToken[...] / ExpoPushToken[...]) */
export function isExpoPushToken(t: string | null | undefined): boolean {
  return !!t && /^Expo(nent)?PushToken\[.+\]$/.test(t.trim());
}

/** Token listesini tekilleştirip 100'erli (Expo limiti) parçalara böler ve mesaj üretir. */
export function buildExpoMessages(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): ExpoPushMessage[][] {
  const valid = Array.from(new Set(tokens.filter(isExpoPushToken)));
  const batches: ExpoPushMessage[][] = [];
  for (let i = 0; i < valid.length; i += 100) {
    batches.push(
      valid.slice(i, i + 100).map(to => ({
        to,
        title,
        body,
        data: data ?? {},
        sound: 'default' as const,
        channelId: 'default',
      })),
    );
  }
  return batches;
}

/**
 * Verilen Expo token'larına doğrudan Expo Push API ile bildirim gönderir.
 * (Expo uç noktası publiktir — auth gerektirmez; hem client hem Edge Function'da kullanılabilir.)
 * Geçersiz token'ları eler, 100'erli batch'ler, ticket sonuçlarını özetler.
 */
export async function sendRemotePush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const batches = buildExpoMessages(tokens, title, body, data);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const batch of batches) {
    if (!batch.length) continue;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        failed += batch.length;
        errors.push(`HTTP ${res.status}`);
        continue;
      }
      const json = await res.json().catch(() => ({} as any));
      const tickets = Array.isArray(json?.data) ? json.data : [];
      for (const t of tickets) {
        if (t?.status === 'ok') sent++;
        else { failed++; if (t?.message) errors.push(t.message); }
      }
    } catch (e: any) {
      failed += batch.length;
      errors.push(e?.message || String(e));
    }
  }
  return { sent, failed, errors };
}

export async function sendLocalPush(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<string | null> {
  try {
    configureNotifications();
    await ensureAndroidChannel();
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger: null,
    });
    return id;
  } catch {
    return null;
  }
}

/**
 * Belirli bir tarih için yerel bildirim planla. Geçmiş tarihlerde hemen tetiklenir.
 * Geri dönen id `cancelScheduledPush` ile iptal edilebilir.
 */
export async function scheduleLocalPushAt(
  date: Date,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<string | null> {
  try {
    configureNotifications();
    await ensureAndroidChannel();
    const now = Date.now();
    const ts = date.getTime();
    // Geçmiş zaman → hemen göster
    if (!isFinite(ts) || ts <= now + 1000) {
      return await sendLocalPush(title, body, data);
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } as any,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelScheduledPush(id: string | null | undefined): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* sessiz */
  }
}
