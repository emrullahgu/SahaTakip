// Faz 58 — AdvEcommerceScreen (POZ-DEV-285)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listEcomChannels, listEcomOrders, ECOM_STATUS_LABEL, ECOM_STATUS_COLOR } from '../services/advanced';
import type { AdvEcomChannel, AdvEcomOrder } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const STATUS_BG: Record<AdvEcomChannel['status'], string> = {
  connected: '#22c55e', pending: '#f59e0b', disconnected: '#64748b',
};
const STATUS_LBL: Record<AdvEcomChannel['status'], string> = {
  connected: 'Bağlı', pending: 'Bekliyor', disconnected: 'Pasif',
};

export default function AdvEcommerceScreen() {
  const [channels, setChannels] = useState<AdvEcomChannel[]>([]);
  const [orders, setOrders] = useState<AdvEcomOrder[]>([]);
  useFocusEffect(useCallback(() => {
    (async () => { setChannels(await listEcomChannels()); setOrders(await listEcomOrders()); })();
  }, []));

  const totalRevenue = channels.reduce((a, c) => a + c.revenueToday, 0);
  const totalOrders = channels.reduce((a, c) => a + c.ordersToday, 0);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.kpiRow}>
              <Kpi label="Toplam Kanal" value={channels.length.toString()} color="#0ea5e9" />
              <Kpi label="Bağlı" value={channels.filter(c => c.status === 'connected').length.toString()} color="#22c55e" />
              <Kpi label="Bugün Sipariş" value={totalOrders.toString()} color="#8b5cf6" />
              <Kpi label="Ciro" value={`₺${(totalRevenue / 1000).toFixed(1)}K`} color="#22c55e" />
            </View>

            <Text style={s.sectionT}>Kanallar</Text>
            {channels.map(c => (
              <View key={c.id} style={[s.card, { borderLeftColor: c.color, marginBottom: spacing.sm }]}>
                <View style={s.cardHead}>
                  <View style={[s.iconBox, { backgroundColor: c.color + '22' }]}>
                    <Ionicons name={c.logo as any} size={22} color={c.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardT}>{c.name}</Text>
                    <Text style={s.cardD}>{c.productsSynced} ürün senkron</Text>
                  </View>
                  <View style={[s.statusPill, { borderColor: STATUS_BG[c.status] }]}>
                    <Text style={[s.statusT, { color: STATUS_BG[c.status] }]}>{STATUS_LBL[c.status]}</Text>
                  </View>
                </View>
                <View style={s.metricsRow}>
                  <View style={s.metric}><Text style={s.metricV}>{c.ordersToday}</Text><Text style={s.metricL}>Sipariş</Text></View>
                  <View style={s.metric}><Text style={[s.metricV, { color: '#22c55e' }]}>₺{c.revenueToday.toLocaleString('tr-TR')}</Text><Text style={s.metricL}>Bugün Ciro</Text></View>
                </View>
              </View>
            ))}

            <Text style={s.sectionT}>Son Siparişler</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="cart-outline"
            title="Sipariş yok"
            subtitle="Pazaryeri entegrasyonlarından henüz sipariş gelmedi."
          />
        }
        renderItem={({ item: o }) => (
          <View style={[s.row, { borderLeftColor: ECOM_STATUS_COLOR[o.status], marginBottom: spacing.xs }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowT}>{o.customer}</Text>
              <Text style={s.rowD}>{o.channel} · {o.items} kalem · {o.at}</Text>
            </View>
            <Text style={s.rowAmount}>₺{o.amount.toLocaleString('tr-TR')}</Text>
            <View style={[s.miniPill, { backgroundColor: ECOM_STATUS_COLOR[o.status] + '22', borderColor: ECOM_STATUS_COLOR[o.status] }]}>
              <Text style={[s.miniT, { color: ECOM_STATUS_COLOR[o.status] }]}>{ECOM_STATUS_LABEL[o.status]}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Text style={[s.kpiV, { color }]}>{value}</Text>
      <Text style={s.kpiL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-around', backgroundColor: colors.bg.primary, padding: spacing.sm, borderRadius: radius.sm },
  metric: { alignItems: 'center' },
  metricV: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  metricL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  rowT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  rowD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  rowAmount: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  miniPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  miniT: { fontSize: typography.xs, fontWeight: '700' },
});
