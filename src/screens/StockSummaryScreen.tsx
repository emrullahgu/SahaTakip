// StockSummaryScreen — POZ-DEV-158 Depo bazlı stok değer özeti
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, Material, Warehouse, StockBalance } from '../types';
import { listMaterials } from '../services/materials';
import { listWarehouses } from '../services/warehouses';
import { listBalances } from '../services/stock';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

interface WhStat {
  warehouse: Warehouse;
  totalQty: number;
  totalValue: number;
  itemCount: number;
}

interface TopRow {
  material: Material;
  totalQty: number;
  totalValue: number;
}

export default function StockSummaryScreen() {
  const nav = useNavigation<Nav>();
  const [mats, setMats] = useState<Material[]>([]);
  const [whs, setWhs] = useState<Warehouse[]>([]);
  const [bals, setBals] = useState<StockBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, w, b] = await Promise.all([listMaterials(), listWarehouses(), listBalances()]);
      setMats(m);
      setWhs(w);
      setBals(b);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { whStats, topByValue, grandQty, grandValue } = useMemo(() => {
    const matMap = new Map<string, Material>(mats.map(m => [m.id, m]));
    const ws: WhStat[] = whs.map(w => {
      const list = bals.filter(b => b.warehouseId === w.id);
      const totalQty = list.reduce((s, b) => s + b.qty, 0);
      const totalValue = list.reduce((s, b) => s + b.qty * (matMap.get(b.materialId)?.price || 0), 0);
      return { warehouse: w, totalQty, totalValue, itemCount: list.length };
    }).sort((a, b) => b.totalValue - a.totalValue);

    const matAgg = new Map<string, { qty: number; value: number }>();
    for (const b of bals) {
      const cur = matAgg.get(b.materialId) || { qty: 0, value: 0 };
      const price = matMap.get(b.materialId)?.price || 0;
      cur.qty += b.qty;
      cur.value += b.qty * price;
      matAgg.set(b.materialId, cur);
    }
    const top: TopRow[] = Array.from(matAgg.entries())
      .map(([id, v]) => ({ material: matMap.get(id) as Material, totalQty: v.qty, totalValue: v.value }))
      .filter(r => r.material)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    const gq = bals.reduce((s, b) => s + b.qty, 0);
    const gv = top.length > 0
      ? Array.from(matAgg.values()).reduce((s, v) => s + v.value, 0)
      : 0;

    return { whStats: ws, topByValue: top, grandQty: gq, grandValue: gv };
  }, [mats, whs, bals]);

  const maxWhValue = whStats[0]?.totalValue || 1;
  const maxTopValue = topByValue[0]?.totalValue || 1;

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
            <Ionicons name="pie-chart-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Stok Özeti</Text>
            <Text style={styles.heroSub}>{mats.length} malzeme · {whs.length} depo</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <Kpi label="Toplam Adet" value={Math.round(grandQty).toLocaleString('tr-TR')} color="#0ea5e9" icon="cube-outline" />
          <Kpi label="Toplam Değer" value={TL(grandValue)} color="#22c55e" icon="cash-outline" />
        </View>

        <Text style={styles.section}>Depo Bazlı Değer</Text>
        {whStats.length === 0 ? (
          <Text style={styles.empty}>Depo yok</Text>
        ) : (
          whStats.map(w => (
            <TouchableOpacity
              key={w.warehouse.id}
              style={styles.barRow}
              activeOpacity={0.85}
              onPress={() => nav.navigate('WarehouseDetail', { warehouseId: w.warehouse.id })}
            >
              <View style={[styles.dot, { backgroundColor: kindColor(w.warehouse.kind) }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.barTopRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{w.warehouse.name}</Text>
                  <Text style={styles.barCount}>{TL(w.totalValue)}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(w.totalValue / maxWhValue) * 100}%`, backgroundColor: kindColor(w.warehouse.kind) }]} />
                </View>
                <Text style={styles.subMeta}>{w.itemCount} kalem · {Math.round(w.totalQty)} adet</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.section}>En Değerli 10 Malzeme</Text>
        {topByValue.length === 0 ? (
          <Text style={styles.empty}>Stok yok</Text>
        ) : (
          topByValue.map((r, idx) => (
            <TouchableOpacity
              key={r.material.id}
              style={styles.topRow}
              activeOpacity={0.85}
              onPress={() => nav.navigate('MaterialForm', { materialId: r.material.id })}
            >
              <View style={styles.rank}><Text style={styles.rankText}>{idx + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topName} numberOfLines={1}>{r.material.name}</Text>
                <Text style={styles.topMeta}>{r.material.code} · {Math.round(r.totalQty)} {r.material.unit}</Text>
                <View style={[styles.barTrack, { marginTop: 4 }]}>
                  <View style={[styles.barFill, { width: `${(r.totalValue / maxTopValue) * 100}%`, backgroundColor: '#ec4899' }]} />
                </View>
              </View>
              <Text style={styles.topValue}>{TL(r.totalValue)}</Text>
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

function kindColor(kind: string): string {
  switch (kind) {
    case 'depo': return '#0ea5e9';
    case 'arac': return '#f59e0b';
    case 'personel': return '#22c55e';
    default: return '#64748b';
  }
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
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  barTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  barLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', flex: 1 },
  barCount: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  barTrack: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  subMeta: { color: colors.text.faint, fontSize: 10, marginTop: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  rank: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ec4899', alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  topName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  topMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  topValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
});
