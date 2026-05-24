// Faz 46 — AssetHubScreen
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listEqAssets, listEqMaintenance, listEqFaults, upcomingEqPlans, EQ_STATUS_COLOR } from '../services/equipment';

const TILES: { key: string; label: string; icon: any; color: string; nav: string }[] = [
  { key: 'list', label: 'Varlık Listesi', icon: 'list', color: '#0ea5e9', nav: 'AssetList' },
  { key: 'qr', label: 'QR Kod', icon: 'qr-code', color: '#22c55e', nav: 'AssetQr' },
  { key: 'maint', label: 'Bakım Geçmişi', icon: 'construct', color: '#f59e0b', nav: 'AssetMaintenanceHistory' },
  { key: 'fault', label: 'Arıza Geçmişi', icon: 'warning', color: '#ef4444', nav: 'AssetFaultHistory' },
  { key: 'warr', label: 'Garanti & Servis', icon: 'shield-checkmark', color: '#8b5cf6', nav: 'WarrantyTracking' },
  { key: 'plan', label: 'Periyodik Bakım', icon: 'calendar', color: '#06b6d4', nav: 'MaintenancePlan' },
  { key: 'alert', label: 'Yaklaşan Bakımlar', icon: 'notifications', color: '#f97316', nav: 'MaintenanceAlerts' },
  { key: 'cost', label: 'Maliyet Analizi', icon: 'cash', color: '#22c55e', nav: 'AssetCostAnalysis' },
  { key: 'types', label: 'Enerji Tipleri', icon: 'flash', color: '#a855f7', nav: 'EnergyAssetTypes' },
  { key: 'card', label: 'Servis Karnesi', icon: 'document-text', color: '#14b8a6', nav: 'ServiceCard' },
];

export default function AssetHubScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const [counts, setCounts] = useState({ active: 0, broken: 0, total: 0, faults: 0, upcoming: 0, maint: 0 });

  const load = useCallback(async () => {
    const [assets, m, f, up] = await Promise.all([listEqAssets(), listEqMaintenance(), listEqFaults(), upcomingEqPlans(30)]);
    setCounts({
      total: assets.length,
      active: assets.filter(a => a.status === 'active').length,
      broken: assets.filter(a => a.status === 'broken').length,
      maint: m.length,
      faults: f.length,
      upcoming: up.length,
    });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tileStyle = useMemo(() => ({ width: `${100 / cols - 1}%` as any }), [cols]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="hardware-chip" size={100} color="#0ea5e9" />
          <Text style={s.heroT}>Ekipman & Bakım</Text>
          <Text style={s.heroS}>Varlık yönetimi, QR, bakım planı ve maliyet</Text>
        </View>
        <View style={s.kpiRow}>
          <View style={[s.kpi, { backgroundColor: '#0ea5e933' }]}>
            <Text style={s.kpiV}>{counts.total}</Text>
            <Text style={s.kpiL}>Toplam Varlık</Text>
          </View>
          <View style={[s.kpi, { backgroundColor: EQ_STATUS_COLOR.broken + '33' }]}>
            <Text style={s.kpiV}>{counts.broken}</Text>
            <Text style={s.kpiL}>Arızalı</Text>
          </View>
          <View style={[s.kpi, { backgroundColor: '#f9731633' }]}>
            <Text style={s.kpiV}>{counts.upcoming}</Text>
            <Text style={s.kpiL}>Yaklaşan</Text>
          </View>
        </View>
        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, tileStyle, { backgroundColor: t.color + '22', borderColor: t.color }]} onPress={() => nav.navigate(t.nav)}>
              <Ionicons name={t.icon} size={28} color={t.color} />
              <Text style={s.tileT}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center', paddingVertical: spacing.md },
  heroT: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800', marginTop: spacing.sm },
  heroS: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  kpiV: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any, rowGap: spacing.md },
  tile: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  tileT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', textAlign: 'center' },
});
