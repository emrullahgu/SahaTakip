// Faz 53 — UatReportScreen (POZ-DEV-242)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getUatReport, listUatBugs, UAT_SEV_COLOR, UAT_SEV_LABEL } from '../services/uat';
import type { UatReport, UatBug } from '../types';

const STATUS_LABEL: Record<UatBug['status'], string> = { open: 'Açık', fixed: 'Düzeltildi', wontfix: 'Yapılmayacak' };
const STATUS_COLOR: Record<UatBug['status'], string> = { open: '#ef4444', fixed: '#22c55e', wontfix: '#64748b' };

export default function UatReportScreen() {
  const [report, setReport] = useState<UatReport | null>(null);
  const [bugs, setBugs] = useState<UatBug[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [r, b] = await Promise.all([getUatReport(), listUatBugs()]);
      setReport(r);
      setBugs(b);
    })();
  }, []));

  if (!report) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.empty}><Ionicons name="hourglass" size={48} color={colors.text.muted} /><Text style={s.emptyT}>Yükleniyor…</Text></View></SafeAreaView>;
  }

  const sortedBugs = [...bugs].sort((a, b) => {
    const order: UatBug['severity'][] = ['critical', 'high', 'medium', 'low'];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="analytics" size={100} color="#8b5cf6" />
          <Text style={s.heroT}>Test Raporu</Text>
          <Text style={s.heroD}>Son çalıştırma: {new Date(report.lastRunAt).toLocaleString('tr-TR')}</Text>
        </View>

        <View style={s.kpiGrid}>
          <View style={[s.kpi, { borderColor: '#22c55e' }]}><Text style={[s.kpiV, { color: '#22c55e' }]}>%{report.passRate}</Text><Text style={s.kpiL}>Başarı</Text></View>
          <View style={[s.kpi, { borderColor: '#3b82f6' }]}><Text style={[s.kpiV, { color: '#3b82f6' }]}>{report.totalScenarios}</Text><Text style={s.kpiL}>Senaryo</Text></View>
          <View style={[s.kpi, { borderColor: '#22c55e' }]}><Text style={[s.kpiV, { color: '#22c55e' }]}>{report.passed}</Text><Text style={s.kpiL}>Geçti</Text></View>
          <View style={[s.kpi, { borderColor: '#ef4444' }]}><Text style={[s.kpiV, { color: '#ef4444' }]}>{report.failed}</Text><Text style={s.kpiL}>Hata</Text></View>
          <View style={[s.kpi, { borderColor: '#f59e0b' }]}><Text style={[s.kpiV, { color: '#f59e0b' }]}>{report.blocked}</Text><Text style={s.kpiL}>Bloklu</Text></View>
          <View style={[s.kpi, { borderColor: '#a855f7' }]}><Text style={[s.kpiV, { color: '#a855f7' }]}>%{report.testCoverage}</Text><Text style={s.kpiL}>Kapsam</Text></View>
          <View style={[s.kpi, { borderColor: '#ef4444' }]}><Text style={[s.kpiV, { color: '#ef4444' }]}>{report.criticalBugs}</Text><Text style={s.kpiL}>Kritik Bug</Text></View>
          <View style={[s.kpi, { borderColor: '#f59e0b' }]}><Text style={[s.kpiV, { color: '#f59e0b' }]}>{report.openBugs}</Text><Text style={s.kpiL}>Açık Bug</Text></View>
        </View>

        <Text style={s.sectionT}>Hata Önceliklendirme Listesi</Text>

        {sortedBugs.map(bug => (
          <View key={bug.id} style={[s.bugCard, { borderLeftColor: UAT_SEV_COLOR[bug.severity] }]}>
            <View style={s.headRow}>
              <View style={[s.pill, { backgroundColor: UAT_SEV_COLOR[bug.severity] + '33', borderColor: UAT_SEV_COLOR[bug.severity] }]}>
                <Ionicons name="flag" size={10} color={UAT_SEV_COLOR[bug.severity]} />
                <Text style={[s.pillT, { color: UAT_SEV_COLOR[bug.severity] }]}>{UAT_SEV_LABEL[bug.severity]}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: STATUS_COLOR[bug.status] + '33', borderColor: STATUS_COLOR[bug.status], marginLeft: 'auto' }]}>
                <Text style={[s.pillT, { color: STATUS_COLOR[bug.status] }]}>{STATUS_LABEL[bug.status]}</Text>
              </View>
            </View>
            <Text style={s.bugTitle}>{bug.title}</Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>{bug.module}</Text>
              <Text style={s.meta}>•</Text>
              <Text style={s.meta}>{bug.reportedBy}</Text>
              <Text style={s.meta}>•</Text>
              <Text style={s.meta}>{new Date(bug.reportedAt).toLocaleDateString('tr-TR')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  kpi: { width: '23.5%', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.bg.secondary, alignItems: 'center', gap: 4, marginBottom: spacing.sm, minHeight: 80, justifyContent: 'center' },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: 10, textAlign: 'center' },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  bugCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  bugTitle: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyT: { color: colors.text.muted },
});
