// AnomaliesScreen — POZ-DEV-094
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { listPayments } from '../services/payments';
import {
  detectAnomalies, ANOMALY_KIND_LABEL, ANOMALY_KIND_ICON,
  ANOMALY_SEVERITY_COLOR, ANOMALY_SEVERITY_LABEL,
} from '../services/anomalies';
import { Anomaly, AnomalySeverity, Payment } from '../types';
import { useHasRole } from '../components/RoleGuard';

type KindFilter = 'all' | Anomaly['kind'];

const KINDS: KindFilter[] = ['all', 'wo_overdue', 'wo_long_duration', 'payment_late', 'employee_inactive', 'quote_stale', 'cost_spike'];

export default function AnomaliesScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) return null;
  return <AnomaliesScreenInner />;
}

function AnomaliesScreenInner() {
  const { workOrders, employees, quotes } = useAppContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<KindFilter>('all');

  const refresh = useCallback(async () => {
    setPayments(await listPayments());
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const all = useMemo(() => detectAnomalies({
    workOrders, payments, employees,
    // Quote type is loose — cast through unknown to satisfy detector
    quotes: quotes as unknown as Parameters<typeof detectAnomalies>[0]['quotes'],
  }), [workOrders, payments, employees, quotes]);

  const filtered = useMemo(() => filter === 'all' ? all : all.filter(a => a.kind === filter), [all, filter]);

  const stats = useMemo(() => {
    const by: Record<AnomalySeverity, number> = { low: 0, medium: 0, high: 0 };
    for (const a of all) by[a.severity]++;
    return by;
  }, [all]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <SumCard label="Toplam" value={all.length} color={brand.green} />
          <SumCard label="Yüksek" value={stats.high} color={ANOMALY_SEVERITY_COLOR.high} />
          <SumCard label="Orta" value={stats.medium} color={ANOMALY_SEVERITY_COLOR.medium} />
          <SumCard label="Düşük" value={stats.low} color={ANOMALY_SEVERITY_COLOR.low} />
        </View>

        <View style={styles.chipsScroll}>
          {KINDS.map(k => {
            const active = filter === k;
            return (
              <TouchableOpacity key={k} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(k)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {k === 'all' ? 'Tümü' : ANOMALY_KIND_LABEL[k]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={brand.green} />
            <Text style={styles.emptyText}>Anomali bulunamadı.</Text>
            <Text style={styles.emptySub}>Sistem normal sınırlarda çalışıyor.</Text>
          </View>
        ) : filtered.map(a => (
          <View key={a.id} style={styles.card}>
            <View style={styles.iconCol}>
              <View style={[styles.iconBox, { backgroundColor: ANOMALY_SEVERITY_COLOR[a.severity] + '22' }]}>
                <Ionicons name={ANOMALY_KIND_ICON[a.kind] as keyof typeof Ionicons.glyphMap} size={20} color={ANOMALY_SEVERITY_COLOR[a.severity]} />
              </View>
              <Text style={[styles.scoreText, { color: ANOMALY_SEVERITY_COLOR[a.severity] }]}>{a.score.toFixed(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.title} numberOfLines={2}>{a.title}</Text>
                <View style={[styles.sevPill, { backgroundColor: ANOMALY_SEVERITY_COLOR[a.severity] }]}>
                  <Text style={styles.sevText}>{ANOMALY_SEVERITY_LABEL[a.severity]}</Text>
                </View>
              </View>
              <Text style={styles.desc}>{a.description}</Text>
              <Text style={styles.kindLabel}>{ANOMALY_KIND_LABEL[a.kind]}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SumCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.sumCard, { borderColor: color + '55', backgroundColor: color + '12' }]}>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  summary: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  sumCard: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  sumValue: { fontSize: typography.lg, fontWeight: '800' },
  sumLabel: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  chipsScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary, marginRight: 6 },
  chipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  chipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', gap: 12, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  iconCol: { alignItems: 'center', gap: 4 },
  iconBox: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 11, fontWeight: '800' },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, lineHeight: 18 },
  sevPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sevText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, lineHeight: 16 },
  kindLabel: { color: colors.text.faint, fontSize: 10, marginTop: 4, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  emptySub: { color: colors.text.muted, fontSize: typography.xs },
});
