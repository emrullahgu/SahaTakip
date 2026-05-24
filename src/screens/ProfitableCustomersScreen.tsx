// Faz 47 — ProfitableCustomersScreen (POZ-DEV-174)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listProfitableCustomers } from '../services/exec';
import type { ProfitableCustomerEntry } from '../types';

const marginColor = (m: number) => m >= 30 ? '#22c55e' : m >= 20 ? '#f59e0b' : '#ef4444';

export default function ProfitableCustomersScreen() {
  const [list, setList] = useState<ProfitableCustomerEntry[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listProfitableCustomers()))(); }, []));

  const sorted = useMemo(() => [...list].sort((a, b) => b.profit - a.profit), [list]);
  const maxProfit = sorted[0]?.profit || 1;
  const total = useMemo(() => ({
    rev: list.reduce((s, c) => s + c.revenue, 0),
    prof: list.reduce((s, c) => s + c.profit, 0),
    jobs: list.reduce((s, c) => s + c.jobsCount, 0),
  }), [list]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.kpiRow}>
          <View style={[s.kpi, { borderColor: '#0ea5e9' }]}>
            <Text style={s.kpiV}>₺{(total.rev / 1000).toFixed(0)}K</Text>
            <Text style={s.kpiL}>Toplam Ciro</Text>
          </View>
          <View style={[s.kpi, { borderColor: '#22c55e' }]}>
            <Text style={[s.kpiV, { color: '#22c55e' }]}>₺{(total.prof / 1000).toFixed(0)}K</Text>
            <Text style={s.kpiL}>Toplam Kâr</Text>
          </View>
          <View style={[s.kpi, { borderColor: '#8b5cf6' }]}>
            <Text style={s.kpiV}>{total.jobs}</Text>
            <Text style={s.kpiL}>Toplam İş</Text>
          </View>
        </View>

        {sorted.map((c, i) => (
          <View key={c.customerId} style={s.card}>
            <View style={s.row}>
              <View style={s.rank}><Text style={s.rankT}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{c.customerName}</Text>
                <Text style={s.meta}>{c.jobsCount} iş · Ciro ₺{c.revenue.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.marginPill, { backgroundColor: marginColor(c.profitMargin) + '33', borderColor: marginColor(c.profitMargin) }]}>
                <Text style={[s.marginT, { color: marginColor(c.profitMargin) }]}>%{c.profitMargin.toFixed(1)}</Text>
              </View>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${(c.profit / maxProfit) * 100}%` }]} />
            </View>
            <View style={s.row2}>
              <Text style={s.profLbl}>Kâr</Text>
              <Text style={s.profV}>₺{c.profit.toLocaleString('tr-TR')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row2: { flexDirection: 'row', justifyContent: 'space-between' },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#facc15', alignItems: 'center', justifyContent: 'center' },
  rankT: { color: '#000', fontWeight: '900', fontSize: typography.base },
  name: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  marginPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  marginT: { fontSize: typography.sm, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#22c55e', borderRadius: 3 },
  profLbl: { color: colors.text.muted, fontSize: typography.xs },
  profV: { color: '#22c55e', fontSize: typography.base, fontWeight: '800' },
});
