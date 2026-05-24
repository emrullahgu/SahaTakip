// ExecutiveDashboardScreen — POZ-DEV-431
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { KpiCard, KpiDirection } from '../types';
import { listKpiCards, resetKpis, KPI_CATEGORY_LABEL, KPI_CATEGORY_COLOR } from '../services/bi';

function trendColor(direction: KpiDirection, trendPct?: number): string {
  if (!trendPct) return colors.text.muted;
  if (direction === 'neutral') return '#0ea5e9';
  const good = direction === 'up_is_good' ? trendPct > 0 : trendPct < 0;
  return good ? '#22c55e' : '#ef4444';
}

export default function ExecutiveDashboardScreen() {
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const [filter, setFilter] = useState<KpiCard['category'] | 'all'>('all');
  const [kpis, setKpis] = useState<KpiCard[]>([]);

  const load = useCallback(async () => { setKpis(await listKpiCards()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? kpis : kpis.filter(k => k.category === filter), [filter, kpis]);
  const cats: Array<KpiCard['category'] | 'all'> = ['all', 'finance', 'operations', 'sales', 'fleet', 'hr', 'customer'];

  const reset = async () => { await resetKpis(); load(); };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <View style={s.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {cats.map(c => (
                <TouchableOpacity key={c} onPress={() => setFilter(c)} style={[s.chip, filter === c && s.chipOn]}>
                  <Text style={[s.chipT, filter === c && s.chipTOn]}>{c === 'all' ? 'Tümü' : KPI_CATEGORY_LABEL[c]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={reset} style={s.reset}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[s.grid, { gap: spacing.sm }]}>
          {filtered.map(k => {
            const ratio = k.target ? Math.min(1, k.value / k.target) : 0;
            return (
              <View key={k.id} style={[s.card, { width: cols === 1 ? '100%' : `${100 / cols - 1}%`, borderLeftColor: KPI_CATEGORY_COLOR[k.category] }]}>
                <Text style={s.label}>{k.label}</Text>
                <Text style={[s.value, { color: KPI_CATEGORY_COLOR[k.category] }]}>{k.value.toLocaleString('tr-TR')}{k.unit ? ` ${k.unit}` : ''}</Text>
                {k.trendPct !== undefined && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={k.trendPct >= 0 ? 'trending-up' : 'trending-down'} size={14} color={trendColor(k.direction, k.trendPct)} />
                    <Text style={[s.trend, { color: trendColor(k.direction, k.trendPct) }]}>%{Math.abs(k.trendPct)}</Text>
                  </View>
                )}
                {k.target && (
                  <View style={{ marginTop: 6 }}>
                    <View style={s.barBg}>
                      <View style={[s.barFg, { width: `${ratio * 100}%`, backgroundColor: KPI_CATEGORY_COLOR[k.category] }]} />
                    </View>
                    <Text style={s.tgt}>Hedef: {k.target.toLocaleString('tr-TR')}{k.unit ? ` ${k.unit}` : ''}</Text>
                  </View>
                )}
                <Text style={s.cat}>{KPI_CATEGORY_LABEL[k.category]}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  value: { fontSize: typography.xxl, fontWeight: '800', marginVertical: 4 },
  trend: { fontSize: typography.xs, fontWeight: '700' },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFg: { height: '100%', borderRadius: 3 },
  tgt: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  cat: { color: colors.text.faint, fontSize: 10, marginTop: 6, textTransform: 'uppercase', fontWeight: '700' },
});
