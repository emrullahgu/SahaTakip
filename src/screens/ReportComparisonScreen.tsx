// ReportComparisonScreen — POZ-DEV-172 Cari dönem vs önceki dönem karşılaştırma
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { ReportPeriod } from '../types';
import { useAppContext } from '../context/AppContext';
import { computeKpi, rangeFor } from '../services/reports';

const PERIODS: { kind: ReportPeriod; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { kind: 'daily',   label: 'Günlük',   icon: 'today-outline',          color: '#0ea5e9' },
  { kind: 'weekly',  label: 'Haftalık', icon: 'calendar-outline',       color: '#8b5cf6' },
  { kind: 'monthly', label: 'Aylık',    icon: 'calendar-clear-outline', color: '#10b981' },
];

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
const trDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; } };

function previousAnchor(period: ReportPeriod, anchor: Date): Date {
  const a = new Date(anchor);
  if (period === 'daily')   a.setDate(a.getDate() - 1);
  if (period === 'weekly')  a.setDate(a.getDate() - 7);
  if (period === 'monthly') a.setMonth(a.getMonth() - 1);
  return a;
}

export default function ReportComparisonScreen() {
  const { workOrders, quotes, customers } = useAppContext();
  const [period, setPeriod] = useState<ReportPeriod>('weekly');

  const data = useMemo(() => {
    const now = new Date();
    const cur = rangeFor(period, now);
    const prevAnchor = previousAnchor(period, now);
    const prev = rangeFor(period, prevAnchor);
    const curK = computeKpi(period, cur.startDate, cur.endDate, workOrders, quotes, customers).kpi;
    const prevK = computeKpi(period, prev.startDate, prev.endDate, workOrders, quotes, customers).kpi;
    return { cur, prev, curK, prevK };
  }, [period, workOrders, quotes, customers]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="git-compare-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Dönem Karşılaştırma</Text>
            <Text style={styles.heroSub}>Cari vs önceki dönem</Text>
          </View>
        </View>

        <View style={styles.periodRow}>
          {PERIODS.map(p => {
            const on = p.kind === period;
            return (
              <TouchableOpacity
                key={p.kind}
                style={[styles.periodBtn, on && { backgroundColor: p.color, borderColor: p.color }]}
                onPress={() => setPeriod(p.kind)}
                activeOpacity={0.85}
              >
                <Ionicons name={p.icon} size={14} color={on ? '#fff' : p.color} />
                <Text style={[styles.periodText, { color: on ? '#fff' : p.color }]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.rangeBox}>
          <View style={styles.rangeCol}>
            <Text style={styles.rangeLabel}>Cari</Text>
            <Text style={styles.rangeValue}>{trDate(data.cur.startDate)} → {trDate(data.cur.endDate)}</Text>
          </View>
          <View style={styles.rangeCol}>
            <Text style={styles.rangeLabel}>Önceki</Text>
            <Text style={styles.rangeValue}>{trDate(data.prev.startDate)} → {trDate(data.prev.endDate)}</Text>
          </View>
        </View>

        <CompareRow label="İş Emri" cur={data.curK.workOrdersTotal} prev={data.prevK.workOrdersTotal} icon="briefcase-outline" higherIsBetter />
        <CompareRow label="Tamamlanan" cur={data.curK.workOrdersCompleted} prev={data.prevK.workOrdersCompleted} icon="checkmark-circle-outline" higherIsBetter />
        <CompareRow label="Ciro" cur={data.curK.revenue} prev={data.prevK.revenue} icon="cash-outline" higherIsBetter format="tl" />
        <CompareRow label="Maliyet" cur={data.curK.cost} prev={data.prevK.cost} icon="wallet-outline" higherIsBetter={false} format="tl" />
        <CompareRow label="Kâr" cur={data.curK.profit} prev={data.prevK.profit} icon="trending-up-outline" higherIsBetter format="tl" />
        <CompareRow label="Teklif Üretilen" cur={data.curK.quotesCreated} prev={data.prevK.quotesCreated} icon="document-text-outline" higherIsBetter />
        <CompareRow label="Teklif Kabul" cur={data.curK.quotesAccepted} prev={data.prevK.quotesAccepted} icon="thumbs-up-outline" higherIsBetter />
        <CompareRow label="Müşteri" cur={data.curK.customersTouched} prev={data.prevK.customersTouched} icon="people-outline" higherIsBetter />
        <CompareRow label="SLA İhlal" cur={data.curK.slaBreaches} prev={data.prevK.slaBreaches} icon="time-outline" higherIsBetter={false} />
        <CompareRow label="İşçilik (saat)" cur={data.curK.laborMinutes / 60} prev={data.prevK.laborMinutes / 60} icon="hourglass-outline" higherIsBetter={false} format="hour" />
      </ScrollView>
    </SafeAreaView>
  );
}

function CompareRow({ label, cur, prev, icon, higherIsBetter, format }: {
  label: string;
  cur: number;
  prev: number;
  icon: keyof typeof Ionicons.glyphMap;
  higherIsBetter: boolean;
  format?: 'tl' | 'hour';
}) {
  const delta = cur - prev;
  const pct = prev !== 0 ? (delta / Math.abs(prev)) * 100 : (cur !== 0 ? 100 : 0);
  const good = higherIsBetter ? delta >= 0 : delta <= 0;
  const color = delta === 0 ? '#64748b' : good ? '#22c55e' : '#ef4444';
  const arrow: keyof typeof Ionicons.glyphMap = delta === 0 ? 'remove-outline' : delta > 0 ? 'arrow-up-outline' : 'arrow-down-outline';
  const fmt = (n: number) => format === 'tl' ? TL(n) : format === 'hour' ? `${n.toFixed(1)} sa` : `${Math.round(n).toLocaleString('tr-TR')}`;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: color + '22', borderColor: color }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowValues}>
          <Text style={styles.rowPrev}>{fmt(prev)}</Text>
          <Ionicons name="arrow-forward-outline" size={12} color={colors.text.faint} />
          <Text style={styles.rowCur}>{fmt(cur)}</Text>
        </View>
      </View>
      <View style={[styles.deltaBox, { backgroundColor: color }]}>
        <Ionicons name={arrow} size={12} color="#fff" />
        <Text style={styles.deltaText}>%{Math.abs(pct).toFixed(0)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.xs },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#ec4899', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  periodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  periodText: { fontSize: typography.xs, fontWeight: '700' },
  rangeBox: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  rangeCol: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  rangeLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  rangeValue: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rowLabel: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowValues: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rowPrev: { color: colors.text.faint, fontSize: typography.xs },
  rowCur: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  deltaBox: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.sm, minWidth: 70, justifyContent: 'center' },
  deltaText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
