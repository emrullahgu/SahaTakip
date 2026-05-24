// Faz 51 — DepBuildErrorsScreen (POZ-DEV-215)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepErrors, toggleErrorFixed } from '../services/deploy';
import type { DepBuildError } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const SEV_COLOR: Record<DepBuildError['severity'], string> = { error: '#ef4444', warning: '#f59e0b' };
const SEV_ICON: Record<DepBuildError['severity'], string> = { error: 'close-circle', warning: 'warning' };
const CAT_LABEL: Record<DepBuildError['category'], string> = { typescript: 'TypeScript', lint: 'Lint', dependency: 'Bağımlılık', config: 'Yapılandırma', asset: 'Asset' };
const PLAT_LABEL: Record<DepBuildError['platform'], string> = { web: 'Web', mobile: 'Mobil' };

type Filter = 'all' | 'error' | 'warning' | 'fixed' | 'open';

export default function DepBuildErrorsScreen() {
  const [items, setItems] = useState<DepBuildError[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const load = useCallback(async () => setItems(await listDepErrors()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggle = async (id: string) => { await toggleErrorFixed(id); await load(); };

  const filtered = useMemo(() => items.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'fixed') return i.fixed;
    if (filter === 'open') return !i.fixed;
    return i.severity === filter;
  }), [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    error: items.filter(i => i.severity === 'error').length,
    warning: items.filter(i => i.severity === 'warning').length,
    fixed: items.filter(i => i.fixed).length,
    open: items.filter(i => !i.fixed).length,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {(['all', 'error', 'warning', 'open', 'fixed'] as Filter[]).map(f => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.tab, filter === f && s.tabActive]}>
                <Text style={[s.tabT, filter === f && s.tabTActive]}>{f === 'all' ? 'Tümü' : f === 'error' ? 'Hata' : f === 'warning' ? 'Uyarı' : f === 'open' ? 'Açık' : 'Düzeltildi'} ({counts[f]})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            title="Sorun yok"
            subtitle="Bu filtreye uygun derleme hatası veya uyarısı bulunamadı."
          />
        }
        renderItem={({ item: e }) => (
          <View key={e.id} style={[s.card, { borderLeftColor: e.fixed ? '#22c55e' : SEV_COLOR[e.severity as keyof typeof SEV_COLOR], opacity: e.fixed ? 0.6 : 1 }]}>
            <View style={s.headRow}>
              <Ionicons name={e.fixed ? 'checkmark-done-circle' : SEV_ICON[e.severity as keyof typeof SEV_ICON] as any} size={20} color={e.fixed ? '#22c55e' : SEV_COLOR[e.severity as keyof typeof SEV_COLOR]} />
              <View style={{ flex: 1 }}>
                <Text style={s.code}>{e.file.split('/').pop()}</Text>
                <Text style={s.msg}>{e.message}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: SEV_COLOR[e.severity as keyof typeof SEV_COLOR] + '33', borderColor: SEV_COLOR[e.severity as keyof typeof SEV_COLOR] }]}>
                <Text style={[s.pillT, { color: SEV_COLOR[e.severity as keyof typeof SEV_COLOR] }]}>{CAT_LABEL[e.category as keyof typeof CAT_LABEL]}</Text>
              </View>
            </View>
            {e.file && (
              <Text style={s.file}>{e.file}:{e.line}</Text>
            )}
            <View style={s.metaRow}>
              <Text style={s.metaT}>{PLAT_LABEL[e.platform as keyof typeof PLAT_LABEL]}</Text>
              <TouchableOpacity onPress={() => onToggle(e.id)} style={[s.toggleBtn, { borderColor: e.fixed ? '#f59e0b' : '#22c55e' }]}>
                <Ionicons name={e.fixed ? 'arrow-undo' : 'checkmark'} size={12} color={e.fixed ? '#f59e0b' : '#22c55e'} />
                <Text style={[s.toggleT, { color: e.fixed ? '#f59e0b' : '#22c55e' }]}>{e.fixed ? 'Geri Al' : 'Düzeltildi'}</Text>
              </TouchableOpacity>
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
  tabs: { gap: 6, paddingVertical: 2 },
  tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  tabActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  tabT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  tabTActive: { color: '#fff' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  code: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', fontFamily: 'monospace' as any },
  msg: { color: colors.text.primary, fontSize: typography.xs, marginTop: 2 },
  file: { color: '#0ea5e9', fontSize: typography.xs, fontFamily: 'monospace' as any },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginLeft: 'auto' },
  toggleT: { fontSize: typography.xs, fontWeight: '700' },
  empty: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyT: { color: colors.text.muted, fontSize: typography.sm },
});
