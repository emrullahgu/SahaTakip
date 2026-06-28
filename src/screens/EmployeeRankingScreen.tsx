// Faz 47 — EmployeeRankingScreen (POZ-DEV-176)
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { computeStaffScores, toProductivityEntries } from '../services/scoring';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

const effColor = (e: number) => e >= 85 ? '#22c55e' : e >= 75 ? '#f59e0b' : '#ef4444';
const medal = (r: number) => r === 1 ? '#facc15' : r === 2 ? '#94a3b8' : r === 3 ? '#cd7f32' : '#475569';

export default function EmployeeRankingScreen() {
  const { workOrders } = useAppContext();
  // Canlı skor: work_orders'tan tamamlama + rapor eksiksizliği + hacim (scoring.ts).
  const sorted = useMemo(() => toProductivityEntries(computeStaffScores(workOrders)), [workOrders]);
  const max = Math.max(...sorted.map(e => e.efficiencyScore), 100);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={sorted}
        keyExtractor={e => e.employeeId}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={<Text style={s.section}>Personel verimlilik sıralaması</Text>}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Veri bulunamadı"
            subtitle="Personel performans verileri henüz hesaplanmamış."
          />
        }
        renderItem={({ item: e }) => (
          <View key={e.employeeId} style={s.card}>
            <View style={s.row}>
              <View style={[s.medal, { backgroundColor: medal(e.ranking) }]}>
                <Ionicons name={e.ranking <= 3 ? 'medal' : 'person'} size={16} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{e.employeeName}</Text>
                <Text style={s.meta}>#{e.ranking} · {e.jobsCompleted} iş · {e.hoursWorked}s</Text>
              </View>
              <View style={[s.scorePill, { borderColor: effColor(e.efficiencyScore) }]}>
                <Text style={[s.scoreV, { color: effColor(e.efficiencyScore) }]}>{e.efficiencyScore}</Text>
              </View>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${(e.efficiencyScore / max) * 100}%`, backgroundColor: effColor(e.efficiencyScore) }]} />
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaL}>Ciro Katkısı</Text>
              <Text style={s.metaV}>₺{e.revenueGenerated.toLocaleString('tr-TR')}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medal: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, minWidth: 40, alignItems: 'center' },
  scoreV: { fontSize: typography.base, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaL: { color: colors.text.muted, fontSize: typography.xs },
  metaV: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800' },
});
