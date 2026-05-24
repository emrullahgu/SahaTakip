// RegionHeatmapScreen — POZ-DEV-440
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RegionHeatPoint } from '../types';
import { listRegionHeat, resetRegionHeat } from '../services/bi';

export default function RegionHeatmapScreen() {
  const [items, setItems] = useState<RegionHeatPoint[]>([]);
  const load = useCallback(async () => { setItems(await listRegionHeat()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxJobs = useMemo(() => Math.max(1, ...items.map(i => i.jobCount)), [items]);
  const sorted = [...items].sort((a, b) => b.intensity - a.intensity);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Bölge Yoğunluk</Text>
        <TouchableOpacity onPress={async () => { await resetRegionHeat(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const c = item.intensity >= 0.7 ? '#ef4444' : item.intensity >= 0.4 ? '#f59e0b' : '#22c55e';
          return (
            <View style={s.card}>
              <View style={s.row}>
                <Ionicons name="location" size={20} color={c} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={s.name}>{item.regionName}</Text>
                  <Text style={s.sub}>{item.lat.toFixed(3)}, {item.lng.toFixed(3)} · {item.jobCount} iş</Text>
                </View>
                <Text style={[s.big, { color: c }]}>{Math.round(item.intensity * 100)}%</Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFg, { width: `${item.intensity * 100}%`, backgroundColor: c }]} />
              </View>
              <View style={s.barBg2}>
                <View style={[s.barFg, { width: `${item.jobCount / maxJobs * 100}%`, backgroundColor: '#0ea5e9' }]} />
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
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  big: { fontSize: typography.md, fontWeight: '800' },
  barBg: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  barBg2: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, overflow: 'hidden' },
  barFg: { height: '100%' },
});
