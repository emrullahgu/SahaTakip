// FuelReportScreen — POZ-DEV-237 Akaryakıt raporu (Vehicles + VehicleLog'lar üzerinden)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { Vehicle, VehicleLog } from '../types';
import { listVehicles } from '../services/vehicles';
import { listLogs } from '../services/vehicleLogs';

type Period = 'week' | 'month' | 'year';

export default function FuelReportScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);

  useEffect(() => { (async () => {
    setVehicles(await listVehicles());
    setLogs(await listLogs());
  })(); }, []);

  const since = useMemo(() => {
    const d = new Date();
    if (period === 'week') d.setDate(d.getDate() - 7);
    else if (period === 'month') d.setMonth(d.getMonth() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  }, [period]);

  const fuelLogs = useMemo(() =>
    logs.filter(l => l.kind === 'fuel' && l.createdAt >= since),
    [logs, since]);

  const totalCost = fuelLogs.reduce((s, l) => s + (l.totalCost || 0), 0);
  const totalLiters = fuelLogs.reduce((s, l) => s + (l.liters || 0), 0);
  const avgPerLitre = totalLiters > 0 ? totalCost / totalLiters : 0;

  const byVehicle = useMemo(() => {
    const m = new Map<string, { liters: number; cost: number; count: number }>();
    fuelLogs.forEach(l => {
      const cur = m.get(l.vehicleId) || { liters: 0, cost: 0, count: 0 };
      cur.liters += l.liters || 0;
      cur.cost += l.totalCost || 0;
      cur.count += 1;
      m.set(l.vehicleId, cur);
    });
    return Array.from(m.entries()).map(([vid, v]) => ({ vehicle: vehicles.find(x => x.id === vid), ...v }))
      .sort((a, b) => b.cost - a.cost);
  }, [fuelLogs, vehicles]);

  const maxCost = Math.max(1, ...byVehicle.map(v => v.cost));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="water-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Akaryakıt Raporu</Text>
            <Text style={s.heroS}>{vehicles.length} araç · {fuelLogs.length} yakıt kaydı</Text>
          </View>
        </View>

        <View style={s.tabs}>
          {(['week', 'month', 'year'] as Period[]).map(p => (
            <View key={p} style={[s.tab, period === p && s.tabActive]} onTouchEnd={() => setPeriod(p)}>
              <Text style={[s.tabText, period === p && { color: '#fff' }]}>{p === 'week' ? 'Hafta' : p === 'month' ? 'Ay' : 'Yıl'}</Text>
            </View>
          ))}
        </View>

        <View style={s.kpiRow}>
          <KPI label="Toplam Maliyet" value={`₺${totalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`} color="#ef4444" icon="cash-outline" />
          <KPI label="Toplam Litre" value={`${totalLiters.toFixed(1)} L`} color="#0ea5e9" icon="water-outline" />
          <KPI label="Ort. ₺/L" value={`₺${avgPerLitre.toFixed(2)}`} color="#f59e0b" icon="trending-up-outline" />
        </View>

        <Text style={s.sectionTitle}>Araç Bazlı Dağılım</Text>
        {byVehicle.length === 0 && <Text style={s.empty}>Bu dönemde yakıt kaydı yok</Text>}
        {byVehicle.map((v, i) => (
          <View key={(v.vehicle?.id || i) + ''} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{v.vehicle?.plate || 'Bilinmiyor'} {v.vehicle?.brand ? `· ${v.vehicle.brand}` : ''}</Text>
              <Text style={s.rowMeta}>{v.liters.toFixed(1)} L · {v.count} kayıt</Text>
              <View style={s.bar}><View style={[s.barFill, { width: `${(v.cost / maxCost) * 100}%` }]} /></View>
            </View>
            <Text style={s.rowVal}>₺{v.cost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({ label, value, color, icon }: { label: string; value: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[s.kpi, { borderColor: color + '55', backgroundColor: color + '11' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={s.kpiVal}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#ef4444', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  tabActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  tabText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: 6 },
  kpi: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  kpiVal: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: 4 },
  kpiLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.sm },
  empty: { color: colors.text.muted, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm },
  rowTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  rowVal: { color: '#ef4444', fontWeight: '800', fontSize: typography.sm },
  bar: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#ef4444' },
});
