// Faz 44 — TeamPerformanceLayerScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { TeamPerformanceStat } from '../types';
import { listPerf } from '../services/liveOps';

const scoreColor = (s: number) => s >= 90 ? '#22c55e' : s >= 80 ? '#0ea5e9' : s >= 70 ? '#f59e0b' : '#ef4444';

export default function TeamPerformanceLayerScreen() {
  const [items, setItems] = useState<TeamPerformanceStat[]>([]);
  const load = useCallback(async () => { setItems(await listPerf()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sorted = [...items].sort((a, b) => b.score - a.score);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item, index }) => {
          const c = scoreColor(item.score);
          return (
            <View style={[s.card, { borderLeftColor: c }]}>
              <View style={s.rank}>
                <Ionicons name="trophy" size={14} color={index === 0 ? '#eab308' : index === 1 ? '#94a3b8' : index === 2 ? '#a16207' : colors.text.muted} />
                <Text style={s.rankT}>#{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.teamName}</Text>
                <View style={s.metrics}>
                  <View style={s.m}><Text style={s.mV}>{item.jobsToday}</Text><Text style={s.mL}>iş</Text></View>
                  <View style={s.m}><Text style={[s.mV, { color: c }]}>{item.onTimeRate}%</Text><Text style={s.mL}>zamanında</Text></View>
                  <View style={s.m}><Text style={s.mV}>{item.avgKm.toFixed(1)}</Text><Text style={s.mL}>ort km</Text></View>
                </View>
                <View style={s.barBg}>
                  <View style={[s.barFg, { width: `${item.score}%`, backgroundColor: c }]} />
                </View>
              </View>
              <View style={[s.scoreBadge, { backgroundColor: c }]}>
                <Text style={s.scoreV}>{item.score}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  rank: { alignItems: 'center', minWidth: 32 },
  rankT: { color: colors.text.muted, fontSize: 10, fontWeight: '800' },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginVertical: 4 },
  m: { alignItems: 'flex-start' },
  mV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  mL: { color: colors.text.muted, fontSize: 10 },
  barBg: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  barFg: { height: 4, borderRadius: 2 },
  scoreBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  scoreV: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
});
