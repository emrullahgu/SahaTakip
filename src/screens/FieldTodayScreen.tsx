// Faz 42 — FieldTodayScreen: bugün yapılacaklar + akıllı sıralama
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldJob, RootStackParamList } from '../types';
import { smartSortJobs, PRIORITY_COLOR, PRIORITY_LABEL, STAGE_COLOR, STAGE_LABEL, getLiveStats } from '../services/fieldOps';
import type { FieldOpsLiveStat } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FieldTodayScreen() {
  const [jobs, setJobs] = useState<FieldJob[]>([]);
  const [stats, setStats] = useState<FieldOpsLiveStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const nav = useNavigation<Nav>();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await smartSortJobs());
      setStats(await getLiveStats());
    } finally { setLoading(false); setLoaded(true); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.statRow}>
        {stats.map(st => (
          <View key={st.id} style={[s.stat, { borderColor: st.color }]}>
            <Ionicons name={st.icon as any} size={16} color={st.color} />
            <Text style={s.statV}>{st.value}</Text>
            <Text style={s.statL}>{st.label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.sectionH}>🧠 Akıllı Sıralama (Öncelik + SLA)</Text>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={jobs}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />}
        ListEmptyComponent={loaded ? (
          <EmptyState
            icon="clipboard-outline"
            title="Bugün için iş yok"
            subtitle="Planlanmış görevleriniz olduğunda burada görünecek."
          />
        ) : null}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('FieldJobDetail', { jobId: item.id })}>
            <View style={s.rank}><Text style={s.rankT}>{index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.customerName}</Text>
              <Text style={s.addr}>{item.address}</Text>
              <View style={s.chipRow}>
                <View style={[s.chip, { backgroundColor: PRIORITY_COLOR[item.priority as keyof typeof PRIORITY_COLOR] }]}>
                  <Text style={s.chipT}>{PRIORITY_LABEL[item.priority as keyof typeof PRIORITY_LABEL]}</Text>
                </View>
                <View style={[s.chip, { backgroundColor: STAGE_COLOR[item.stage as keyof typeof STAGE_COLOR] }]}>
                  <Text style={s.chipT}>{STAGE_LABEL[item.stage as keyof typeof STAGE_LABEL]}</Text>
                </View>
                {item.slaAt && (
                  <Text style={s.sla}>SLA: {new Date(item.slaAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: 6 },
  stat: { flex: 1, minWidth: 80, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', marginTop: 2 },
  statL: { color: colors.text.muted, fontSize: 10 },
  sectionH: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', paddingHorizontal: spacing.md, marginTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  rankT: { color: '#fff', fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  addr: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipT: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sla: { color: colors.text.muted, fontSize: 10 },
});
