// Faz 56 — CovSummaryScreen (POZ-DEV-263)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getCovSummary, listCovCategories, COV_STATUS_COLOR, COV_STATUS_LABEL } from '../services/coverage';
import type { CovSummary, CovCategory, CovStatus } from '../types';
import EmptyState from '../components/EmptyState';

export default function CovSummaryScreen() {
  const [sum, setSum] = useState<CovSummary | null>(null);
  const [cats, setCats] = useState<CovCategory[]>([]);
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;
  useFocusEffect(useCallback(() => { (async () => { setSum(await getCovSummary()); setCats(await listCovCategories()); })(); }, []));
  if (!sum) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <EmptyState icon="speedometer-outline" title="Yükleniyor…" subtitle="Kapsam analizi verileri hazırlanıyor." />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="speedometer" size={48} color="#10b981" />
          <Text style={s.heroT}>Kapsam Özeti</Text>
          <Text style={s.heroD}>23 kategori, {sum.totalItems} özellik</Text>
          <Text style={s.coverageBig}>%{sum.coveragePercent}</Text>
          <Text style={s.coverageL}>Genel kapsam (Tamamlandı + 0.5 × Kısmen)</Text>
        </View>
        <View style={s.grid}>
          <Kpi w={tileW} l="Tamamlandı" v={sum.doneCount} c="#22c55e" />
          <Kpi w={tileW} l="Kısmen" v={sum.partialCount} c="#f59e0b" />
          <Kpi w={tileW} l="Planlandı" v={sum.plannedCount} c="#3b82f6" />
          <Kpi w={tileW} l="Eksik" v={sum.missingCount} c="#ef4444" />
        </View>
        <Text style={s.sectionT}>Kategoriler — Hızlı Bakış</Text>
        {cats.map(c => {
          const counts: Record<CovStatus, number> = { done: 0, partial: 0, planned: 0, missing: 0 };
          c.items.forEach(it => { counts[it.status]++; });
          const total = c.items.length;
          const score = total ? Math.round(((counts.done + counts.partial * 0.5) / total) * 100) : 0;
          return (
            <View key={c.id} style={s.row}>
              <Ionicons name={c.icon as any} size={20} color="#6366f1" />
              <Text style={s.rowT} numberOfLines={1}>{c.no}. {c.title}</Text>
              <Text style={[s.rowPct, { color: score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444' }]}>%{score}</Text>
              <View style={s.barWrap}>
                {(['done', 'partial', 'planned', 'missing'] as CovStatus[]).map(st => (
                  counts[st] > 0 && (
                    <View key={st} style={[s.barSeg, { backgroundColor: COV_STATUS_COLOR[st], flex: counts[st] }]} />
                  )
                ))}
              </View>
            </View>
          );
        })}
        <View style={s.legendBox}>
          {(['done', 'partial', 'planned', 'missing'] as CovStatus[]).map(st => (
            <View key={st} style={s.legendRow}>
              <View style={[s.legendDot, { backgroundColor: COV_STATUS_COLOR[st] }]} />
              <Text style={s.legendT}>{COV_STATUS_LABEL[st]}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ w, l, v, c }: { w: string; l: string; v: number; c: string }) {
  return (
    <View style={[s.kpi, { width: w as any, borderColor: c }]}>
      <Text style={[s.kpiV, { color: c }]}>{v}</Text>
      <Text style={s.kpiL}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#10b981', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  coverageBig: { color: '#10b981', fontSize: 48, fontWeight: '900', marginTop: 4 },
  coverageL: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  kpi: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, marginBottom: spacing.sm, alignItems: 'center' },
  kpiV: { fontSize: typography.xl, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  rowT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', flex: 1 },
  rowPct: { fontSize: typography.xs, fontWeight: '800', width: 44, textAlign: 'right' },
  barWrap: { flexDirection: 'row', width: 80, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.bg.primary },
  barSeg: { height: 8 },
  legendBox: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, marginTop: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
});
