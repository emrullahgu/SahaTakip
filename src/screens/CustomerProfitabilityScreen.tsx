// CustomerProfitabilityScreen — POZ-DEV-438
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { CustomerProfitRow } from '../types';
import { listCustomerProfit, resetCustomerProfit } from '../services/bi';

export default function CustomerProfitabilityScreen() {
  const [items, setItems] = useState<CustomerProfitRow[]>([]);
  const [sort, setSort] = useState<'margin' | 'pct' | 'revenue'>('margin');
  const load = useCallback(async () => { setItems(await listCustomerProfit()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sorted = [...items].sort((a, b) => {
    if (sort === 'pct') return b.marginPct - a.marginPct;
    if (sort === 'revenue') return b.revenue - a.revenue;
    return b.margin - a.margin;
  });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['margin', 'pct', 'revenue'] as const).map(k => (
            <TouchableOpacity key={k} onPress={() => setSort(k)} style={[s.chip, sort === k && s.chipOn]}>
              <Text style={[s.chipT, sort === k && s.chipTOn]}>{k === 'margin' ? 'Kâr ₺' : k === 'pct' ? 'Marj %' : 'Gelir'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={async () => { await resetCustomerProfit(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={i => i.customerId}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        renderItem={({ item, index }) => {
          const c = item.marginPct >= 25 ? '#22c55e' : item.marginPct >= 10 ? '#f59e0b' : '#ef4444';
          return (
            <View style={[s.card, { borderLeftColor: c }]}>
              <View style={s.row}>
                <Text style={s.rank}>#{index + 1}</Text>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={s.name}>{item.customerName}</Text>
                  <Text style={s.sub}>{item.workOrderCount} iş emri{item.lastEngagementAt ? ` · son ${new Date(item.lastEngagementAt).toLocaleDateString('tr-TR')}` : ''}</Text>
                </View>
                <Text style={[s.big, { color: c }]}>%{item.marginPct}</Text>
              </View>
              <View style={s.grid}>
                <Cell l="Gelir" v={`₺${item.revenue.toLocaleString('tr-TR')}`} />
                <Cell l="Maliyet" v={`₺${item.cost.toLocaleString('tr-TR')}`} />
                <Cell l="Kâr" v={`₺${item.margin.toLocaleString('tr-TR')}`} c={c} />
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Cell({ l, v, c }: { l: string; v: string; c?: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.cL}>{l}</Text>
      <Text style={[s.cV, c ? { color: c } : null]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rank: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '800', width: 32 },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  big: { fontSize: typography.lg, fontWeight: '800' },
  grid: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 },
  cell: { flex: 1 },
  cL: { color: colors.text.muted, fontSize: 10 },
  cV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', marginTop: 2 },
});
