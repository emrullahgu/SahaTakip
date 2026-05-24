// SlaTrackingScreen — POZ-DEV-439
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { SlaResultRow } from '../types';
import { listSlaResults, resetSlaResults } from '../services/bi';

export default function SlaTrackingScreen() {
  const [items, setItems] = useState<SlaResultRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'fail'>('all');
  const load = useCallback(async () => { setItems(await listSlaResults()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    const ok = items.filter(i => i.success).length;
    return { ok, fail: items.length - ok, rate: items.length ? Math.round(ok / items.length * 100) : 0 };
  }, [items]);

  const filtered = filter === 'all' ? items : filter === 'success' ? items.filter(i => i.success) : items.filter(i => !i.success);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.totals}>
        <T l="Başarı" v={stats.ok} c="#22c55e" />
        <T l="Başarısız" v={stats.fail} c="#ef4444" />
        <T l="Oran %" v={stats.rate} c="#0ea5e9" />
      </View>
      <View style={s.chips}>
        {(['all', 'success', 'fail'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
            <Text style={[s.chipT, filter === f && s.chipTOn]}>{f === 'all' ? 'Tümü' : f === 'success' ? 'Başarılı' : 'Aşıldı'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={async () => { await resetSlaResults(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 4, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const c = item.success ? '#22c55e' : '#ef4444';
          return (
            <View style={[s.card, { borderLeftColor: c }]}>
              <Ionicons name={item.success ? 'checkmark-circle' : 'alert-circle'} size={18} color={c} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={s.t}>WO {item.workOrderId} · {item.category || '—'}</Text>
                <Text style={s.sub}>Hedef {item.targetHours}h · Gerçek {item.actualHours}h · {new Date(item.recordedAt).toLocaleDateString('tr-TR')}</Text>
              </View>
              <Text style={[s.delta, { color: c }]}>{item.actualHours - item.targetHours > 0 ? '+' : ''}{item.actualHours - item.targetHours}h</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function T({ l, v, c }: { l: string; v: number; c: string }) {
  return (
    <View style={[s.t2, { borderColor: c }]}>
      <Text style={[s.t2V, { color: c }]}>{v}</Text>
      <Text style={s.t2L}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  totals: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  t2: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  t2V: { fontSize: typography.lg, fontWeight: '800' },
  t2L: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  reset: { marginLeft: 'auto', width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  delta: { fontSize: typography.sm, fontWeight: '800' },
});
