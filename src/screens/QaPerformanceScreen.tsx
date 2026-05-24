// Faz 52 — QaPerformanceScreen (POZ-DEV-230)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaRender } from '../services/codeQuality';
import type { QaRenderMetric } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const TECH_LABEL: Record<NonNullable<QaRenderMetric['technique']>, string> = { memo: 'memo', callback: 'useCallback', virtualization: 'FlatList', splitting: 'split' };

function renderColor(ms: number): string {
  if (ms < 100) return '#22c55e';
  if (ms < 200) return '#f59e0b';
  return '#ef4444';
}

export default function QaPerformanceScreen() {
  const [items, setItems] = useState<QaRenderMetric[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listQaRender()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={r => r.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.heroCard}>
            <Ionicons name="speedometer" size={48} color="#ec4899" />
            <Text style={s.heroT}>Render Performansı</Text>
            <Text style={s.heroD}>Ortalama render süresi, re-render sayısı ve liste optimizasyonu</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="speedometer-outline"
            title="Ölçüm yok"
            subtitle="Henüz render performansı ölçüm verisi toplanmadı."
          />
        }
        renderItem={({ item: r }) => {
          const c = renderColor(r.avgRenderMs);
          return (
            <View key={r.id} style={[s.card, { borderLeftColor: c }]}>
              <View style={s.headRow}>
                <Text style={s.screen}>{r.screen}</Text>
                <Ionicons name={r.optimized ? 'checkmark-circle' : 'warning'} size={18} color={r.optimized ? '#22c55e' : '#f59e0b'} />
              </View>
              <View style={s.statsRow}>
                <View style={[s.statBox, { borderColor: c }]}><Text style={[s.statV, { color: c }]}>{r.avgRenderMs}ms</Text><Text style={s.statL}>Render</Text></View>
                <View style={s.statBox}><Text style={s.statV}>{r.rerenders}</Text><Text style={s.statL}>Re-render</Text></View>
                <View style={s.statBox}><Text style={s.statV}>{r.listSize}</Text><Text style={s.statL}>Liste</Text></View>
              </View>
              {r.technique && (
                <View style={s.techRow}>
                  <Ionicons name="flash" size={12} color="#a855f7" />
                  <Text style={s.tech}>Teknik: {TECH_LABEL[r.technique as keyof typeof TECH_LABEL]}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ec4899', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  screen: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', flex: 1 },
  statsRow: { flexDirection: 'row', gap: 6 },
  statBox: { flex: 1, backgroundColor: colors.bg.primary, paddingVertical: 6, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  statV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tech: { color: '#a855f7', fontSize: typography.xs, fontWeight: '700' },
});
