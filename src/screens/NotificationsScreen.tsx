// NotificationsScreen — POZ-DEV-073
// Bildirim akış listesi (yerel depodan).

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAll,
} from '../services/notifications';
import {
  AppNotification,
  NotificationEventType,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

const ICONS: Record<NotificationEventType, keyof typeof Ionicons.glyphMap> = {
  work_order_created: 'briefcase-outline',
  work_order_assigned: 'person-add-outline',
  work_order_started: 'play-circle-outline',
  work_order_completed: 'checkmark-circle-outline',
  sla_breach: 'alarm-outline',
  quote_sent: 'paper-plane-outline',
  quote_accepted: 'checkmark-done-outline',
  payment_received: 'cash-outline',
  task_assigned: 'person-add-outline',
  task_mention: 'at-outline',
  task_comment: 'chatbubble-outline',
  task_due_soon: 'time-outline',
  event_invite: 'mail-outline',
  event_reminder: 'alarm-outline',
  signup: 'person-circle-outline',
  custom: 'notifications-outline',
};

const COLORS: Record<NotificationEventType, string> = {
  work_order_created: '#0ea5e9',
  work_order_assigned: '#6366f1',
  work_order_started: '#f59e0b',
  work_order_completed: brand.green,
  sla_breach: colors.rose.default,
  quote_sent: '#8b5cf6',
  quote_accepted: brand.green,
  payment_received: '#22c55e',
  task_assigned: '#6366f1',
  task_mention: '#a855f7',
  task_comment: '#0ea5e9',
  task_due_soon: '#f59e0b',
  event_invite: '#0ea5e9',
  event_reminder: '#22c55e',
  signup: '#a855f7',
  custom: colors.text.muted,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function navigateForRelated(
  navigation: Nav,
  type: NotificationEventType,
  relatedId?: string,
): void {
  if (!relatedId) return;
  if (type === 'quote_sent' || type === 'quote_accepted') {
    navigation.navigate('QuoteDetail', { quoteId: relatedId });
  } else if (
    type === 'work_order_created' ||
    type === 'work_order_assigned' ||
    type === 'work_order_started' ||
    type === 'work_order_completed' ||
    type === 'sla_breach'
  ) {
    navigation.navigate('WorkOrderDetail', { workOrderId: relatedId });
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listNotifications());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onPress = async (n: AppNotification) => {
    if (!n.read) {
      await markRead(n.id);
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    }
    navigateForRelated(navigation, n.type, n.relatedId);
  };

  const onLongPress = (n: AppNotification) => {
    Alert.alert('Bildirim', n.title, [
      { text: 'Kapat', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteNotification(n.id);
          setItems(prev => prev.filter(x => x.id !== n.id));
        },
      },
    ]);
  };

  const unread = items.filter(x => !x.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Bildirimler</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Ionicons name="settings-outline" size={16} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            disabled={unread === 0}
            onPress={async () => {
              await markAllRead();
              setItems(prev => prev.map(x => ({ ...x, read: true })));
            }}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={16}
              color={unread === 0 ? colors.text.faint : brand.green}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            disabled={items.length === 0}
            onPress={() => {
              Alert.alert('Tümünü sil', 'Tüm bildirimleri silmek istiyor musunuz?', [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Sil',
                  style: 'destructive',
                  onPress: async () => {
                    await clearAll();
                    setItems([]);
                  },
                },
              ]);
            }}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={items.length === 0 ? colors.text.faint : colors.rose.default}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Bildirim yok.</Text>
          </View>
        ) : (
          items.map(n => {
            const color = COLORS[n.type] ?? colors.text.muted;
            const icon = ICONS[n.type] ?? 'notifications-outline';
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => onPress(n)}
                onLongPress={() => onLongPress(n)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.headRow}>
                    <Text
                      style={[styles.cardTitle, !n.read && { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {n.title}
                    </Text>
                    {!n.read ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={styles.msg} numberOfLines={2}>
                    {n.message}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{timeAgo(n.createdAt)}</Text>
                    {n.channels.length > 0 ? (
                      <Text style={styles.meta}>· {n.channels.join(', ')}</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  actions: { flexDirection: 'row', gap: 8 },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardUnread: { borderColor: brand.blueLight },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: brand.blueLight },
  msg: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  meta: { color: colors.text.faint, fontSize: 10 },
});
