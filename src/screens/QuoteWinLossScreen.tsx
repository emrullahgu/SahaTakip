// QuoteWinLossScreen — POZ-DEV-437
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { QuoteOutcomeRow } from '../types';
import { listQuoteOutcomes, resetQuoteOutcomes, WIN_REASON_LABEL } from '../services/bi';

export default function QuoteWinLossScreen() {
  const [items, setItems] = useState<QuoteOutcomeRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');
  const load = useCallback(async () => { setItems(await listQuoteOutcomes()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    const won = items.filter(i => i.outcome === 'won');
    const lost = items.filter(i => i.outcome === 'lost');
    return {
      wonCount: won.length, lostCount: lost.length,
      wonAmount: won.reduce((a, b) => a + b.amount, 0),
      lostAmount: lost.reduce((a, b) => a + b.amount, 0),
      winRate: items.length ? Math.round(won.length / items.length * 100) : 0,
    };
  }, [items]);

  const reasons = useMemo(() => {
    const map: Record<string, { wonCount: number; lostCount: number }> = {};
    items.forEach(i => {
      if (!i.reason) return;
      if (!map[i.reason]) map[i.reason] = { wonCount: 0, lostCount: 0 };
      if (i.outcome === 'won') map[i.reason].wonCount++;
      else map[i.reason].lostCount++;
    });
    return Object.entries(map).sort((a, b) => (b[1].wonCount + b[1].lostCount) - (a[1].wonCount + a[1].lostCount));
  }, [items]);

  const filtered = filter === 'all' ? items : items.filter(i => i.outcome === filter);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.totals}>
        <T l="Kazanılan" v={stats.wonCount} c="#22c55e" />
        <T l="Kaybedilen" v={stats.lostCount} c="#ef4444" />
        <T l="Kazanım %" v={stats.winRate} c="#0ea5e9" suffix="%" />
      </View>
      <View style={s.amts}>
        <Text style={s.amt}>Kazanım ₺ <Text style={{ color: '#22c55e' }}>{stats.wonAmount.toLocaleString('tr-TR')}</Text></Text>
        <Text style={s.amt}>Kayıp ₺ <Text style={{ color: '#ef4444' }}>{stats.lostAmount.toLocaleString('tr-TR')}</Text></Text>
      </View>
      <Text style={s.section}>Sebep Dağılımı</Text>
      <View style={{ paddingHorizontal: spacing.md, gap: 4 }}>
        {reasons.slice(0, 6).map(([r, v]) => (
          <View key={r} style={s.rcard}>
            <Text style={s.rL}>{WIN_REASON_LABEL[r as keyof typeof WIN_REASON_LABEL] || r}</Text>
            <Text style={{ color: '#22c55e', fontSize: typography.xs, fontWeight: '700' }}>+{v.wonCount}</Text>
            <Text style={{ color: '#ef4444', fontSize: typography.xs, fontWeight: '700' }}>-{v.lostCount}</Text>
          </View>
        ))}
      </View>
      <View style={s.chips}>
        {(['all', 'won', 'lost'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
            <Text style={[s.chipT, filter === f && s.chipTOn]}>{f === 'all' ? 'Tümü' : f === 'won' ? 'Kazanılan' : 'Kaybedilen'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={async () => { await resetQuoteOutcomes(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 4, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <View style={[s.row, { borderLeftColor: item.outcome === 'won' ? '#22c55e' : '#ef4444' }]}>
            <Ionicons name={item.outcome === 'won' ? 'checkmark-circle' : 'close-circle'} size={18} color={item.outcome === 'won' ? '#22c55e' : '#ef4444'} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{item.quoteId} · ₺{item.amount.toLocaleString('tr-TR')}</Text>
              <Text style={s.sub}>{item.reason ? WIN_REASON_LABEL[item.reason] : '—'} · {new Date(item.decidedAt).toLocaleDateString('tr-TR')}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function T({ l, v, c, suffix }: { l: string; v: number; c: string; suffix?: string }) {
  return (
    <View style={[s.t2, { borderColor: c }]}>
      <Text style={[s.t2V, { color: c }]}>{v}{suffix || ''}</Text>
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
  amts: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.md, marginBottom: 4 },
  amt: { color: colors.text.muted, fontSize: typography.xs },
  section: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700', paddingHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: 4 },
  rcard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  rL: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', flex: 1 },
  chips: { flexDirection: 'row', gap: 6, padding: spacing.md, alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  reset: { marginLeft: 'auto', width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
});
