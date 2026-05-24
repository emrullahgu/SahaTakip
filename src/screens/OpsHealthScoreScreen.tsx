// Faz 47 — OpsHealthScoreScreen (POZ-DEV-172)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getOpsHealth, TREND_COLOR, TREND_ICON } from '../services/exec';
import type { OpsHealthScoreSnapshot } from '../types';

const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

export default function OpsHealthScoreScreen() {
  const [d, setD] = useState<OpsHealthScoreSnapshot | null>(null);
  useFocusEffect(useCallback(() => { (async () => setD(await getOpsHealth()))(); }, []));

  if (!d) return <SafeAreaView style={s.safe} />;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.heroCard, { borderColor: scoreColor(d.overall) }]}>
          <Text style={s.heroL}>Genel Operasyon Sağlığı</Text>
          <Text style={[s.heroV, { color: scoreColor(d.overall) }]}>{d.overall}<Text style={s.heroSlash}>/100</Text></Text>
          <Text style={s.heroD}>Son güncelleme: {new Date(d.date).toLocaleDateString('tr-TR')}</Text>
        </View>

        <Text style={s.section}>Boyutlar</Text>
        {d.dimensions.map(dim => (
          <View key={dim.name} style={s.dimCard}>
            <View style={s.dimHeader}>
              <Text style={s.dimName}>{dim.name}</Text>
              <View style={s.row}>
                <Ionicons name={TREND_ICON[dim.trend] as any} size={14} color={TREND_COLOR[dim.trend]} />
                <Text style={[s.dimScore, { color: scoreColor(dim.score) }]}>{dim.score}</Text>
                <Text style={s.dimWeight}>(%{dim.weight})</Text>
              </View>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${dim.score}%`, backgroundColor: scoreColor(dim.score) }]} />
            </View>
          </View>
        ))}

        <Text style={s.section}>İçgörüler</Text>
        {d.insights.map((ins, i) => (
          <View key={i} style={s.insight}>
            <Ionicons name="bulb" size={16} color="#facc15" />
            <Text style={s.insightT}>{ins}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.lg, borderRadius: radius.md, borderWidth: 2, alignItems: 'center' },
  heroL: { color: colors.text.muted, fontSize: typography.sm },
  heroV: { fontSize: 56, fontWeight: '900' },
  heroSlash: { color: colors.text.muted, fontSize: typography.lg, fontWeight: '700' },
  heroD: { color: colors.text.faint, fontSize: typography.xs },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  dimCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  dimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dimName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dimScore: { fontSize: typography.lg, fontWeight: '800' },
  dimWeight: { color: colors.text.faint, fontSize: typography.xs },
  barBg: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: '#facc15' },
  insightT: { color: colors.text.primary, fontSize: typography.sm, flex: 1 },
});
