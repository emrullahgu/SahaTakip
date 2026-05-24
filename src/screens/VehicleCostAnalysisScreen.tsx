// VehicleCostAnalysisScreen — POZ-DEV-434
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { VehicleCostRecord } from '../types';
import { listVehicleCosts, resetVehicleCosts } from '../services/bi';

export default function VehicleCostAnalysisScreen() {
  const [items, setItems] = useState<VehicleCostRecord[]>([]);
  const load = useCallback(async () => { setItems(await listVehicleCosts()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totals = useMemo(() => {
    const fuel = items.reduce((a, b) => a + b.fuelCost, 0);
    const maint = items.reduce((a, b) => a + b.maintenanceCost, 0);
    const repair = items.reduce((a, b) => a + b.repairCost, 0);
    return { fuel, maint, repair, total: fuel + maint + repair, km: items.reduce((a, b) => a + b.km, 0) };
  }, [items]);

  const sorted = [...items].sort((a, b) => b.cph - a.cph);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Araç Maliyet</Text>
        <TouchableOpacity onPress={async () => { await resetVehicleCosts(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={s.totals}>
        <T l="Yakıt" v={totals.fuel} c="#ef4444" />
        <T l="Bakım" v={totals.maint} c="#f59e0b" />
        <T l="Onarım" v={totals.repair} c="#a855f7" />
        <T l="Toplam" v={totals.total} c="#22c55e" />
      </View>
      <Text style={s.subBar}>Toplam km: {totals.km.toLocaleString('tr-TR')} · 100km maliyet sıralı</Text>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const total = item.fuelCost + item.maintenanceCost + item.repairCost;
          return (
            <View style={s.card}>
              <View style={s.row}>
                <Ionicons name="car-outline" size={22} color="#f59e0b" />
                <Text style={s.plate}>{item.plate}</Text>
                <Text style={s.cph}>₺{item.cph}/100km</Text>
              </View>
              <View style={s.grid}>
                <Cell l="km" v={item.km.toLocaleString('tr-TR')} />
                <Cell l="L" v={String(item.fuelLiters)} />
                <Cell l="Yakıt ₺" v={item.fuelCost.toLocaleString('tr-TR')} c="#ef4444" />
                <Cell l="Bakım ₺" v={item.maintenanceCost.toLocaleString('tr-TR')} c="#f59e0b" />
                <Cell l="Onarım ₺" v={String(item.repairCost.toLocaleString('tr-TR'))} c="#a855f7" />
                <Cell l="Toplam ₺" v={total.toLocaleString('tr-TR')} c="#22c55e" />
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function T({ l, v, c }: { l: string; v: number; c: string }) {
  return (
    <View style={[s.t, { borderColor: c }]}>
      <Text style={[s.tV, { color: c }]}>₺{v.toLocaleString('tr-TR')}</Text>
      <Text style={s.tL}>{l}</Text>
    </View>
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  totals: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: 4 },
  t: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  tV: { fontSize: typography.sm, fontWeight: '800' },
  tL: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  subBar: { color: colors.text.muted, fontSize: typography.xs, paddingHorizontal: spacing.md, paddingVertical: 6 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  plate: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700', flex: 1 },
  cph: { color: '#f59e0b', fontSize: typography.sm, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: '32%' },
  cL: { color: colors.text.muted, fontSize: 10 },
  cV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', marginTop: 2 },
});
