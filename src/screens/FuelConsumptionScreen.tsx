// FuelConsumptionScreen — POZ-DEV-435
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { VehicleCostRecord } from '../types';
import { listVehicleCosts, resetVehicleCosts } from '../services/bi';

export default function FuelConsumptionScreen() {
  const [items, setItems] = useState<VehicleCostRecord[]>([]);
  const load = useCallback(async () => { setItems(await listVehicleCosts()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totals = useMemo(() => ({
    liters: items.reduce((a, b) => a + b.fuelLiters, 0),
    km: items.reduce((a, b) => a + b.km, 0),
    cost: items.reduce((a, b) => a + b.fuelCost, 0),
  }), [items]);
  const avg100 = totals.km ? (totals.liters / totals.km * 100).toFixed(2) : '0.00';

  const sorted = [...items].sort((a, b) => (b.fuelLiters / b.km) - (a.fuelLiters / a.km));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Yakıt Tüketimi</Text>
        <TouchableOpacity onPress={async () => { await resetVehicleCosts(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={s.totals}>
        <T l="Toplam L" v={String(totals.liters)} c="#ef4444" />
        <T l="Toplam km" v={totals.km.toLocaleString('tr-TR')} c="#0ea5e9" />
        <T l="Toplam ₺" v={totals.cost.toLocaleString('tr-TR')} c="#22c55e" />
        <T l="L/100km" v={avg100} c="#f59e0b" />
      </View>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const l100 = (item.fuelLiters / item.km * 100).toFixed(2);
          const danger = parseFloat(l100) > 11;
          return (
            <View style={[s.card, { borderLeftColor: danger ? '#ef4444' : '#22c55e' }]}>
              <View style={s.row}>
                <Ionicons name="speedometer-outline" size={20} color={danger ? '#ef4444' : '#22c55e'} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={s.plate}>{item.plate}</Text>
                  <Text style={s.sub}>{item.fuelLiters} L · {item.km.toLocaleString('tr-TR')} km · ₺{item.fuelCost.toLocaleString('tr-TR')}</Text>
                </View>
                <Text style={[s.big, { color: danger ? '#ef4444' : '#22c55e' }]}>{l100}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function T({ l, v, c }: { l: string; v: string; c: string }) {
  return (
    <View style={[s.t, { borderColor: c }]}>
      <Text style={[s.tV, { color: c }]}>{v}</Text>
      <Text style={s.tL}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  totals: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  t: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  tV: { fontSize: typography.sm, fontWeight: '800' },
  tL: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  plate: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  big: { fontSize: typography.lg, fontWeight: '800' },
});
