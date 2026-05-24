// Faz 52 — QaQueriesScreen (POZ-DEV-231)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaQueries } from '../services/codeQuality';
import type { QaQueryAudit } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

export default function QaQueriesScreen() {
  const [items, setItems] = useState<QaQueryAudit[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listQaQueries()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    optimized: items.filter(i => i.optimized).length,
    duplicates: items.filter(i => i.duplicate).length,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={q => q.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.heroCard}>
            <Ionicons name="server-outline" size={48} color="#22c55e" />
            <Text style={s.heroT}>Supabase Sorgu Audit</Text>
            <Text style={s.heroD}>{stats.optimized}/{stats.total} optimize • {stats.duplicates} mükerrer çağrı</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="server-outline"
            title="Sorgu verisi yok"
            subtitle="Henüz veritabanı sorgu analizi verisi toplanmadı."
          />
        }
        renderItem={({ item: q }) => (
          <View key={q.id} style={[s.card, { borderLeftColor: q.optimized ? '#22c55e' : '#f59e0b' }]}>
            <View style={s.headRow}>
              <Ionicons name="server" size={18} color="#22c55e" />
              <Text style={s.table}>{q.table}</Text>
              <Ionicons name={q.optimized ? 'checkmark-circle' : 'warning'} size={18} color={q.optimized ? '#22c55e' : '#f59e0b'} />
            </View>
            <Text style={s.callSite}>{q.callSite}</Text>
            <View style={s.badgesRow}>
              <View style={[s.badge, { borderColor: q.hasSelect ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={q.hasSelect ? 'checkmark' : 'close'} size={11} color={q.hasSelect ? '#22c55e' : '#ef4444'} />
                <Text style={[s.badgeT, { color: q.hasSelect ? '#22c55e' : '#ef4444' }]}>select</Text>
              </View>
              <View style={[s.badge, { borderColor: q.hasIndex ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={q.hasIndex ? 'checkmark' : 'close'} size={11} color={q.hasIndex ? '#22c55e' : '#ef4444'} />
                <Text style={[s.badgeT, { color: q.hasIndex ? '#22c55e' : '#ef4444' }]}>index</Text>
              </View>
              {q.duplicate && (
                <View style={[s.badge, { borderColor: '#f59e0b' }]}>
                  <Ionicons name="copy" size={11} color="#f59e0b" />
                  <Text style={[s.badgeT, { color: '#f59e0b' }]}>mükerrer</Text>
                </View>
              )}
              <Text style={s.rows}>~{q.rowsTypical} satır</Text>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#22c55e', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  table: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', flex: 1, fontFamily: 'monospace' as any },
  callSite: { color: colors.text.muted, fontSize: typography.xs, fontFamily: 'monospace' as any },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeT: { fontSize: 10, fontWeight: '700' },
  rows: { color: colors.text.muted, fontSize: typography.xs, marginLeft: 'auto', fontWeight: '700' },
});
