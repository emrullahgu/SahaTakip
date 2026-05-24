// Faz 47 — CeoSummaryScreen (POZ-DEV-171)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listKpis, getOpsHealth, getAiSummary, TREND_COLOR, TREND_ICON, AI_SEV_COLOR } from '../services/exec';
import type { ExecKpiCard, OpsHealthScoreSnapshot, AiExecSummary } from '../types';

const fmt = (v: number, u: string) => u === '₺' ? `₺${v.toLocaleString('tr-TR')}` : u === '%' ? `%${v.toFixed(1)}` : `${v.toLocaleString('tr-TR')} ${u}`;

export default function CeoSummaryScreen() {
  const [kpis, setKpis] = useState<ExecKpiCard[]>([]);
  const [health, setHealth] = useState<OpsHealthScoreSnapshot | null>(null);
  const [ai, setAi] = useState<AiExecSummary | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      setKpis(await listKpis());
      setHealth(await getOpsHealth());
      setAi(await getAiSummary());
    })();
  }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <Text style={s.cardT}>Bugün ({new Date().toLocaleDateString('tr-TR')})</Text>
          <Text style={s.headline}>{ai?.headline ?? '...'}</Text>
        </View>

        <Text style={s.section}>Anahtar Göstergeler</Text>
        <View style={s.kpiGrid}>
          {kpis.map(k => (
            <View key={k.key} style={[s.kpi, { borderColor: k.color }]}>
              <Text style={s.kpiL}>{k.label}</Text>
              <Text style={[s.kpiV, { color: k.color }]}>{fmt(k.value, k.unit)}</Text>
              <View style={s.row}>
                <Ionicons name={TREND_ICON[k.trend] as any} size={12} color={TREND_COLOR[k.trend]} />
                <Text style={[s.delta, { color: TREND_COLOR[k.trend] }]}>{k.deltaPct > 0 ? '+' : ''}{k.deltaPct.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </View>

        {health && (
          <View style={[s.card, { borderColor: '#22c55e' }]}>
            <View style={s.row}>
              <Ionicons name="pulse" size={20} color="#22c55e" />
              <Text style={[s.cardT, { marginLeft: 6 }]}>Operasyon Sağlık Skoru</Text>
            </View>
            <Text style={[s.bigV, { color: '#22c55e' }]}>{health.overall}/100</Text>
          </View>
        )}

        {ai && (
          <>
            <Text style={s.section}>Dikkat Edilmesi Gerekenler</Text>
            {ai.bullets.slice(0, 4).map(b => (
              <View key={b.id} style={[s.bullet, { borderLeftColor: AI_SEV_COLOR[b.severity] }]}>
                <Text style={[s.bulletCat, { color: AI_SEV_COLOR[b.severity] }]}>{b.category.toUpperCase()}</Text>
                <Text style={s.bulletT}>{b.text}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 4 },
  cardT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  headline: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', marginTop: 4 },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any, rowGap: spacing.sm },
  kpi: { width: '49%', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, gap: 4 },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delta: { fontSize: typography.xs, fontWeight: '700' },
  bigV: { fontSize: typography.xxl, fontWeight: '800' },
  bullet: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderLeftWidth: 4, gap: 2 },
  bulletCat: { fontSize: typography.xs, fontWeight: '800' },
  bulletT: { color: colors.text.primary, fontSize: typography.sm },
});
