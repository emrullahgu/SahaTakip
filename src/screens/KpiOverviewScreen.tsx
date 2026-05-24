// KpiOverviewScreen — POZ-DEV-171 Canlı KPI özeti (dönem seçilebilir)
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { ReportPeriod } from '../types';
import { useAppContext } from '../context/AppContext';
import { computeKpi, rangeFor } from '../services/reports';

const PERIODS: { kind: ReportPeriod; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { kind: 'daily',   label: 'Günlük',   icon: 'today-outline',         color: '#0ea5e9' },
  { kind: 'weekly',  label: 'Haftalık', icon: 'calendar-outline',      color: '#8b5cf6' },
  { kind: 'monthly', label: 'Aylık',    icon: 'calendar-clear-outline', color: '#10b981' },
];

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
const trDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; } };

export default function KpiOverviewScreen() {
  const { workOrders, quotes, customers } = useAppContext();
  const [period, setPeriod] = useState<ReportPeriod>('daily');

  const { kpi, byStatus, byEngineer, startDate, endDate } = useMemo(() => {
    const { startDate, endDate } = rangeFor(period);
    const b = computeKpi(period, startDate, endDate, workOrders, quotes, customers);
    return { ...b, startDate, endDate };
  }, [period, workOrders, quotes, customers]);

  const acceptRate = kpi.quotesCreated > 0 ? (kpi.quotesAccepted / kpi.quotesCreated) * 100 : 0;
  const completionRate = kpi.workOrdersTotal > 0 ? (kpi.workOrdersCompleted / kpi.workOrdersTotal) * 100 : 0;
  const maxStatus = byStatus[0]?.value || 1;
  const maxEng = byEngineer[0]?.value || 1;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="pulse-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>KPI Özeti</Text>
            <Text style={styles.heroSub}>{trDate(startDate)} → {trDate(endDate)}</Text>
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

        <View style={styles.kpiGrid}>
          <Kpi label="İş Emri" value={String(kpi.workOrdersTotal)} sub={`${kpi.workOrdersCompleted} tamam · ${kpi.workOrdersOpen} açık`} color="#0ea5e9" icon="briefcase-outline" />
          <Kpi label="Ciro" value={TL(kpi.revenue)} sub={`Kâr: ${TL(kpi.profit)}`} color="#22c55e" icon="cash-outline" />
          <Kpi label="Maliyet" value={TL(kpi.cost)} sub="İşçilik + malz + diğer" color="#f59e0b" icon="wallet-outline" />
          <Kpi label="Teklif" value={String(kpi.quotesCreated)} sub={`${kpi.quotesAccepted} kabul · %${Math.round(acceptRate)}`} color="#8b5cf6" icon="document-text-outline" />
          <Kpi label="Müşteri" value={String(kpi.customersTouched)} sub="Aktif müşteri sayısı" color="#ec4899" icon="people-outline" />
          <Kpi label="SLA İhlal" value={String(kpi.slaBreaches)} sub={kpi.slaBreaches > 0 ? 'Dikkat!' : 'Temiz'} color={kpi.slaBreaches > 0 ? '#ef4444' : '#22c55e'} icon="time-outline" />
        </View>

        <View style={styles.rateCard}>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Tamamlama Oranı</Text>
            <Text style={[styles.rateValue, { color: '#22c55e' }]}>%{Math.round(completionRate)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${completionRate}%`, backgroundColor: '#22c55e' }]} />
          </View>
          <View style={[styles.rateRow, { marginTop: spacing.sm }]}>
            <Text style={styles.rateLabel}>Teklif Kabul Oranı</Text>
            <Text style={[styles.rateValue, { color: '#8b5cf6' }]}>%{Math.round(acceptRate)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${acceptRate}%`, backgroundColor: '#8b5cf6' }]} />
          </View>
        </View>

        <Text style={styles.section}>Durum Dağılımı</Text>
        {byStatus.length === 0 ? (
          <Text style={styles.empty}>Veri yok</Text>
        ) : byStatus.map(b => (
          <View key={b.label} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{b.label}</Text>
            <View style={styles.barFlex}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(b.value / maxStatus) * 100}%`, backgroundColor: statusColor(b.label) }]} />
              </View>
            </View>
            <Text style={styles.barCount}>{b.value}</Text>
          </View>
        ))}

        <Text style={styles.section}>Personel Performansı (Ciro)</Text>
        {byEngineer.length === 0 ? (
          <Text style={styles.empty}>Veri yok</Text>
        ) : byEngineer.slice(0, 8).map(b => (
          <View key={b.label} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{b.label}</Text>
            <View style={styles.barFlex}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(b.value / maxEng) * 100}%`, backgroundColor: '#0ea5e9' }]} />
              </View>
            </View>
            <Text style={styles.barCount}>{TL(b.value)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.kpi, { borderLeftColor: color }]}>
      <View style={styles.kpiTop}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case 'Tamamlandı': return '#22c55e';
    case 'İptal': return '#ef4444';
    case 'Devam Ediyor': return '#0ea5e9';
    case 'Planlandı': return '#8b5cf6';
    case 'Beklemede': return '#f59e0b';
    default: return '#64748b';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#8b5cf6', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: spacing.xs },
  periodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  periodText: { fontSize: typography.xs, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  kpi: { width: '48.5%', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, borderLeftWidth: 4 },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  kpiValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: 4 },
  kpiSub: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  rateCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginTop: spacing.sm },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rateValue: { fontWeight: '800', fontSize: typography.md },
  section: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, padding: spacing.md, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 4 },
  barLabel: { color: colors.text.primary, fontSize: typography.xs, width: 120 },
  barFlex: { flex: 1 },
  barTrack: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', minWidth: 50, textAlign: 'right' },
});
