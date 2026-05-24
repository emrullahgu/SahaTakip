// WorkOrderCostDashboardScreen — POZ-DEV-127 Maliyet & kâr panosu
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, WorkOrder } from '../types';
import { useAppContext } from '../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

export default function WorkOrderCostDashboardScreen() {
  const nav = useNavigation<Nav>();
  const { workOrders } = useAppContext();

  const stats = useMemo(() => {
    let revenue = 0;
    let material = 0;
    let labor = 0;
    let other = 0;
    let profit = 0;
    workOrders.forEach(w => {
      revenue += w.quoteAmount || 0;
      material += w.materialCost || 0;
      labor += w.laborCost || 0;
      other += w.otherCost || 0;
      profit += w.profit || 0;
    });
    const cost = material + labor + other;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, material, labor, other, profit, margin };
  }, [workOrders]);

  const topProfit = useMemo(
    () => [...workOrders].sort((a, b) => (b.profit || 0) - (a.profit || 0)).slice(0, 5),
    [workOrders],
  );
  const topLoss = useMemo(
    () => [...workOrders].filter(w => (w.profit || 0) < 0).sort((a, b) => (a.profit || 0) - (b.profit || 0)).slice(0, 5),
    [workOrders],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="cash-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Maliyet & Kâr Panosu</Text>
            <Text style={styles.heroSub}>Tüm iş emirleri toplamı</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard label="Toplam Ciro" value={TL(stats.revenue)} color="#0ea5e9" icon="trending-up-outline" />
          <StatCard label="Toplam Maliyet" value={TL(stats.cost)} color="#f59e0b" icon="cube-outline" />
          <StatCard label="Net Kâr" value={TL(stats.profit)} color={stats.profit >= 0 ? '#22c55e' : '#ef4444'} icon="wallet-outline" />
          <StatCard label="Marj" value={`${stats.margin.toFixed(1)}%`} color="#8b5cf6" icon="pie-chart-outline" />
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Maliyet Dağılımı</Text>
          <BreakdownRow label="Malzeme" value={stats.material} total={stats.cost} color="#0ea5e9" />
          <BreakdownRow label="İşçilik" value={stats.labor} total={stats.cost} color="#22c55e" />
          <BreakdownRow label="Diğer" value={stats.other} total={stats.cost} color="#f59e0b" />
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>En Kârlı 5 İş Emri</Text>
          {topProfit.length === 0 ? (
            <Text style={styles.empty}>Kayıt yok</Text>
          ) : topProfit.map(w => (
            <Row key={w.id} w={w} onPress={() => nav.navigate('WorkOrderDetail', { workOrderId: w.id })} />
          ))}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Zarar Edenler</Text>
          {topLoss.length === 0 ? (
            <Text style={styles.empty}>Zarar eden iş emri yok</Text>
          ) : topLoss.map(w => (
            <Row key={w.id} w={w} onPress={() => nav.navigate('WorkOrderDetail', { workOrderId: w.id })} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BreakdownRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownHead}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <Text style={styles.breakdownValue}>{TL(value)} ({pct.toFixed(0)}%)</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Row({ w, onPress }: { w: WorkOrder; onPress: () => void }) {
  const positive = (w.profit || 0) >= 0;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{w.serviceName}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{w.client}</Text>
      </View>
      <Text style={[styles.rowProfit, { color: positive ? '#22c55e' : '#ef4444' }]}>
        {positive ? '+' : ''}{TL(w.profit || 0)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#16a34a', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flexGrow: 1, flexBasis: 140, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  statIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  statLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  breakdownCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  cardTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginBottom: spacing.xs },
  breakdownRow: { gap: 4 },
  breakdownHead: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { color: colors.text.muted, fontSize: typography.xs },
  breakdownValue: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  barTrack: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  listCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  rowTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  rowProfit: { fontWeight: '800', fontSize: typography.sm },
  empty: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', padding: spacing.md },
});
