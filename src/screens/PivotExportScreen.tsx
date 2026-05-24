// PivotExportScreen — POZ-DEV-443
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import {
  listKpiCards, listDepartmentKpis, listStaffPerformance, listVehicleCosts,
  listStockConsumption, listQuoteOutcomes, listCustomerProfit, listSlaResults,
  listRegionHeat, listBudgetVsActual, toCsv,
} from '../services/bi';

type DatasetKey = 'kpi' | 'dept' | 'staff' | 'vehicle' | 'stock' | 'quote' | 'customer' | 'sla' | 'heat' | 'budget';

const DATASETS: { key: DatasetKey; label: string; icon: any; color: string; load: () => Promise<any[]> }[] = [
  { key: 'kpi', label: 'KPI Kartları', icon: 'analytics-outline', color: '#22c55e', load: listKpiCards },
  { key: 'dept', label: 'Departman KPI', icon: 'business-outline', color: '#0ea5e9', load: listDepartmentKpis },
  { key: 'staff', label: 'Personel', icon: 'people-outline', color: '#a855f7', load: listStaffPerformance },
  { key: 'vehicle', label: 'Araç Maliyet', icon: 'car-outline', color: '#f59e0b', load: listVehicleCosts },
  { key: 'stock', label: 'Stok', icon: 'cube-outline', color: '#06b6d4', load: listStockConsumption },
  { key: 'quote', label: 'Teklif K/K', icon: 'document-text-outline', color: '#ec4899', load: listQuoteOutcomes },
  { key: 'customer', label: 'Müşteri Kâr', icon: 'cash-outline', color: '#10b981', load: listCustomerProfit },
  { key: 'sla', label: 'SLA', icon: 'time-outline', color: '#6366f1', load: listSlaResults },
  { key: 'heat', label: 'Bölge', icon: 'location-outline', color: '#ef4444', load: listRegionHeat },
  { key: 'budget', label: 'Bütçe vs Fiili', icon: 'wallet-outline', color: '#84cc16', load: listBudgetVsActual },
];

export default function PivotExportScreen() {
  const [csv, setCsv] = useState<string>('');
  const [active, setActive] = useState<DatasetKey | null>(null);
  const [rowCount, setRowCount] = useState(0);

  const run = async (d: typeof DATASETS[number]) => {
    try {
      const rows = await d.load();
      setRowCount(rows.length);
      setActive(d.key);
      setCsv(toCsv(rows));
    } catch (e: any) {
      Alert.alert('Hata', String(e?.message || e));
    }
  };

  const share = async () => {
    if (!csv) return;
    try { await Share.share({ message: csv }); } catch (e: any) { Alert.alert('Paylaşım hatası', String(e?.message || e)); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <Text style={s.title}>Veri Seti Seç</Text>
        <View style={s.grid}>
          {DATASETS.map(d => (
            <TouchableOpacity key={d.key} onPress={() => run(d)} style={[s.tile, { backgroundColor: d.color + '22', borderColor: d.color }, active === d.key && { backgroundColor: d.color }]}>
              <Ionicons name={d.icon} size={22} color={active === d.key ? '#fff' : d.color} />
              <Text style={[s.tileT, { color: active === d.key ? '#fff' : colors.text.primary }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {csv ? (
          <>
            <View style={s.bar}>
              <Text style={s.info}>{rowCount} satır · {csv.length} karakter</Text>
              <TouchableOpacity onPress={share} style={[s.btn, { backgroundColor: '#22c55e' }]}>
                <Ionicons name="share-outline" size={14} color="#fff" />
                <Text style={s.btnT}>Paylaş</Text>
              </TouchableOpacity>
            </View>
            <View style={s.preview}>
              <Text style={s.previewT}>{csv.slice(0, 1200)}{csv.length > 1200 ? '\n…' : ''}</Text>
            </View>
          </>
        ) : (
          <Text style={s.empty}>Bir veri seti seçtikten sonra CSV önizlemesi ve paylaşım açılır.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48%', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 6 },
  tileT: { fontSize: typography.xs, fontWeight: '700', textAlign: 'center' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  info: { color: colors.text.muted, fontSize: typography.xs },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  preview: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  previewT: { color: colors.text.primary, fontSize: 11, fontFamily: 'monospace' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});
