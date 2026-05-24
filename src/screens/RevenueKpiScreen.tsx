// Faz 47 — RevenueKpiScreen (POZ-DEV-173)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listKpis, TREND_COLOR, TREND_ICON } from '../services/exec';
import type { ExecKpiCard } from '../types';

const fmt = (v: number, u: string) => u === '₺' ? `₺${v.toLocaleString('tr-TR')}` : u === '%' ? `%${v.toFixed(1)}` : `${v.toLocaleString('tr-TR')} ${u}`;

export default function RevenueKpiScreen() {
  const [kpis, setKpis] = useState<ExecKpiCard[]>([]);
  useFocusEffect(useCallback(() => { (async () => setKpis(await listKpis()))(); }, []));

  const profit = kpis.find(k => k.key === 'profit')?.value ?? 0;
  const cost = kpis.find(k => k.key === 'cost')?.value ?? 0;
  const total = profit + cost;
  const profitPct = total ? (profit / total) * 100 : 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>Gelir, Maliyet & Kârlılık</Text>
        {kpis.map(k => (
          <View key={k.key} style={[s.card, { borderLeftColor: k.color }]}>
            <View style={s.row}>
              <Text style={s.label}>{k.label}</Text>
              <View style={s.row}>
                <Ionicons name={TREND_ICON[k.trend] as any} size={14} color={TREND_COLOR[k.trend]} />
                <Text style={[s.delta, { color: TREND_COLOR[k.trend] }]}>{k.deltaPct > 0 ? '+' : ''}{k.deltaPct.toFixed(1)}%</Text>
              </View>
            </View>
            <Text style={[s.value, { color: k.color }]}>{fmt(k.value, k.unit)}</Text>
          </View>
        ))}

        <Text style={s.section}>Kâr / Maliyet Dağılımı</Text>
        <View style={s.card}>
          <View style={s.barRow}>
            <View style={[s.barProfit, { flex: profitPct }]}>
              <Text style={s.barT}>Kâr %{profitPct.toFixed(0)}</Text>
            </View>
            <View style={[s.barCost, { flex: 100 - profitPct }]}>
              <Text style={s.barT}>Maliyet %{(100 - profitPct).toFixed(0)}</Text>
            </View>
          </View>
          <View style={s.legendRow}>
            <View style={s.legend}><View style={[s.dot, { backgroundColor: '#22c55e' }]} /><Text style={s.legendT}>Kâr: ₺{profit.toLocaleString('tr-TR')}</Text></View>
            <View style={s.legend}><View style={[s.dot, { backgroundColor: '#ef4444' }]} /><Text style={s.legendT}>Maliyet: ₺{cost.toLocaleString('tr-TR')}</Text></View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  label: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  delta: { fontSize: typography.sm, fontWeight: '700' },
  value: { fontSize: typography.xxl, fontWeight: '800' },
  barRow: { flexDirection: 'row', height: 32, borderRadius: radius.sm, overflow: 'hidden', marginTop: spacing.sm },
  barProfit: { backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  barCost: { backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  barT: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  legendRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendT: { color: colors.text.muted, fontSize: typography.xs },
});
