// Faz 49 — SuspiciousActivityScreen (POZ-DEV-196)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSuspicious, resolveSuspicious, SUS_SEV_LABEL, SUS_SEV_COLOR, SUS_TYPE_LABEL, SUS_TYPE_ICON } from '../services/secCenter';
import type { SuspiciousActivity } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

export default function SuspiciousActivityScreen() {
  const [list, setList] = useState<SuspiciousActivity[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');

  const load = useCallback(async () => setList(await listSuspicious()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = list.filter(s => filter === 'all' || (filter === 'open' ? !s.resolved : s.resolved));
  const openCount = list.filter(s => !s.resolved).length;
  const critical = list.filter(s => !s.resolved && (s.severity === 'high' || s.severity === 'critical')).length;

  const resolve = async (id: string) => { await resolveSuspicious(id); load(); };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={a => a.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.summary}>
              <View style={s.sumBox}>
                <Text style={s.sumV}>{openCount}</Text>
                <Text style={s.sumL}>Açık</Text>
              </View>
              <View style={[s.sumBox, { backgroundColor: '#ef444433' }]}>
                <Text style={[s.sumV, { color: '#ef4444' }]}>{critical}</Text>
                <Text style={s.sumL}>Kritik / Yüksek</Text>
              </View>
            </View>

            <View style={s.chips}>
              {(['open', 'all', 'resolved'] as const).map(k => (
                <TouchableOpacity key={k} style={[s.chip, filter === k && { backgroundColor: '#0ea5e9' }]} onPress={() => setFilter(k)}>
                  <Text style={[s.chipT, filter === k && { color: '#fff' }]}>
                    {k === 'open' ? 'Açık' : k === 'all' ? 'Tümü' : 'Çözüldü'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title="Şüpheli aktivite yok"
            subtitle="Sistemde henüz bir anomali veya güvenlik ihlali tespit edilmedi."
          />
        }
        renderItem={({ item: a }) => (
          <View key={a.id} style={[s.card, { borderLeftColor: SUS_SEV_COLOR[a.severity] }, a.resolved && { opacity: 0.55 }]}>
            <View style={s.row}>
              <View style={[s.iconBox, { backgroundColor: SUS_SEV_COLOR[a.severity] + '22', borderColor: SUS_SEV_COLOR[a.severity] }]}>
                <Ionicons name={SUS_TYPE_ICON[a.type] as any} size={20} color={SUS_SEV_COLOR[a.severity]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{SUS_TYPE_LABEL[a.type]}</Text>
                <Text style={s.userT}>{a.user} · {new Date(a.at).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.sev, { backgroundColor: SUS_SEV_COLOR[a.severity] + '33', borderColor: SUS_SEV_COLOR[a.severity] }]}>
                <Text style={[s.sevT, { color: SUS_SEV_COLOR[a.severity] }]}>{SUS_SEV_LABEL[a.severity]}</Text>
              </View>
            </View>
            <Text style={s.desc}>{a.description}</Text>
            {!a.resolved && (
              <TouchableOpacity style={s.btn} onPress={() => resolve(a.id)}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={s.btnT}>İncelendi olarak işaretle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.sm },
  sumBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  sumV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  userT: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sev: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  sevT: { fontSize: typography.xs, fontWeight: '800' },
  desc: { color: colors.text.primary, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: '#22c55e' },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
