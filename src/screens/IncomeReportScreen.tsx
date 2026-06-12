// IncomeReportScreen — POZ-DEV-185 Dönemsel gelir analizi
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { localDateISO } from '../utils/date';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { Payment, PaymentMethod, PaymentStatus } from '../types';
import { listPayments, PAYMENT_METHODS, PAYMENT_STATUS_LABEL } from '../services/payments';
import { useHasRole } from '../components/RoleGuard';

type Period = 'daily' | 'weekly' | 'monthly';

const STATUS_COLOR: Record<PaymentStatus, string> = {
  received: '#22c55e',
  pending: '#f59e0b',
  cancelled: '#64748b',
  refunded: '#ef4444',
};

const METHOD_COLOR: Record<PaymentMethod, string> = {
  cash: '#22c55e',
  card: '#0ea5e9',
  transfer: '#8b5cf6',
  check: '#f59e0b',
  other: '#64748b',
};

function rangeFor(period: Period): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  if (period === 'daily') start.setHours(0, 0, 0, 0);
  else if (period === 'weekly') start.setDate(start.getDate() - 6);
  else start.setMonth(start.getMonth() - 1);
  return { start, end };
}

export default function IncomeReportScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) return null;
  return <IncomeReportScreenInner />;
}

function IncomeReportScreenInner() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await listPayments()); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { totalReceived, totalPending, byMethod, byStatus, days, count } = useMemo(() => {
    const { start, end } = rangeFor(period);
    const inRange = rows.filter(p => {
      const t = new Date(p.receivedAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    const tRecv = inRange.filter(p => p.status === 'received').reduce((s, p) => s + p.amount, 0);
    const tPend = inRange.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

    const m = new Map<PaymentMethod, number>();
    for (const p of inRange.filter(x => x.status === 'received')) m.set(p.method, (m.get(p.method) || 0) + p.amount);

    const s = new Map<PaymentStatus, number>();
    for (const p of inRange) s.set(p.status, (s.get(p.status) || 0) + p.amount);

    // Gün bazlı
    const dayMap = new Map<string, number>();
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      dayMap.set(localDateISO(cursor), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const p of inRange.filter(x => x.status === 'received')) {
      const k = p.receivedAt ? localDateISO(new Date(p.receivedAt)) : '';
      if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) || 0) + p.amount);
    }

    return {
      totalReceived: tRecv,
      totalPending: tPend,
      byMethod: Array.from(m.entries()).sort((a, b) => b[1] - a[1]),
      byStatus: Array.from(s.entries()).sort((a, b) => b[1] - a[1]),
      days: Array.from(dayMap.entries()),
      count: inRange.length,
    };
  }, [rows, period]);

  const maxMethod = byMethod[0]?.[1] || 1;
  const maxStatus = byStatus[0]?.[1] || 1;
  const maxDay = Math.max(...days.map(([, v]) => v), 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#f59e0b" /></View>
      </SafeAreaView>
    );
  }

  const periods: { kind: Period; label: string }[] = [
    { kind: 'daily', label: 'Günlük' },
    { kind: 'weekly', label: 'Haftalık' },
    { kind: 'monthly', label: 'Aylık' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="trending-up-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Gelir Raporu</Text>
            <Text style={styles.heroSub}>₺{totalReceived.toLocaleString('tr-TR')} · {count} kayıt</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {periods.map(p => (
            <TouchableOpacity
              key={p.kind}
              style={[styles.tab, period === p.kind && styles.tabActive]}
              onPress={() => setPeriod(p.kind)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, period === p.kind && styles.tabTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpi, { borderColor: '#22c55e' }]}>
            <Text style={styles.kpiLabel}>Tahsil Edilen</Text>
            <Text style={[styles.kpiValue, { color: '#22c55e' }]}>₺{totalReceived.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={[styles.kpi, { borderColor: '#f59e0b' }]}>
            <Text style={styles.kpiLabel}>Bekleyen</Text>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>₺{totalPending.toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        <Text style={styles.section}>Günlük Tahsilat</Text>
        <View style={styles.weekRow}>
          {days.map(([day, v]) => {
            const d = new Date(day);
            return (
              <View key={day} style={styles.dayCol}>
                <View style={styles.dayBarWrap}>
                  <View style={[styles.dayBar, { height: `${Math.max((v / maxDay) * 100, 4)}%`, backgroundColor: v > 0 ? '#22c55e' : colors.bg.primary }]} />
                </View>
                <Text style={styles.dayLbl}>{d.getDate()}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Ödeme Yöntemi</Text>
        {byMethod.length === 0 ? <Text style={styles.empty}>Veri yok</Text> : byMethod.map(([m, v]) => {
          const meta = PAYMENT_METHODS.find(x => x.value === m);
          return (
            <View key={m} style={styles.barRow}>
              <View style={[styles.evDot, { backgroundColor: METHOD_COLOR[m] }]} />
              <Text style={styles.barLabel}>{meta?.label || m}</Text>
              <View style={styles.barFlex}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(v / maxMethod) * 100}%`, backgroundColor: METHOD_COLOR[m] }]} />
                </View>
              </View>
              <Text style={styles.barCount}>₺{v.toLocaleString('tr-TR')}</Text>
            </View>
          );
        })}

        <Text style={styles.section}>Durum Dağılımı</Text>
        {byStatus.length === 0 ? <Text style={styles.empty}>Veri yok</Text> : byStatus.map(([s, v]) => (
          <View key={s} style={styles.barRow}>
            <View style={[styles.evDot, { backgroundColor: STATUS_COLOR[s] }]} />
            <Text style={styles.barLabel}>{PAYMENT_STATUS_LABEL[s]}</Text>
            <View style={styles.barFlex}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(v / maxStatus) * 100}%`, backgroundColor: STATUS_COLOR[s] }]} />
              </View>
            </View>
            <Text style={styles.barCount}>₺{v.toLocaleString('tr-TR')}</Text>
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
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#f59e0b', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  tabActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  tabText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderRadius: radius.md },
  kpiLabel: { color: colors.text.muted, fontSize: typography.xs },
  kpiValue: { fontSize: typography.md, fontWeight: '900', marginTop: 4 },
  section: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, padding: spacing.md, textAlign: 'center' },
  weekRow: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, height: 120 },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  dayBarWrap: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  dayBar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2, minHeight: 3 },
  dayLbl: { color: colors.text.muted, fontSize: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  evDot: { width: 14, height: 14, borderRadius: 7 },
  barLabel: { color: colors.text.primary, fontSize: typography.xs, width: 90 },
  barFlex: { flex: 1 },
  barTrack: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', minWidth: 70, textAlign: 'right' },
});
