// Faz 43 — QuoteRevisionCompareScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { QuoteRevisionDiff } from '../types';
import { listDiffs } from '../services/smartQuote';

export default function QuoteRevisionCompareScreen() {
  const [items, setItems] = useState<QuoteRevisionDiff[]>([]);
  const load = useCallback(async () => { setItems(await listDiffs()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        ListEmptyComponent={<Text style={s.empty}>Revizyon yok.</Text>}
        renderItem={({ item }) => {
          const isUp = item.delta > 0;
          const c = isUp ? '#f59e0b' : '#22c55e';
          return (
            <View style={s.card}>
              <View style={s.head}>
                <Ionicons name="git-compare" size={20} color="#0ea5e9" />
                <Text style={s.base}>{item.baseQuoteId}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.text.muted} />
                <Text style={s.rev}>{item.revisionQuoteId}</Text>
              </View>
              <View style={s.priceRow}>
                <View style={s.col}>
                  <Text style={s.lbl}>Önceki</Text>
                  <Text style={s.pv}>₺{item.basePrice.toLocaleString('tr-TR')}</Text>
                </View>
                <View style={s.col}>
                  <Text style={s.lbl}>Yeni</Text>
                  <Text style={s.pv}>₺{item.revisionPrice.toLocaleString('tr-TR')}</Text>
                </View>
                <View style={s.col}>
                  <Text style={s.lbl}>Fark</Text>
                  <Text style={[s.delta, { color: c }]}>
                    <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={14} color={c} />
                    {' '}{isUp ? '+' : ''}{item.deltaPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <View style={s.chips}>
                <View style={[s.chip, { backgroundColor: '#22c55e22', borderColor: '#22c55e' }]}><Text style={[s.chipT, { color: '#22c55e' }]}>+{item.addedItems} eklendi</Text></View>
                <View style={[s.chip, { backgroundColor: '#ef444422', borderColor: '#ef4444' }]}><Text style={[s.chipT, { color: '#ef4444' }]}>-{item.removedItems} kaldırıldı</Text></View>
                <View style={[s.chip, { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' }]}><Text style={[s.chipT, { color: '#f59e0b' }]}>~{item.changedItems} değişti</Text></View>
              </View>
              <Text style={s.tm}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  base: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  rev: { color: '#0ea5e9', fontSize: typography.xs, fontWeight: '800' },
  priceRow: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1 },
  lbl: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  pv: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', marginTop: 2 },
  delta: { fontSize: typography.md, fontWeight: '800', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  chipT: { fontSize: 10, fontWeight: '800' },
  tm: { color: colors.text.faint, fontSize: 10 },
});
