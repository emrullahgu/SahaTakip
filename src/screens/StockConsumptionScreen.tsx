// StockConsumptionScreen — POZ-DEV-436
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { StockConsumptionRow } from '../types';
import { listStockConsumption, resetStockConsumption } from '../services/bi';

export default function StockConsumptionScreen() {
  const [items, setItems] = useState<StockConsumptionRow[]>([]);
  const load = useCallback(async () => { setItems(await listStockConsumption()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = useMemo(() => items.reduce((a, b) => a + b.cost, 0), [items]);
  const sorted = [...items].sort((a, b) => b.cost - a.cost);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Stok Tüketimi</Text>
        <TouchableOpacity onPress={async () => { await resetStockConsumption(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={s.hero}>
        <Text style={s.heroL}>Toplam tüketim</Text>
        <Text style={s.heroV}>₺{total.toLocaleString('tr-TR')}</Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const pct = total ? Math.round(item.cost / total * 100) : 0;
          return (
            <View style={s.card}>
              <View style={s.row}>
                <Ionicons name="cube-outline" size={20} color="#06b6d4" />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={s.name}>{item.materialName}</Text>
                  <Text style={s.sub}>{item.quantity} {item.unit} · {item.jobsCount} iş · ₺{item.cost.toLocaleString('tr-TR')}</Text>
                </View>
                <Text style={s.pct}>%{pct}</Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFg, { width: `${pct}%` }]} />
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: '#06b6d422', padding: spacing.md, marginHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#06b6d4' },
  heroL: { color: colors.text.muted, fontSize: typography.xs },
  heroV: { color: '#06b6d4', fontSize: typography.xxl, fontWeight: '800', marginTop: 4 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pct: { color: '#06b6d4', fontSize: typography.sm, fontWeight: '800' },
  barBg: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, overflow: 'hidden' },
  barFg: { height: '100%', backgroundColor: '#06b6d4' },
});
