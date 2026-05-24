// Faz 51 — DepRlsPoliciesScreen (POZ-DEV-212)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepRls } from '../services/deploy';
import type { DepRlsPolicy } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const CMD_COLOR: Record<DepRlsPolicy['command'], string> = {
  select: '#0ea5e9', insert: '#22c55e', update: '#f59e0b', delete: '#ef4444', all: '#a855f7',
};

export default function DepRlsPoliciesScreen() {
  const [items, setItems] = useState<DepRlsPolicy[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listDepRls()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    ok: items.filter(i => i.enabled && i.checkPassed).length,
    fail: items.filter(i => !i.checkPassed).length,
    disabled: items.filter(i => !i.enabled).length,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.statRow}>
            <View style={s.statBox}><Text style={s.statV}>{stats.total}</Text><Text style={s.statL}>Tablo</Text></View>
            <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{stats.ok}</Text><Text style={s.statL}>Geçti</Text></View>
            <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.fail}</Text><Text style={s.statL}>Sorun</Text></View>
            <View style={[s.statBox, { borderColor: '#64748b' }]}><Text style={[s.statV, { color: '#64748b' }]}>{stats.disabled}</Text><Text style={s.statL}>Kapalı</Text></View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-outline"
            title="Politika verisi yok"
            subtitle="DB seviyesinde güvenlik politikası verisi bulunamadı."
          />
        }
        renderItem={({ item: i }) => {
          const ok = i.enabled && i.checkPassed;
          return (
            <View key={i.id} style={[s.card, { borderLeftColor: ok ? '#22c55e' : '#ef4444' }]}>
              <View style={s.headRow}>
                <Ionicons name={ok ? 'shield-checkmark' : 'shield-outline'} size={20} color={ok ? '#22c55e' : '#ef4444'} />
                <View style={{ flex: 1 }}>
                  <Text style={s.table}>{i.table}</Text>
                  <Text style={s.policy}>{i.policy}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: CMD_COLOR[i.command] + '33', borderColor: CMD_COLOR[i.command] }]}>
                  <Text style={[s.pillT, { color: CMD_COLOR[i.command] }]}>{i.command.toUpperCase()}</Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaT}>{i.enabled ? '✓ Aktif' : '✗ Devre Dışı'}</Text>
                <Text style={s.metaT}>{i.checkPassed ? '✓ Kontrol geçti' : '✗ Kontrol başarısız'}</Text>
                <Text style={s.metaT}>{i.rowsAffected.toLocaleString('tr-TR')} satır</Text>
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
  scroll: { padding: spacing.md, gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  statV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  table: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  policy: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2, fontFamily: 'monospace' as any },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
});
