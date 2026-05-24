// VehicleFuelStatsScreen — POZ-DEV-165 Araç bazlı yakıt tüketim ve maliyet özeti
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, Vehicle, VehicleLog } from '../types';
import { listVehicles } from '../services/vehicles';
import { listLogs } from '../services/vehicleLogs';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

interface VehStat {
  vehicle: Vehicle;
  totalLiters: number;
  totalCost: number;
  totalKm: number;
  avgConsumption: number;
  fuelCount: number;
}

export default function VehicleFuelStatsScreen() {
  const nav = useNavigation<Nav>();
  const [vehs, setVehs] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, l] = await Promise.all([listVehicles(), listLogs()]);
      setVehs(v);
      setLogs(l);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { stats, totalLiters, totalCost } = useMemo(() => {
    const rows: VehStat[] = vehs.map(v => {
      const fuel = logs.filter(l => l.vehicleId === v.id && l.kind === 'fuel');
      const liters = fuel.reduce((s, l) => s + (l.liters ?? 0), 0);
      const cost = fuel.reduce((s, l) => s + (l.totalCost ?? 0), 0);
      const kms = fuel.map(l => l.km ?? 0).filter(k => k > 0).sort((a, b) => a - b);
      const km = kms.length >= 2 ? kms[kms.length - 1] - kms[0] : 0;
      const avg = km > 0 ? (liters / km) * 100 : 0;
      return { vehicle: v, totalLiters: liters, totalCost: cost, totalKm: km, avgConsumption: avg, fuelCount: fuel.length };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const tl = rows.reduce((s, r) => s + r.totalLiters, 0);
    const tc = rows.reduce((s, r) => s + r.totalCost, 0);
    return { stats: rows, totalLiters: tl, totalCost: tc };
  }, [vehs, logs]);

  const maxCost = stats[0]?.totalCost || 1;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#ec4899" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="analytics-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Yakıt İstatistik</Text>
            <Text style={styles.heroSub}>{vehs.length} araç · {logs.filter(l => l.kind === 'fuel').length} dolum</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <Kpi label="Toplam Litre" value={`${Math.round(totalLiters).toLocaleString('tr-TR')} L`} color="#0ea5e9" icon="water-outline" />
          <Kpi label="Toplam Yakıt Maliyeti" value={TL(totalCost)} color="#22c55e" icon="cash-outline" />
        </View>

        <Text style={styles.section}>Araç Bazlı Tüketim</Text>
        {stats.length === 0 ? (
          <Text style={styles.empty}>Araç yok</Text>
        ) : (
          stats.map(s => (
            <TouchableOpacity
              key={s.vehicle.id}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => nav.navigate('VehicleDetail', { vehicleId: s.vehicle.id })}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.topRow}>
                  <Text style={styles.plate}>{s.vehicle.plate}</Text>
                  <Text style={styles.cost}>{TL(s.totalCost)}</Text>
                </View>
                <Text style={styles.sub} numberOfLines={1}>
                  {[s.vehicle.brand, s.vehicle.model].filter(Boolean).join(' ') || '—'}
                  {s.vehicle.driverName ? ` · ${s.vehicle.driverName}` : ''}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(s.totalCost / maxCost) * 100}%`, backgroundColor: '#ec4899' }]} />
                </View>
                <View style={styles.metaRow}>
                  <MetaPill text={`${Math.round(s.totalLiters)} L`} />
                  <MetaPill text={`${s.fuelCount} dolum`} />
                  {s.totalKm > 0 && <MetaPill text={`${Math.round(s.totalKm)} km`} />}
                  {s.avgConsumption > 0 && (
                    <MetaPill text={`${s.avgConsumption.toFixed(1)} L/100km`} color={s.avgConsumption > 10 ? '#ef4444' : '#22c55e'} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, color, icon }: { label: string; value: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.kpi, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={18} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  );
}

function MetaPill({ text, color }: { text: string; color?: string }) {
  const c = color ?? colors.text.muted;
  return (
    <View style={[styles.metaPill, { borderColor: c }]}>
      <Text style={[styles.metaPillText, { color: c }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#ec4899', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, borderLeftWidth: 4 },
  kpiLabel: { color: colors.text.muted, fontSize: 10 },
  kpiValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: 2 },
  section: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, padding: spacing.md, textAlign: 'center' },
  row: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plate: { color: '#0ea5e9', fontWeight: '800', fontSize: typography.sm },
  cost: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  barTrack: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  metaPillText: { fontSize: 10, fontWeight: '700' },
});
