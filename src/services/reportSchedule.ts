// reportSchedule.ts — POZ-DEV-064, 071
// Günlük 18:00'da rapor hatırlatması (expo-notifications). Haftalık e-posta
// için Edge Function entegrasyonu placeholder.

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DAILY = '@SahaTakip:report_daily_id';
const KEY_WEEKLY_EMAIL = '@SahaTakip:report_weekly_email';

export async function scheduleDailyReportReminder(hour = 18, minute = 0) {
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return null;

  // önceki kaydı temizle
  const prev = await AsyncStorage.getItem(KEY_DAILY);
  if (prev) {
    try {
      await Notifications.cancelScheduledNotificationAsync(prev);
    } catch {}
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Günlük Saha Raporu',
      body: 'Bugünkü iş özetini gözden geçir ve paylaş.',
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as Notifications.NotificationTriggerInput,
  });
  await AsyncStorage.setItem(KEY_DAILY, id);
  return id;
}

export async function cancelDailyReportReminder() {
  const id = await AsyncStorage.getItem(KEY_DAILY);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
    await AsyncStorage.removeItem(KEY_DAILY);
  }
}

export async function getDailyReportReminderId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_DAILY);
}

// --- Haftalık e-posta tercihleri ---
export async function setWeeklyEmail(email: string | null) {
  if (!email) {
    await AsyncStorage.removeItem(KEY_WEEKLY_EMAIL);
  } else {
    await AsyncStorage.setItem(KEY_WEEKLY_EMAIL, email);
  }
}

export async function getWeeklyEmail(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_WEEKLY_EMAIL);
}

/**
 * POZ-DEV-071 — Haftalık özet e-posta için sunucu Edge Function çağrısı.
 * Üretim: Supabase Edge Function "weekly-report-email" yaz.
 */
export async function triggerWeeklyEmail(_payload: {
  email: string;
  reportId: string;
}): Promise<{ ok: boolean; message: string }> {
  // TODO: supabase.functions.invoke('weekly-report-email', { body: payload })
  return { ok: false, message: 'Edge Function bekleniyor.' };
}
