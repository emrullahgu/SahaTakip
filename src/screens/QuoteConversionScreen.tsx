// Faz 47 — QuoteConversionScreen (POZ-DEV-179)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQuoteConversion } from '../services/exec';
import type { QuoteConversionEntry } from '../types';

const convColor = (c: number) => c >= 60 ? '#22c55e' : c >= 50 ? '#f59e0b' : '#ef4444';

export default function QuoteConversionScreen() {
  const [list, setList] = useState<QuoteConversionEntry[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listQuoteConversion()))(); }, []));

  const avg = useMemo(() => list.length ? list.reduce((s, q) => s + q.conversionPct, 0) / list.length : 0, [list]);
  const totalSent = list.reduce((s, q) => s + q.sent, 0);
  const totalAcc = list.reduce((s, q) => s + q.accepted, 0);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.kpiRow}>
          <View style={[s.kpi, { borderColor: convColor(avg) }]}>
            <Text style={[s.kpiV, { color: convColor(avg) }]}>%{avg.toFixed(1)}</Text>
            <Text style={s.kpiL}>Ortalama Dönüşüm</Text>
          </View>
          <View style={[s.kpi, { borderColor: '#0ea5e9' }]}>
            <Text style={s.kpiV}>{totalSent}</Text>
            <Text style={s.kpiL}>Gönderilen</Text>
          </View>
          <View style={[s.kpi, { borderColor: '#22c55e' }]}>
            <Text style={[s.kpiV, { color: '#22c55e' }]}>{totalAcc}</Text>
            <Text style={s.kpiL}>Kabul</Text>
          </View>
        </View>

        <Text style={s.section}>Aylık dönüşüm trendi</Text>
        {list.map(q => (
          <View key={q.period} style={s.card}>
            <View style={s.row}>
              <Text style={s.period}>{q.period}</Text>
              <Text style={[s.convV, { color: convColor(q.conversionPct) }]}>%{q.conversionPct.toFixed(1)}</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.segAcc, { flex: q.accepted }]} />
              <View style={[s.segRej, { flex: q.rejected }]} />
              <View style={[s.segPen, { flex: q.pending }]} />
            </View>
            <View style={s.statsRow}>
              <Text style={s.statT}><Text style={{ color: '#22c55e' }}>●</Text> Kabul: {q.accepted}</Text>
              <Text style={s.statT}><Text style={{ color: '#ef4444' }}>●</Text> Red: {q.rejected}</Text>
              <Text style={s.statT}><Text style={{ color: '#f59e0b' }}>●</Text> Bekleyen: {q.pending}</Text>
            </View>
            <Text style={s.daysT}>Ortalama kapanış: {q.avgClosureDays.toFixed(1)} gün</Text>
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
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  convV: { fontSize: typography.lg, fontWeight: '800' },
  barBg: { flexDirection: 'row', height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  segAcc: { backgroundColor: '#22c55e' },
  segRej: { backgroundColor: '#ef4444' },
  segPen: { backgroundColor: '#f59e0b' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statT: { color: colors.text.muted, fontSize: typography.xs },
  daysT: { color: colors.text.faint, fontSize: typography.xs },
});
