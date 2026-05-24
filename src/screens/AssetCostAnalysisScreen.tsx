// Faz 46 — AssetCostAnalysisScreen
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqCostStat } from '../types';
import { computeEqCostStats, EQ_TYPE_COLOR, EQ_TYPE_ICON, EQ_TYPE_LABEL } from '../services/equipment';

export default function AssetCostAnalysisScreen() {
  const [stats, setStats] = useState<EqCostStat[]>([]);

  const load = useCallback(async () => { setStats(await computeEqCostStats()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totals = useMemo(() => ({
    maint: stats.reduce((s, x) => s + x.totalMaintenanceCost, 0),
    fault: stats.reduce((s, x) => s + x.totalFaultCost, 0),
    downtime: stats.reduce((s, x) => s + x.totalDowntimeHours, 0),
  }), [stats]);

  const max = Math.max(1, ...stats.map(s => s.totalMaintenanceCost + s.totalFaultCost));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={s.kpiRow}>
          <View style={[s.kpi, { backgroundColor: '#0ea5e933' }]}>
            <Text style={s.kpiV}>₺{totals.maint.toLocaleString('tr-TR')}</Text>
            <Text style={s.kpiL}>Bakım</Text>
          </View>
          <View style={[s.kpi, { backgroundColor: '#ef444433' }]}>
            <Text style={s.kpiV}>₺{totals.fault.toLocaleString('tr-TR')}</Text>
            <Text style={s.kpiL}>Arıza</Text>
          </View>
          <View style={[s.kpi, { backgroundColor: '#f59e0b33' }]}>
            <Text style={s.kpiV}>{totals.downtime}h</Text>
            <Text style={s.kpiL}>Duruş</Text>
          </View>
        </View>

        <Text style={s.section}>Varlık başına maliyet (azalan)</Text>
        {stats.map(it => {
          const total = it.totalMaintenanceCost + it.totalFaultCost;
          const mPct = total ? (it.totalMaintenanceCost / total) * 100 : 0;
          const fPct = total ? (it.totalFaultCost / total) * 100 : 0;
          const overall = (total / max) * 100;
          return (
            <View key={it.assetId} style={s.card}>
              <View style={s.row}>
                <View style={[s.icon, { backgroundColor: EQ_TYPE_COLOR[it.assetType] + '33' }]}>
                  <Ionicons name={EQ_TYPE_ICON[it.assetType] as any} size={20} color={EQ_TYPE_COLOR[it.assetType]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.aT}>{it.assetName}</Text>
                  <Text style={s.aM}>{EQ_TYPE_LABEL[it.assetType]} · {it.maintenanceCount} bakım · {it.faultCount} arıza</Text>
                </View>
                <Text style={s.totalT}>₺{total.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barBlue, { width: `${(mPct * overall) / 100}%` }]} />
                <View style={[s.barRed, { width: `${(fPct * overall) / 100}%` }]} />
              </View>
              <View style={s.legend}>
                <Text style={s.legB}>Bakım ₺{it.totalMaintenanceCost.toLocaleString('tr-TR')}</Text>
                <Text style={s.legR}>Arıza ₺{it.totalFaultCost.toLocaleString('tr-TR')}</Text>
                <Text style={s.legD}>Duruş {it.totalDowntimeHours}h</Text>
              </View>
            </View>
          );
        })}
        {stats.length === 0 && <Text style={s.empty}>Veri yok.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  kpiRow: { flexDirection: 'row', gap: 6 },
  kpi: { flex: 1, padding: 10, borderRadius: radius.sm, alignItems: 'center' },
  kpiV: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  section: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: 8 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  aT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  aM: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  totalT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  barTrack: { height: 8, flexDirection: 'row', backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barBlue: { backgroundColor: '#0ea5e9' },
  barRed: { backgroundColor: '#ef4444' },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legB: { color: '#0ea5e9', fontSize: typography.xs, fontWeight: '700' },
  legR: { color: '#ef4444', fontSize: typography.xs, fontWeight: '700' },
  legD: { color: '#f59e0b', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});
