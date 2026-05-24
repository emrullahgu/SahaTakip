// WeeklyReportDetailScreen — POZ-DEV-250 Haftalık rapor detay
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, WeeklyReport } from '../types';
import { getWeeklyReport } from '../services/osos';

type R = RouteProp<RootStackParamList, 'WeeklyReportDetail'>;

export default function WeeklyReportDetailScreen() {
  const route = useRoute<R>();
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => { (async () => { setReport((await getWeeklyReport(route.params.reportId)) || null); })(); }, [route.params.reportId]);

  if (!report) return <SafeAreaView style={s.safe}><Text style={s.empty}>Rapor bulunamadı</Text></SafeAreaView>;

  const maxV = Math.max(report.totalImportKwh, report.totalExportKwh, 1);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="bar-chart-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Haftalık Rapor</Text>
            <Text style={s.heroS}>{report.weekStart.slice(0, 10)} — {report.weekEnd.slice(0, 10)}</Text>
          </View>
        </View>

        <View style={s.kpiRow}>
          <KPI label="Çekiş" value={`${report.totalImportKwh.toLocaleString('tr-TR')} kWh`} color="#ef4444" />
          <KPI label="Veriş" value={`${report.totalExportKwh.toLocaleString('tr-TR')} kWh`} color="#22c55e" />
          <KPI label="Demand" value={`${report.peakDemandKw.toFixed(1)} kW`} color="#f59e0b" />
        </View>

        <Text style={s.sectionTitle}>Karşılaştırma</Text>
        <BarRow label="Çekiş" value={report.totalImportKwh} max={maxV} color="#ef4444" />
        <BarRow label="Veriş" value={report.totalExportKwh} max={maxV} color="#22c55e" />

        <View style={s.infoBox}>
          <Info label="Peak Demand" value={`${report.peakDemandKw.toFixed(1)} kW`} />
          <Info label="Oluşturuldu" value={new Date(report.createdAt).toLocaleString('tr-TR')} />
          {report.customerId && <Info label="Müşteri" value={report.customerId} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color + '55', backgroundColor: color + '11' }]}>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.bar}><View style={[s.barFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} /></View>
      <Text style={s.barVal}>{value.toLocaleString('tr-TR')}</Text>
    </View>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (<View style={s.infoRow}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoVal}>{value}</Text></View>);
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.xl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#eab308', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 6 },
  kpi: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  kpiVal: { fontWeight: '800', fontSize: typography.md },
  kpiLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { color: colors.text.muted, fontSize: typography.xs, width: 60 },
  bar: { flex: 1, height: 10, backgroundColor: colors.bg.secondary, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10 },
  barVal: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs, width: 80, textAlign: 'right' },
  infoBox: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm },
  infoLabel: { color: colors.text.muted, fontSize: typography.xs },
  infoVal: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
});
