// DepartmentKpisScreen — POZ-DEV-432
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { DepartmentKpiSnapshot } from '../types';
import { listDepartmentKpis, resetDepartmentKpis } from '../services/bi';

export default function DepartmentKpisScreen() {
  const [items, setItems] = useState<DepartmentKpiSnapshot[]>([]);
  const load = useCallback(async () => { setItems(await listDepartmentKpis()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const reset = async () => { await resetDepartmentKpis(); load(); };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Departman KPI</Text>
        <TouchableOpacity onPress={reset} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" /><Text style={s.resetT}>Yeniden Üret</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const marginPct = Math.round(item.margin / item.revenue * 100);
          const color = marginPct >= 30 ? '#22c55e' : marginPct >= 15 ? '#f59e0b' : '#ef4444';
          return (
            <View style={[s.card, { borderLeftColor: color }]}>
              <View style={s.row}>
                <Text style={s.name}>{item.departmentName}</Text>
                <Text style={[s.pct, { color }]}>%{marginPct} marj</Text>
              </View>
              <View style={s.grid}>
                <Metric l="Gelir" v={`₺${item.revenue.toLocaleString('tr-TR')}`} />
                <Metric l="Maliyet" v={`₺${item.cost.toLocaleString('tr-TR')}`} />
                <Metric l="Kâr" v={`₺${item.margin.toLocaleString('tr-TR')}`} c={color} />
                <Metric l="İş Emri" v={String(item.jobsCompleted)} />
                <Metric l="SLA" v={`%${item.slaSuccessPct}`} c={item.slaSuccessPct >= 90 ? '#22c55e' : '#f59e0b'} />
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Metric({ l, v, c }: { l: string; v: string; c?: string }) {
  return (
    <View style={s.m}>
      <Text style={s.mL}>{l}</Text>
      <Text style={[s.mV, c ? { color: c } : null]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#64748b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  resetT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  pct: { fontSize: typography.sm, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  m: { minWidth: '30%', flex: 1 },
  mL: { color: colors.text.muted, fontSize: 10 },
  mV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: 2 },
});
