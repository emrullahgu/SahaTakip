// Faz 52 — QaReportScreen (POZ-DEV-232)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getQaKpi } from '../services/codeQuality';
import type { QaQualityKpi } from '../types';

type KpiTile = { label: string; value: string; icon: string; color: string };

export default function QaReportScreen() {
  const [kpi, setKpi] = useState<QaQualityKpi | null>(null);
  useFocusEffect(useCallback(() => { (async () => setKpi(await getQaKpi()))(); }, []));

  if (!kpi) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.empty}><Ionicons name="hourglass" size={48} color={colors.text.muted} /><Text style={s.emptyT}>Yükleniyor…</Text></View></SafeAreaView>;
  }

  const tiles: KpiTile[] = [
    { label: 'Toplam Dosya', value: kpi.totalFiles.toString(), icon: 'documents', color: '#0ea5e9' },
    { label: 'Toplam Satır', value: kpi.totalLines.toLocaleString('tr-TR'), icon: 'list', color: '#3b82f6' },
    { label: 'any Kullanımı', value: kpi.anyUsages.toString(), icon: 'warning', color: '#f59e0b' },
    { label: 'Console Sorunu', value: kpi.consoleIssues.toString(), icon: 'terminal', color: '#ef4444' },
    { label: 'Kullanılmayan', value: kpi.unusedFiles.toString(), icon: 'trash', color: '#a855f7' },
    { label: 'Mükerrer Comp.', value: kpi.duplicateComponents.toString(), icon: 'copy', color: '#ec4899' },
    { label: 'Test Kapsamı', value: `%${kpi.testCoverage}`, icon: 'checkmark-done', color: '#22c55e' },
    { label: 'Lint Uyarı', value: kpi.lintWarnings.toString(), icon: 'alert-circle', color: '#f59e0b' },
    { label: 'Build Süresi', value: `${kpi.buildTimeSec}s`, icon: 'timer', color: '#06b6d4' },
    { label: 'Bundle', value: `${kpi.bundleSizeMb} MB`, icon: 'cube', color: '#10b981' },
    { label: 'Teknik Borç', value: `${kpi.techDebtHours}sa`, icon: 'construct', color: '#a855f7' },
    { label: 'Son Audit', value: new Date(kpi.lastAuditAt).toLocaleDateString('tr-TR'), icon: 'calendar', color: '#64748b' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="analytics" size={100} color="#8b5cf6" />
          <Text style={s.heroT}>Kalite Raporu</Text>
          <Text style={s.heroD}>Son denetim: {new Date(kpi.lastAuditAt).toLocaleDateString('tr-TR')}</Text>
        </View>

        <View style={s.grid}>
          {tiles.map((t, i) => (
            <View key={i} style={[s.tile, { borderColor: t.color }]}>
              <Ionicons name={t.icon as any} size={24} color={t.color} />
              <Text style={[s.tileV, { color: t.color }]}>{t.value}</Text>
              <Text style={s.tileL}>{t.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  tile: { width: '32%', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.bg.secondary, alignItems: 'center', gap: 4, marginBottom: spacing.sm, minHeight: 100, justifyContent: 'center' },
  tileV: { fontSize: typography.md, fontWeight: '800' },
  tileL: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyT: { color: colors.text.muted },
});
