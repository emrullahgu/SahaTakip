// Faz 47 — VehicleEfficiencyScreen (POZ-DEV-177)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listVehicleProductivity } from '../services/exec';
import type { VehicleProductivityEntry } from '../types';

const costColor = (c: number) => c <= 600 ? '#22c55e' : c <= 800 ? '#f59e0b' : '#ef4444';

export default function VehicleEfficiencyScreen() {
  const [list, setList] = useState<VehicleProductivityEntry[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listVehicleProductivity()))(); }, []));

  const sorted = useMemo(() => [...list].sort((a, b) => a.ranking - b.ranking), [list]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>Araç maliyet/verimlilik sıralaması</Text>
        {sorted.map(v => (
          <View key={v.vehicleId} style={s.card}>
            <View style={s.row}>
              <Ionicons name="car-sport" size={28} color="#06b6d4" />
              <View style={{ flex: 1 }}>
                <Text style={s.plate}>{v.plate}</Text>
                <Text style={s.brand}>{v.brand}</Text>
              </View>
              <View style={[s.costPill, { borderColor: costColor(v.costPerJob) }]}>
                <Text style={[s.costV, { color: costColor(v.costPerJob) }]}>₺{v.costPerJob}</Text>
                <Text style={s.costL}>/iş</Text>
              </View>
            </View>
            <View style={s.grid}>
              <View style={s.stat}>
                <Ionicons name="speedometer" size={14} color={colors.text.muted} />
                <Text style={s.statV}>{v.kmTotal.toLocaleString('tr-TR')} km</Text>
              </View>
              <View style={s.stat}>
                <Ionicons name="water" size={14} color="#f59e0b" />
                <Text style={s.statV}>₺{v.fuelCost.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={s.stat}>
                <Ionicons name="construct" size={14} color="#ef4444" />
                <Text style={s.statV}>₺{v.maintenanceCost.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={s.stat}>
                <Ionicons name="checkmark-done" size={14} color="#22c55e" />
                <Text style={s.statV}>{v.jobsServed} iş</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  plate: { color: colors.text.primary, fontSize: typography.base, fontWeight: '800' },
  brand: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  costPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  costV: { fontSize: typography.base, fontWeight: '800' },
  costL: { color: colors.text.faint, fontSize: typography.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '47%' },
  statV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
});
