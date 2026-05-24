// Faz 55 — GoLiveMonthlyScreen (POZ-DEV-259)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getGoLiveMonthly } from '../services/goLive';
import type { GoLiveMonthlyReport } from '../types';

export default function GoLiveMonthlyScreen() {
  const [r, setR] = useState<GoLiveMonthlyReport | null>(null);
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;
  useFocusEffect(useCallback(() => { (async () => setR(await getGoLiveMonthly()))(); }, []));
  if (!r) return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.empty}><Ionicons name="hourglass" size={48} color={colors.text.muted} /></View></SafeAreaView>;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="analytics" size={48} color="#ec4899" />
          <Text style={s.heroT}>İlk Ay Performans Analizi</Text>
          <Text style={s.heroD}>Dönem: {r.month}</Text>
        </View>
        <View style={s.grid}>
          <Kpi w={tileW} l="Günlük Aktif (Ort.)" v={r.avgDailyActive.toString()} c="#3b82f6" />
          <Kpi w={tileW} l="P95 Yanıt" v={`${r.p95LatencyMs}ms`} c="#06b6d4" />
          <Kpi w={tileW} l="Crash-Free" v={`%${r.crashFreeRate}`} c="#22c55e" />
          <Kpi w={tileW} l="NPS" v={r.npsScore.toString()} c="#ec4899" />
          <Kpi w={tileW} l="7g Tutma" v={`%${r.retention7d}`} c="#a855f7" />
          <Kpi w={tileW} l="30g Tutma" v={`%${r.retention30d}`} c="#f59e0b" />
        </View>
        <View style={s.costCard}>
          <Ionicons name="cash" size={20} color="#10b981" />
          <Text style={s.costT}>Maliyet Notu</Text>
          <Text style={s.costD}>{r.costNote}</Text>
        </View>
        <Text style={s.sectionT}>Öneriler</Text>
        {r.recommendations.map((rec, i) => (
          <View key={i} style={s.bulletRow}>
            <View style={s.numBox}><Text style={s.num}>{i + 1}</Text></View>
            <Text style={s.bullet}>{rec}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ w, l, v, c }: { w: string; l: string; v: string; c: string }) {
  return (
    <View style={[s.kpi, { width: w as any, borderColor: c }]}>
      <Text style={s.kpiL}>{l}</Text>
      <Text style={[s.kpiV, { color: c }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ec4899', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  kpi: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, marginBottom: spacing.sm, gap: 4 },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  costCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#10b981', gap: 6 },
  costT: { color: '#10b981', fontSize: typography.sm, fontWeight: '800' },
  costD: { color: colors.text.primary, fontSize: typography.xs, lineHeight: 18 },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  numBox: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ec4899', justifyContent: 'center', alignItems: 'center' },
  num: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bullet: { flex: 1, color: colors.text.primary, fontSize: typography.xs, lineHeight: 18 },
});
