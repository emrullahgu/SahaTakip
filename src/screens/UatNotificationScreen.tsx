// Faz 53 — UatNotificationScreen (POZ-DEV-241)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listUatNotifications } from '../services/uat';
import type { UatNotificationCheck } from '../types';

const CH_LABEL: Record<UatNotificationCheck['channel'], string> = { push: 'Push', email: 'E-posta', sms: 'SMS', whatsapp: 'WhatsApp' };
const CH_COLOR: Record<UatNotificationCheck['channel'], string> = { push: '#a855f7', email: '#0ea5e9', sms: '#f59e0b', whatsapp: '#22c55e' };
const CH_ICON: Record<UatNotificationCheck['channel'], string> = { push: 'notifications', email: 'mail', sms: 'chatbubble', whatsapp: 'logo-whatsapp' };

export default function UatNotificationScreen() {
  const [items, setItems] = useState<UatNotificationCheck[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listUatNotifications()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    delivered: items.filter(i => i.delivered).length,
    avgLatency: items.filter(i => i.delivered).reduce((a, b) => a + b.latencyMs, 0) / Math.max(1, items.filter(i => i.delivered).length),
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="notifications" size={48} color="#ec4899" />
          <Text style={s.heroT}>Bildirim Akışları</Text>
          <Text style={s.heroD}>{stats.delivered}/{stats.total} başarılı • ortalama {Math.round(stats.avgLatency)}ms</Text>
        </View>

        {items.map(n => (
          <View key={n.id} style={[s.card, { borderLeftColor: n.delivered ? '#22c55e' : '#ef4444' }]}>
            <View style={s.headRow}>
              <View style={[s.iconBox, { backgroundColor: CH_COLOR[n.channel] + '33' }]}>
                <Ionicons name={CH_ICON[n.channel] as any} size={20} color={CH_COLOR[n.channel]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.trigger}>{n.trigger}</Text>
                <Text style={s.channel}>{CH_LABEL[n.channel]} kanalı</Text>
              </View>
              <Ionicons name={n.delivered ? 'checkmark-circle' : 'close-circle'} size={22} color={n.delivered ? '#22c55e' : '#ef4444'} />
            </View>
            {n.delivered ? (
              <Text style={s.latency}>Gecikme: {n.latencyMs}ms</Text>
            ) : (
              <Text style={s.error}>{n.errorMessage ?? 'Teslim edilemedi'}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ec4899', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 38, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  trigger: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  channel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  latency: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
  error: { color: '#ef4444', fontSize: typography.xs, fontWeight: '700' },
});
