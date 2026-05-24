// UsageLimitsScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { UsageMetric } from '../types';
import { listUsage, USAGE_LABEL } from '../services/platform';

export default function UsageLimitsScreen() {
  const [items, setItems] = useState<UsageMetric[]>([]);
  const load = useCallback(async () => { setItems(await listUsage()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 8 }}
        renderItem={({ item }) => {
          const pct = Math.min(100, (item.current / item.limit) * 100);
          const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
          return (
            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.n}>{USAGE_LABEL[item.metric]}</Text>
                <Text style={[s.v, { color }]}>{item.current.toLocaleString('tr-TR')} / {item.limit.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={s.barOuter}>
                <View style={[s.barInner, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <Text style={s.sub}>%{pct.toFixed(1)}{item.resetAt ? ' · sıfırlama: ' + new Date(item.resetAt).toLocaleDateString('tr-TR') : ''}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  v: { fontSize: typography.sm, fontWeight: '800' },
  barOuter: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, marginTop: spacing.sm, overflow: 'hidden' },
  barInner: { height: '100%', borderRadius: 4 },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 6 },
});
