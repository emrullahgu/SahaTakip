// BiHubScreen — POZ-DEV-430
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TILES = [
  { k: 'ExecutiveDashboard', l: 'Yönetici Paneli', i: 'analytics-outline', c: '#22c55e' },
  { k: 'DepartmentKpis', l: 'Departman KPI', i: 'business-outline', c: '#0ea5e9' },
  { k: 'StaffPerformance', l: 'Personel Performansı', i: 'people-outline', c: '#a855f7' },
  { k: 'VehicleCostAnalysis', l: 'Araç Maliyet', i: 'car-outline', c: '#f59e0b' },
  { k: 'FuelConsumption', l: 'Yakıt Tüketimi', i: 'speedometer-outline', c: '#ef4444' },
  { k: 'StockConsumption', l: 'Stok Tüketimi', i: 'cube-outline', c: '#06b6d4' },
  { k: 'QuoteWinLoss', l: 'Teklif Kazan/Kayıp', i: 'trending-up-outline', c: '#ec4899' },
  { k: 'CustomerProfitability', l: 'Müşteri Kârlılık', i: 'wallet-outline', c: '#10b981' },
  { k: 'SlaTracking', l: 'SLA Takip', i: 'time-outline', c: '#6366f1' },
  { k: 'RegionHeatmap', l: 'Bölge Yoğunluk', i: 'map-outline', c: '#8b5cf6' },
  { k: 'BudgetVsActual', l: 'Bütçe vs Fiili', i: 'pie-chart-outline', c: '#f97316' },
  { k: 'ExecutiveSummary', l: 'Yönetim Özeti', i: 'newspaper-outline', c: '#14b8a6' },
  { k: 'PivotExport', l: 'Pivot/CSV İhraç', i: 'download-outline', c: '#64748b' },
] as const;

export default function BiHubScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="bar-chart-outline" size={52} color="#22c55e" /></View>
          <Text style={s.heroT}>BI & Karar Destek</Text>
          <Text style={s.heroS}>Tüm operasyonel veriniz tek panelde.</Text>
        </View>
        <View style={[s.grid, { gap: spacing.sm }]}>
          {TILES.map(t => (
            <TouchableOpacity key={t.k} style={[s.tile, { width: `${100 / cols - 1}%`, backgroundColor: t.c + '22', borderColor: t.c }]} onPress={() => navigation.navigate(t.k as any)}>
              <Ionicons name={t.i as any} size={28} color={t.c} />
              <Text style={s.tileT}>{t.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  hero: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border.primary },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22c55e22', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroT: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { padding: spacing.md, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, minHeight: 100 },
  tileT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.xs, textAlign: 'center' },
});
