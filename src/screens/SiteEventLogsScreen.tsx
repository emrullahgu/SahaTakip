// Faz 44 — SiteEventLogsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { SiteEventLog } from '../types';
import { listEvents } from '../services/liveOps';

export default function SiteEventLogsScreen() {
  const [items, setItems] = useState<SiteEventLog[]>([]);
  const load = useCallback(async () => { setItems(await listEvents()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sorted = [...items].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const arr = items.filter(i => i.kind === 'arrival').length;
  const dep = items.filter(i => i.kind === 'departure').length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.statRow}>
        <View style={[s.statCard, { borderLeftColor: '#22c55e' }]}>
          <Ionicons name="log-in" size={18} color="#22c55e" />
          <Text style={[s.sV, { color: '#22c55e' }]}>{arr}</Text>
          <Text style={s.sL}>Saha Varış</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Ionicons name="log-out" size={18} color="#f59e0b" />
          <Text style={[s.sV, { color: '#f59e0b' }]}>{dep}</Text>
          <Text style={s.sL}>Saha Ayrılış</Text>
        </View>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const isArr = item.kind === 'arrival';
          const c = isArr ? '#22c55e' : '#f59e0b';
          return (
            <View style={[s.card, { borderLeftColor: c }]}>
              <Ionicons name={isArr ? 'log-in' : 'log-out'} size={22} color={c} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.personnelName}</Text>
                <Text style={s.k}>{item.customerName}{item.jobId ? ` · ${item.jobId}` : ''}</Text>
                <Text style={s.t}>{new Date(item.at).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: c }]}>
                <Text style={s.bT}>{isArr ? 'VARIŞ' : 'AYRILIŞ'}</Text>
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
  statRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  statCard: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, alignItems: 'flex-start' },
  sV: { fontSize: typography.xl, fontWeight: '800' },
  sL: { color: colors.text.muted, fontSize: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  k: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  t: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
