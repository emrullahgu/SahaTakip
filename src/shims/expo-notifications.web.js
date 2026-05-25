// expo-notifications web stub — bu modül web'de tamamen no-op.
// Amaç: import-time uyarısını ("Listening to push token changes is not yet
// fully supported on web") ve diğer web-desteklenmeyen API çağrılarını sessiz
// hale getirmek. Tüm fonksiyonlar güvenli varsayılan değer döner.

const noopAsync = async () => undefined;
const emptyPermissions = async () => ({
  status: 'undetermined',
  granted: false,
  canAskAgain: false,
  expires: 'never',
});

module.exports = {
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
    LOW: 2,
    MAX: 5,
    MIN: 1,
    NONE: 0,
    UNSPECIFIED: -1,
  },
  AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 0, SECRET: -1, UNKNOWN: -1000 },

  setNotificationHandler: () => {},
  setNotificationChannelAsync: noopAsync,
  getNotificationChannelAsync: async () => null,
  deleteNotificationChannelAsync: noopAsync,
  getNotificationChannelGroupsAsync: async () => [],

  getPermissionsAsync: emptyPermissions,
  requestPermissionsAsync: emptyPermissions,

  getExpoPushTokenAsync: async () => ({ data: '', type: 'expo' }),
  getDevicePushTokenAsync: async () => ({ data: '', type: 'web' }),

  scheduleNotificationAsync: async () => '',
  cancelScheduledNotificationAsync: noopAsync,
  cancelAllScheduledNotificationsAsync: noopAsync,
  getAllScheduledNotificationsAsync: async () => [],
  presentNotificationAsync: async () => '',
  dismissNotificationAsync: noopAsync,
  dismissAllNotificationsAsync: noopAsync,
  getBadgeCountAsync: async () => 0,
  setBadgeCountAsync: async () => true,

  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  addPushTokenListener: () => ({ remove: () => {} }),
  removeNotificationSubscription: () => {},

  // Trigger tipleri için boş referanslar (TS uyumluluğu için sadece runtime'da kullanılır)
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    YEARLY: 'yearly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
};
