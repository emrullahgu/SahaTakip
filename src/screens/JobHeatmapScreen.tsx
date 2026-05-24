// Faz 44 — JobHeatmapScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { JobHeatPoint } from '../types';
import { listHeat } from '../services/liveOps';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

const heatColor = (i: number) => i >= 8 ? '#ef4444' : i >= 6 ? '#f97316' : i >= 4 ? '#f59e0b' : '#22c55e';

export default function JobHeatmapScreen() {
  const [items, setItems] = useState<JobHeatPoint[]>([]);
  const load = useCallback(async () => { setItems(await listHeat()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const max = Math.max(1, ...items.map(i => i.intensity));
  const total = items.reduce((s, i) => s + i.jobCount, 0);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.statRow}>
        <View style={s.statCard}><Text style={s.sV}>{total}</Text><Text style={s.sL}>Toplam İş</Text></View>
        <View style={s.statCard}><Text style={s.sV}>{items.length}</Text><Text style={s.sL}>Bölge</Text></View>
        <View style={s.statCard}><Text style={[s.sV, { color: '#ef4444' }]}>{max}</Text><Text style={s.sL}>Max Yoğunluk</Text></View>
      </View>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items.sort((a, b) => b.intensity - a.intensity)}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        ListEmptyComponent={
          <EmptyState
            icon="flame-outline"
            title="Yoğunluk verisi yok"
            subtitle="Harita üzerinde henüz bir iş yoğunluğu oluşmadı."
          />
        }
        renderItem={({ item }) => {
          const c = heatColor(item.intensity);
          return (
            <View style={[s.card, { borderLeftColor: c }]}>
              <Ionicons name="flame" size={28} color={c} />
              <View style={{ flex: 1 }}>
                <View style={s.head}>
                  <Text style={s.r}>{item.region}</Text>
                  <Text style={[s.intV, { color: c }]}>{item.intensity}/10</Text>
                </View>
                <Text style={s.j}>{item.jobCount} açık iş emri</Text>
                <View style={s.barBg}><View style={[s.barFg, { width: `${(item.intensity / 10) * 100}%`, backgroundColor: c }]} /></View>
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
  statRow: { flexDirection: 'row', gap: 6, padding: spacing.md },
  statCard: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  sV: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  sL: { color: colors.text.muted, fontSize: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  r: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  intV: { fontSize: typography.sm, fontWeight: '800' },
  j: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFg: { height: 6, borderRadius: 3 },
});
