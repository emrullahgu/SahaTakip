// ReportDetailScreen — POZ-DEV-066, 067
// Rapor detayı: KPI kartları + barlar + PDF/CSV paylaşımı.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { getReport } from '../services/reports';
import { generateAndShareReportPdf } from '../services/reportPdf';
import { buildCsv, shareCsv } from '../services/csvExport';
import MiniBarChart from '../components/MiniBarChart';
import { Report, RootStackParamList } from '../types';

type Rt = RouteProp<RootStackParamList, 'ReportDetail'>;

const fmtMoney = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;
const fmtHours = (m: number) => `${(m / 60).toFixed(1)} sa`;

export default function ReportDetailScreen() {
  const route = useRoute<Rt>();
  const { reportId } = route.params;
  const [r, setR] = useState<Report | null>(null);

  const load = useCallback(async () => {
    setR(await getReport(reportId));
  }, [reportId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!r) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.text.muted, padding: spacing.lg }}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  const sharePdf = async () => {
    try {
      await generateAndShareReportPdf(r);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'PDF oluşturulamadı.');
    }
  };

  const shareXlsx = async () => {
    try {
      const k = r.kpi;
      const rows: (string | number)[][] = [
        ['Rapor', `${r.period} ${r.startDate} → ${r.endDate}`],
        [],
        ['KPI', 'Değer'],
        ['Toplam İş', k.workOrdersTotal],
        ['Tamamlanan', k.workOrdersCompleted],
        ['Açık', k.workOrdersOpen],
        ['İptal', k.workOrdersCancelled],
        ['Ciro (₺)', k.revenue],
        ['Maliyet (₺)', k.cost],
        ['Kâr (₺)', k.profit],
        ['İşçilik (dk)', k.laborMinutes],
        ['Müşteri Sayısı', k.customersTouched],
        ['Teklif Açıldı', k.quotesCreated],
        ['Teklif Kabul', k.quotesAccepted],
        ['SLA İhlali', k.slaBreaches],
        [],
        ['Durum', 'Adet'],
        ...r.byStatus.map(b => [b.label, b.value] as (string | number)[]),
        [],
        ['Personel', 'Ciro (₺)'],
        ...r.byEngineer.map(b => [b.label, b.value] as (string | number)[]),
        [],
        ['Müşteri', 'Ciro (₺)'],
        ...r.byCustomer.map(b => [b.label, b.value] as (string | number)[]),
      ];
      const csv = buildCsv(rows);
      await shareCsv(`rapor_${r.period}_${r.startDate}`, csv);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'CSV oluşturulamadı.');
    }
  };

  const k = r.kpi;
  const profitColor = k.profit >= 0 ? brand.green : colors.rose.default;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {r.period === 'daily' ? 'Günlük' : r.period === 'weekly' ? 'Haftalık' : 'Aylık'} Rapor
        </Text>
        <Text style={styles.sub}>
          {r.startDate}
          {r.startDate !== r.endDate ? ` → ${r.endDate}` : ''} · {new Date(r.generatedAt).toLocaleString('tr-TR')}
        </Text>

        <View style={styles.exportRow}>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#dc2626' }]} onPress={sharePdf}>
            <Ionicons name="document-text-outline" size={16} color="#fff" />
            <Text style={styles.exportText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#16a34a' }]} onPress={shareXlsx}>
            <Ionicons name="grid-outline" size={16} color="#fff" />
            <Text style={styles.exportText}>CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiGrid}>
          <Kpi label="Toplam İş" value={String(k.workOrdersTotal)} />
          <Kpi label="Tamamlanan" value={String(k.workOrdersCompleted)} color={brand.green} />
          <Kpi label="Açık" value={String(k.workOrdersOpen)} color="#0ea5e9" />
          <Kpi label="İptal" value={String(k.workOrdersCancelled)} color={colors.rose.default} />
          <Kpi label="Ciro" value={fmtMoney(k.revenue)} color={brand.blueLight} />
          <Kpi label="Maliyet" value={fmtMoney(k.cost)} color="#f59e0b" />
          <Kpi label="Kâr" value={fmtMoney(k.profit)} color={profitColor} />
          <Kpi label="İşçilik" value={fmtHours(k.laborMinutes)} />
          <Kpi label="Müşteri" value={String(k.customersTouched)} />
          <Kpi label="Teklif" value={`${k.quotesAccepted}/${k.quotesCreated}`} />
          <Kpi label="SLA İhlali" value={String(k.slaBreaches)} color={k.slaBreaches > 0 ? colors.rose.default : undefined} />
        </View>

        <Text style={styles.section}>Durum Dağılımı</Text>
        <MiniBarChart data={r.byStatus} barColor="#0ea5e9" />

        <Text style={styles.section}>Saha Personeli Cirosu</Text>
        <MiniBarChart
          data={r.byEngineer}
          barColor={brand.green}
          formatValue={fmtMoney}
        />

        <Text style={styles.section}>Müşteri Cirosu (İlk 10)</Text>
        <MiniBarChart
          data={r.byCustomer}
          barColor="#8b5cf6"
          formatValue={fmtMoney}
        />
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
  exportRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  exportText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
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
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
