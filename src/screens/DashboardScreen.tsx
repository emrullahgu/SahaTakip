// DashboardScreen — POZ-DEV-068, 069
// Canlı KPI kartları + son 7 günün iş adedi + durum dağılımı.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { localDateISO } from '../utils/date';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { computeKpi, rangeFor, listSlaItems } from '../services/reports';
import MiniBarChart from '../components/MiniBarChart';
import AppHeader from '../components/AppHeader';
import { RootStackParamList, ReportBucket } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const fmtMoney = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { workOrders, quotes, customers } = useAppContext();

  const today = useMemo(() => {
    const { startDate, endDate } = rangeFor('daily');
    return computeKpi('daily', startDate, endDate, workOrders, quotes, customers);
  }, [workOrders, quotes, customers]);

  const month = useMemo(() => {
    const { startDate, endDate } = rangeFor('monthly');
    return computeKpi('monthly', startDate, endDate, workOrders, quotes, customers);
  }, [workOrders, quotes, customers]);

  const last7: ReportBucket[] = useMemo(() => {
    const now = new Date();
    const days: ReportBucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const iso = localDateISO(d); // yerel gün anahtarı (UTC kayması yok; w.date ile tutarlı)
      const count = workOrders.filter(w => (w.date ?? '').slice(0, 10) === iso).length;
      days.push({
        label: d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
        value: count,
      });
    }
    return days;
  }, [workOrders]);

  const slaCount = useMemo(() => listSlaItems(workOrders).length, [workOrders]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Yönetici Dashboard</Text>
        <Text style={styles.sub}>Canlı veriler (yerel)</Text>

        <Text style={styles.section}>Bugün</Text>
        <View style={styles.kpiGrid}>
          <Kpi label="Toplam İş" value={String(today.kpi.workOrdersTotal)} />
          <Kpi label="Tamamlanan" value={String(today.kpi.workOrdersCompleted)} color={brand.green} />
          <Kpi label="Açık" value={String(today.kpi.workOrdersOpen)} color="#0ea5e9" />
          <Kpi label="Ciro" value={fmtMoney(today.kpi.revenue)} color={brand.blueLight} />
          <Kpi label="Kâr" value={fmtMoney(today.kpi.profit)} color={today.kpi.profit >= 0 ? brand.green : colors.rose.default} />
          <Kpi
            label="SLA İhlali"
            value={String(slaCount)}
            color={slaCount > 0 ? colors.rose.default : undefined}
          />
        </View>

        <TouchableOpacity style={styles.slaBtn} onPress={() => navigation.navigate('Sla')}>
          <Ionicons name="alarm-outline" size={16} color="#fff" />
          <Text style={styles.slaText}>Geciken İşleri Aç ({slaCount})</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Bu Ay</Text>
        <View style={styles.kpiGrid}>
          <Kpi label="Toplam İş" value={String(month.kpi.workOrdersTotal)} />
          <Kpi label="Ciro" value={fmtMoney(month.kpi.revenue)} color={brand.blueLight} />
          <Kpi label="Maliyet" value={fmtMoney(month.kpi.cost)} color="#f59e0b" />
          <Kpi
            label="Kâr"
            value={fmtMoney(month.kpi.profit)}
            color={month.kpi.profit >= 0 ? brand.green : colors.rose.default}
          />
          <Kpi label="Müşteri" value={String(month.kpi.customersTouched)} />
          <Kpi
            label="Teklif"
            value={`${month.kpi.quotesAccepted}/${month.kpi.quotesCreated}`}
          />
        </View>

        <Text style={styles.section}>Son 7 Gün — İş Adedi</Text>
        <MiniBarChart data={last7} barColor="#0ea5e9" maxRows={7} />

        <Text style={styles.section}>Bu Ay Durum Dağılımı</Text>
        <MiniBarChart data={month.byStatus} barColor="#8b5cf6" />

        <Text style={styles.section}>Bu Ay Personel Cirosu</Text>
        <MiniBarChart
          data={month.byEngineer}
          barColor={brand.green}
          formatValue={fmtMoney}
        />

        <TouchableOpacity
          style={styles.openReportsBtn}
          onPress={() => navigation.navigate('Reports')}
        >
          <Ionicons name="document-text-outline" size={16} color={brand.blueLight} />
          <Text style={styles.openReportsText}>Tüm Raporlar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kpi: {
    width: '32%',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  kpiLabel: { color: colors.text.muted, fontSize: 10 },
  kpiValue: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: 2,
  },
  slaBtn: {
    flexDirection: 'row',
    backgroundColor: colors.rose.default,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  slaText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  openReportsBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: brand.blueLight,
    backgroundColor: colors.indigo.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  openReportsText: { color: brand.blueLight, fontWeight: '800', fontSize: typography.xs },
});
