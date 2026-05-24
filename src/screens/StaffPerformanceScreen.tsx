// StaffPerformanceScreen — POZ-DEV-433
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { StaffPerformanceRecord } from '../types';
import { listStaffPerformance, resetStaffPerformance } from '../services/bi';

type SortKey = 'completed' | 'rating' | 'punctuality';

export default function StaffPerformanceScreen() {
  const [items, setItems] = useState<StaffPerformanceRecord[]>([]);
  const [sort, setSort] = useState<SortKey>('completed');

  const load = useCallback(async () => { setItems(await listStaffPerformance()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sorted = [...items].sort((a, b) => {
    if (sort === 'completed') return b.jobsCompleted - a.jobsCompleted;
    if (sort === 'rating') return b.ratingAvg - a.ratingAvg;
    return b.punctualityPct - a.punctualityPct;
  });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['completed', 'rating', 'punctuality'] as SortKey[]).map(k => (
            <TouchableOpacity key={k} onPress={() => setSort(k)} style={[s.chip, sort === k && s.chipOn]}>
              <Text style={[s.chipT, sort === k && s.chipTOn]}>{k === 'completed' ? 'Tamamlanan' : k === 'rating' ? 'Puan' : 'Devamlılık'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={async () => { await resetStaffPerformance(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        renderItem={({ item, index }) => {
          const completionPct = Math.round(item.jobsCompleted / item.jobsAssigned * 100);
          return (
            <View style={s.card}>
              <View style={s.row}>
                <View style={[s.rank, { backgroundColor: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#a16207' : '#334155' }]}>
                  <Text style={s.rankT}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.fullName}</Text>
                  <Text style={s.sub}>{item.jobsCompleted}/{item.jobsAssigned} iş · ort. {item.avgCompletionHours}sa</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.big, { color: '#f59e0b' }]}>{item.ratingAvg.toFixed(1)} ★</Text>
                  <Text style={s.sub}>%{item.punctualityPct} devam</Text>
                </View>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFg, { width: `${completionPct}%`, backgroundColor: completionPct >= 80 ? '#22c55e' : completionPct >= 60 ? '#f59e0b' : '#ef4444' }]} />
              </View>
              <Text style={s.sub}>Tamamlama: %{completionPct}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rankT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  big: { fontSize: typography.lg, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  barFg: { height: '100%', borderRadius: 3 },
});
