// Faz 42 — FieldPerformanceScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldPerformance } from '../types';
import { listPerformance } from '../services/fieldOps';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function FieldPerformanceScreen() {
  const [items, setItems] = useState<FieldPerformance[]>([]);
  const load = useCallback(async () => { setItems(await listPerformance()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.userId}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.head}>
              <Text style={s.rank}>{(item.rank && item.rank <= 3) ? MEDAL[item.rank - 1] : `#${item.rank}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.userName}</Text>
                <Text style={s.tot}>{item.totalJobs} iş · {item.totalOnTime} zamanında</Text>
              </View>
              <View style={s.overall}>
                <Text style={s.overallV}>{Math.round((item.onTimeRate + item.qualityScore + item.customerScore) / 3)}</Text>
                <Text style={s.overallL}>Ortalama</Text>
              </View>
            </View>
            <View style={s.bars}>
              <Bar label="Zamanında" value={item.onTimeRate} color="#0ea5e9" />
              <Bar label="Kalite" value={item.qualityScore} color="#22c55e" />
              <Bar label="Müşteri" value={item.customerScore} color="#eab308" />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.barWrap}>
      <View style={s.barHead}><Text style={s.barLabel}>{label}</Text><Text style={s.barVal}>{value}%</Text></View>
      <View style={s.barBg}><View style={[s.barFill, { width: `${value}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { fontSize: 28, minWidth: 50, textAlign: 'center', color: colors.text.primary, fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  tot: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  overall: { alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, minWidth: 70 },
  overallV: { color: '#22c55e', fontSize: typography.lg, fontWeight: '800' },
  overallL: { color: colors.text.muted, fontSize: 10 },
  bars: { gap: 6 },
  barWrap: { gap: 2 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  barVal: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});
