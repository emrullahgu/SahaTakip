// Faz 47 — CostlyWorkOrdersScreen (POZ-DEV-175)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCostlyWorkOrders } from '../services/exec';
import type { CostlyWorkOrderEntry } from '../types';

const overrunColor = (o: number) => o >= 30 ? '#ef4444' : o >= 10 ? '#f59e0b' : '#22c55e';

export default function CostlyWorkOrdersScreen() {
  const [list, setList] = useState<CostlyWorkOrderEntry[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listCostlyWorkOrders()))(); }, []));

  const sorted = useMemo(() => [...list].sort((a, b) => b.totalCost - a.totalCost), [list]);
  const max = sorted[0]?.totalCost || 1;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>En maliyetli iş emirleri</Text>
        {sorted.map((w, i) => (
          <View key={w.workOrderId} style={s.card}>
            <View style={s.row}>
              <View style={s.rank}><Text style={s.rankT}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{w.title}</Text>
                <Text style={s.meta}>{w.customerName} · {w.durationHours}s</Text>
              </View>
              <View style={[s.overrunPill, { backgroundColor: overrunColor(w.overrunPct) + '33', borderColor: overrunColor(w.overrunPct) }]}>
                <Ionicons name={w.overrunPct >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={overrunColor(w.overrunPct)} />
                <Text style={[s.overrunT, { color: overrunColor(w.overrunPct) }]}>%{Math.abs(w.overrunPct)}</Text>
              </View>
            </View>
            <View style={s.barBg}>
              <View style={[s.barL, { flex: w.laborCost }]} />
              <View style={[s.barM, { flex: w.materialCost }]} />
              <View style={{ flex: Math.max(0, max - w.totalCost) }} />
            </View>
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statL}>Toplam</Text>
                <Text style={[s.statV, { color: '#ef4444' }]}>₺{w.totalCost.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statL}>İşçilik</Text>
                <Text style={[s.statV, { color: '#0ea5e9' }]}>₺{w.laborCost.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statL}>Malzeme</Text>
                <Text style={[s.statV, { color: '#a855f7' }]}>₺{w.materialCost.toLocaleString('tr-TR')}</Text>
              </View>
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
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  rankT: { color: '#fff', fontWeight: '900', fontSize: typography.sm },
  title: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  overrunPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  overrunT: { fontSize: typography.xs, fontWeight: '800' },
  barBg: { flexDirection: 'row', height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barL: { backgroundColor: '#0ea5e9' },
  barM: { backgroundColor: '#a855f7' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statL: { color: colors.text.muted, fontSize: typography.xs },
  statV: { fontSize: typography.sm, fontWeight: '800', marginTop: 2 },
});
