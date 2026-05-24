// BudgetVsActualScreen — POZ-DEV-441
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { BudgetVsActualRow } from '../types';
import { listBudgetVsActual, resetBudgetVsActual } from '../services/bi';

export default function BudgetVsActualScreen() {
  const [items, setItems] = useState<BudgetVsActualRow[]>([]);
  const load = useCallback(async () => { setItems(await listBudgetVsActual()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totals = useMemo(() => ({
    planned: items.reduce((a, b) => a + b.planned, 0),
    actual: items.reduce((a, b) => a + b.actual, 0),
  }), [items]);
  const variance = totals.actual - totals.planned;
  const variancePct = totals.planned ? Math.round(variance / totals.planned * 100) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Bütçe vs Fiili</Text>
        <TouchableOpacity onPress={async () => { await resetBudgetVsActual(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={s.hero}>
        <View style={s.heroCol}>
          <Text style={s.heroL}>Planlanan</Text>
          <Text style={[s.heroV, { color: '#0ea5e9' }]}>₺{totals.planned.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={s.heroCol}>
          <Text style={s.heroL}>Fiili</Text>
          <Text style={[s.heroV, { color: variance > 0 ? '#ef4444' : '#22c55e' }]}>₺{totals.actual.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={s.heroCol}>
          <Text style={s.heroL}>Sapma</Text>
          <Text style={[s.heroV, { color: variance > 0 ? '#ef4444' : '#22c55e' }]}>{variance > 0 ? '+' : ''}{variancePct}%</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const over = item.actual > item.planned;
          const ratio = item.planned ? item.actual / item.planned : 0;
          return (
            <View style={[s.card, { borderLeftColor: over ? '#ef4444' : '#22c55e' }]}>
              <View style={s.row}>
                <Text style={s.cat}>{item.category}</Text>
                <Text style={s.period}>{item.period}</Text>
              </View>
              <View style={s.grid}>
                <Text style={s.l}>Plan ₺{item.planned.toLocaleString('tr-TR')}</Text>
                <Text style={s.l}>Fiili ₺{item.actual.toLocaleString('tr-TR')}</Text>
                <Text style={[s.l, { color: over ? '#ef4444' : '#22c55e', fontWeight: '700' }]}>
                  {over ? '+' : ''}₺{(item.actual - item.planned).toLocaleString('tr-TR')}
                </Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFg, { width: `${Math.min(100, ratio * 100)}%`, backgroundColor: over ? '#ef4444' : '#22c55e' }]} />
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', backgroundColor: colors.bg.secondary, marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.sm },
  heroCol: { flex: 1, alignItems: 'center' },
  heroL: { color: colors.text.muted, fontSize: typography.xs },
  heroV: { fontSize: typography.md, fontWeight: '800', marginTop: 4 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cat: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  period: { color: colors.text.muted, fontSize: typography.xs },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  l: { color: colors.text.muted, fontSize: typography.xs },
  barBg: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, overflow: 'hidden' },
  barFg: { height: '100%' },
});
