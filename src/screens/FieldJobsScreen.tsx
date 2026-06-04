// Faz 42 — FieldJobsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldJob, FieldJobStage, RootStackParamList } from '../types';
import { listJobs, PRIORITY_COLOR, PRIORITY_LABEL, STAGE_COLOR, STAGE_LABEL } from '../services/fieldOps';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const FILTERS: { key: 'all' | FieldJobStage; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'assigned', label: 'Atanan' },
  { key: 'enroute', label: 'Yolda' },
  { key: 'in_progress', label: 'Devam' },
  { key: 'completed', label: 'Bitti' },
];

export default function FieldJobsScreen() {
  const [items, setItems] = useState<FieldJob[]>([]);
  const [filter, setFilter] = useState<'all' | FieldJobStage>('all');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const nav = useNavigation<Nav>();
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listJobs()); }
    finally { setLoading(false); setLoaded(true); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'all' ? items : items.filter(i => i.stage === filter);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.tabs}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.tab, filter === f.key && s.tabActive]} onPress={() => setFilter(f.key)} accessibilityRole="button" accessibilityState={{ selected: filter === f.key }} accessibilityLabel={`Filtre: ${f.label}`}>
            <Text style={[s.tabT, filter === f.key && s.tabTActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />}
        ListEmptyComponent={loaded ? (
          <EmptyState
            icon="list-outline"
            title="İş bulunamadı"
            subtitle="Filtreyi değiştirerek tekrar deneyebilirsiniz."
          />
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('FieldJobDetail', { jobId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.customerName}</Text>
              <Text style={s.addr}>{item.address}</Text>
              <Text style={s.user}>👤 {item.assignedUserName}</Text>
              <View style={s.row}>
                <View style={[s.chip, { backgroundColor: PRIORITY_COLOR[item.priority as keyof typeof PRIORITY_COLOR] }]}>
                  <Text style={s.chipT}>{PRIORITY_LABEL[item.priority as keyof typeof PRIORITY_LABEL]}</Text>
                </View>
                <View style={[s.chip, { backgroundColor: STAGE_COLOR[item.stage as keyof typeof STAGE_COLOR] }]}>
                  <Text style={s.chipT}>{STAGE_LABEL[item.stage as keyof typeof STAGE_LABEL]}</Text>
                </View>
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
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  tabActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  tabT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  tabTActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  addr: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  user: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  row: { flexDirection: 'row', gap: 4, marginTop: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipT: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
