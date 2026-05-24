// Faz 47 — StockTurnoverScreen (POZ-DEV-178)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listStockTurnover, TREND_COLOR, TREND_ICON } from '../services/exec';
import type { StockTurnoverEntry } from '../types';

const turnColor = (t: number) => t >= 15 ? '#22c55e' : t >= 8 ? '#0ea5e9' : t >= 5 ? '#f59e0b' : '#ef4444';

export default function StockTurnoverScreen() {
  const [list, setList] = useState<StockTurnoverEntry[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listStockTurnover()))(); }, []));

  const sorted = useMemo(() => [...list].sort((a, b) => b.turnoverPerYear - a.turnoverPerYear), [list]);
  const max = sorted[0]?.turnoverPerYear || 1;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>Stok devir hızı (yıllık)</Text>
        <Text style={s.subt}>Yüksek değer = hızlı satılan / dönen ürün</Text>
        {sorted.map(p => (
          <View key={p.productId} style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{p.productName}</Text>
                <Text style={s.meta}>{p.category} · Stok: {p.stockOnHand}</Text>
              </View>
              <Ionicons name={TREND_ICON[p.trend] as any} size={16} color={TREND_COLOR[p.trend]} />
              <View style={[s.turnPill, { borderColor: turnColor(p.turnoverPerYear) }]}>
                <Text style={[s.turnV, { color: turnColor(p.turnoverPerYear) }]}>{p.turnoverPerYear.toFixed(1)}x</Text>
              </View>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${(p.turnoverPerYear / max) * 100}%`, backgroundColor: turnColor(p.turnoverPerYear) }]} />
            </View>
            <Text style={s.daysT}>Ortalama elde tutma: {p.daysOnHand} gün</Text>
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
  subt: { color: colors.text.faint, fontSize: typography.xs },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  turnPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  turnV: { fontSize: typography.base, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  daysT: { color: colors.text.muted, fontSize: typography.xs },
});
