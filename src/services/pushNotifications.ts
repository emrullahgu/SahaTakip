// pushNotifications.ts — POZ-DEV-072
// Expo Push Notification token kayıt + Android kanal kurulumu + local push gönderimi.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { setPushToken } from './notificationPrefs';

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
    if (token) await setPushToken(token);
    return token;
  } catch {
    return null;
  }
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
