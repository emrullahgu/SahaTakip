// NotificationStatsScreen — POZ-DEV-178 Bildirim olay & kanal dağılımı
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { localDateISO } from '../utils/date';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { AppNotification, NotificationChannel, NotificationEventType } from '../types';
import { listNotifications } from '../services/notifications';

const EVENT_LABEL: Record<NotificationEventType, string> = {
  work_order_created: 'İş Oluştu',
  work_order_assigned: 'İş Atandı',
  work_order_started: 'İş Başladı',
  work_order_completed: 'İş Tamam',
  sla_breach: 'SLA İhlal',
  quote_sent: 'Teklif Gönder',
  quote_accepted: 'Teklif Onay',
  payment_received: 'Tahsilat',
  task_assigned: 'Görev Atama',
  task_mention: 'Bahsetme',
  task_comment: 'Görev Yorum',
  task_due_soon: 'Görev Süre',
  event_invite: 'Etkinlik Davet',
  event_reminder: 'Etkinlik Hatırlat',
  signup: 'Kayıt',
  custom: 'Özel',
};

const EVENT_COLOR: Record<NotificationEventType, string> = {
  work_order_created: '#0ea5e9',
  work_order_assigned: '#8b5cf6',
  work_order_started: '#06b6d4',
  work_order_completed: '#22c55e',
  sla_breach: '#ef4444',
  quote_sent: '#f59e0b',
  quote_accepted: '#10b981',
  payment_received: '#ec4899',
  task_assigned: '#6366f1',
  task_mention: '#a855f7',
  task_comment: '#0ea5e9',
  task_due_soon: '#f59e0b',
  event_invite: '#0ea5e9',
  event_reminder: '#22c55e',
  signup: '#a855f7',
  custom: '#64748b',
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  push: 'Push',
  email: 'E-posta',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const CHANNEL_COLOR: Record<NotificationChannel, string> = {
  push: '#0ea5e9',
  email: '#8b5cf6',
  sms: '#22c55e',
  whatsapp: '#10b981',
};

const CHANNEL_ICON: Record<NotificationChannel, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  push: 'notifications-outline',
  email: 'mail-outline',
  sms: 'chatbox-outline',
  whatsapp: 'logo-whatsapp',
};

export default function NotificationStatsScreen() {
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await listNotifications());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { byEvent, byChannel, unread, last7 } = useMemo(() => {
    const ev = new Map<NotificationEventType, number>();
    const ch = new Map<NotificationChannel, number>();
    let un = 0;
    const last7 = new Map<string, number>(); // YYYY-MM-DD -> count
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7.set(localDateISO(d), 0);
    }
    for (const n of rows) {
      ev.set(n.type, (ev.get(n.type) || 0) + 1);
      for (const c of n.channels || []) ch.set(c, (ch.get(c) || 0) + 1);
      if (!n.read) un++;
      const day = n.createdAt ? localDateISO(new Date(n.createdAt)) : '';
      if (last7.has(day)) last7.set(day, (last7.get(day) || 0) + 1);
    }
    return {
      byEvent: Array.from(ev.entries()).sort((a, b) => b[1] - a[1]),
      byChannel: Array.from(ch.entries()).sort((a, b) => b[1] - a[1]),
      unread: un,
      last7: Array.from(last7.entries()),
    };
  }, [rows]);

  const maxEvent = byEvent[0]?.[1] || 1;
  const maxCh = byChannel[0]?.[1] || 1;
  const max7 = Math.max(...last7.map(([, v]) => v), 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#f59e0b" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="bar-chart-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Bildirim İstatistik</Text>
            <Text style={styles.heroSub}>{rows.length} bildirim · {unread} okunmamış</Text>
          </View>
        </View>

        <Text style={styles.section}>Son 7 Gün</Text>
        <View style={styles.weekRow}>
          {last7.map(([day, v]) => {
            const d = new Date(day);
            const lbl = d.toLocaleDateString('tr-TR', { weekday: 'short' });
            return (
              <View key={day} style={styles.dayCol}>
                <View style={styles.dayBarWrap}>
                  <View style={[styles.dayBar, { height: `${Math.max((v / max7) * 100, 4)}%`, backgroundColor: v > 0 ? '#f59e0b' : colors.bg.primary }]} />
                </View>
                <Text style={styles.dayCount}>{v}</Text>
                <Text style={styles.dayLbl}>{lbl}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Olay Türü</Text>
        {byEvent.length === 0 ? <Text style={styles.empty}>Veri yok</Text> : byEvent.map(([t, v]) => (
          <View key={t} style={styles.barRow}>
            <View style={[styles.evDot, { backgroundColor: EVENT_COLOR[t] }]} />
            <Text style={styles.barLabel} numberOfLines={1}>{EVENT_LABEL[t]}</Text>
            <View style={styles.barFlex}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(v / maxEvent) * 100}%`, backgroundColor: EVENT_COLOR[t] }]} />
              </View>
            </View>
            <Text style={styles.barCount}>{v}</Text>
          </View>
        ))}

        <Text style={styles.section}>Kanal Dağılımı</Text>
        {byChannel.length === 0 ? <Text style={styles.empty}>Veri yok</Text> : byChannel.map(([c, v]) => (
          <View key={c} style={styles.barRow}>
            <View style={[styles.evDot, { backgroundColor: CHANNEL_COLOR[c] }]}>
              <Ionicons name={CHANNEL_ICON[c]} size={10} color="#fff" />
            </View>
            <Text style={styles.barLabel}>{CHANNEL_LABEL[c]}</Text>
            <View style={styles.barFlex}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(v / maxCh) * 100}%`, backgroundColor: CHANNEL_COLOR[c] }]} />
              </View>
            </View>
            <Text style={styles.barCount}>{v}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#f59e0b', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  section: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, padding: spacing.md, textAlign: 'center' },
  weekRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, height: 140 },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  dayBarWrap: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  dayBar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 3 },
  dayCount: { color: colors.text.primary, fontSize: 10, fontWeight: '800' },
  dayLbl: { color: colors.text.muted, fontSize: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  evDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  barLabel: { color: colors.text.primary, fontSize: typography.xs, width: 100 },
  barFlex: { flex: 1 },
  barTrack: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', minWidth: 32, textAlign: 'right' },
});
