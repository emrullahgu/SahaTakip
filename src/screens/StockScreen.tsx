// StockScreen — POZ-DEV-055, 058
// Genel stok özeti + düşük stok uyarıları + tüm malzemelerin toplam bakiyesi.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
 FlatList,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listMaterials } from '../services/materials';
import { listBalances, lowStockAlerts, LowStockRow } from '../services/stock';
import { listWarehouses } from '../services/warehouses';
import {
  Material,
  StockBalance,
  Warehouse,
  RootStackParamList,
} from '../types';
import EmptyState from '../components/EmptyState';
import PressableScale from '../components/PressableScale';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Stock'>;

export default function StockScreen() {
  const navigation = useNavigation<Nav>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lows, setLows] = useState<LowStockRow[]>([]);

  const load = useCallback(async () => {
    const [m, b, w, l] = await Promise.all([
      listMaterials(),
      listBalances(),
      listWarehouses(),
      lowStockAlerts(),
    ]);
    setMaterials(m);
    setBalances(b);
    setWarehouses(w);
    setLows(l);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalQty = (mid: string) =>
    balances.filter(b => b.materialId === mid).reduce((s, b) => s + b.qty, 0);
  const totalValue = balances.reduce((s, b) => {
    const m = materials.find(x => x.id === b.materialId);
    return s + (m?.price ?? 0) * b.qty;
  }, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={materials}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.kpiRow}>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>Malzeme</Text>
                <Text style={styles.kpiValue}>{materials.length}</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>Depo/Zimmet</Text>
                <Text style={styles.kpiValue}>{warehouses.length}</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>Toplam Değer</Text>
                <Text style={styles.kpiValue}>
                  {totalValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actBtn, { backgroundColor: '#22c55e' }]}
                onPress={() => navigation.navigate('StockMovement', { kind: 'giris' })}
              >
                <Ionicons name="arrow-down-circle-outline" size={16} color="#fff" />
                <Text style={styles.actText}>Giriş</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => navigation.navigate('StockMovement', { kind: 'cikis' })}
              >
                <Ionicons name="arrow-up-circle-outline" size={16} color="#fff" />
                <Text style={styles.actText}>Çıkış</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => navigation.navigate('StockMovement', { kind: 'transfer' })}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color="#fff" />
                <Text style={styles.actText}>Transfer</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => navigation.navigate('Materials')}
              >
                <Ionicons name="cube-outline" size={16} color={brand.green} />
                <Text style={styles.linkText}>Malzemeler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => navigation.navigate('Warehouses')}
              >
                <Ionicons name="business-outline" size={16} color={brand.green} />
                <Text style={styles.linkText}>Depo & Zimmet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => navigation.navigate('StockMovements', {})}
              >
                <Ionicons name="time-outline" size={16} color={brand.green} />
                <Text style={styles.linkText}>Hareketler</Text>
              </TouchableOpacity>
            </View>

            {lows.length > 0 && (
              <>
                <View style={styles.warnHeader}>
                  <Ionicons name="warning-outline" size={16} color={colors.rose.default} />
                  <Text style={styles.warnTitle}>Düşük Stok Uyarısı ({lows.length})</Text>
                </View>
                {lows.map(row => (
                  <PressableScale
                    key={row.material.id}
                    style={[styles.row, { borderColor: colors.rose.border }]}
                    onPress={() =>
                      navigation.navigate('MaterialForm', { materialId: row.material.id })
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{row.material.name}</Text>
                      <Text style={styles.rowMeta}>
                        Mevcut {row.totalQty} · Min {row.material.minStock} · Eksik {row.shortage}
                      </Text>
                    </View>
                    <Text style={[styles.qty, { color: colors.rose.default }]}>
                      {row.totalQty} {row.material.unit}
                    </Text>
                  </PressableScale>
                ))}
              </>
            )}

            <Text style={styles.section}>Tüm Malzemeler</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Malzeme bulunamadı"
            subtitle="Henüz malzeme tanımlanmamış."
            actionLabel="+ Yeni Malzeme"
            onAction={() => navigation.navigate('MaterialForm')}
          />
        }
        renderItem={({ item: m }) => {
          const q = totalQty(m.id);
          const low = m.minStock && q < m.minStock;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate('MaterialForm', { materialId: m.id })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{m.name}</Text>
                <Text style={styles.rowMeta}>
                  {m.code}
                  {m.category ? ` · ${m.category}` : ''}
                </Text>
              </View>
              <Text style={[styles.qty, low ? { color: colors.rose.default } : null]}>
                {q} {m.unit}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kpiLabel: { color: colors.text.muted, fontSize: typography.xs },
  kpiValue: {
    color: colors.text.primary,
    fontSize: typography.md,
    fontWeight: '800',
    marginTop: 4,
  },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  actText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: brand.green,
    backgroundColor: colors.bg.secondary,
  },
  linkText: { color: brand.green, fontWeight: '800', fontSize: typography.xs },
  warnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: 6,
  },
  warnTitle: { color: colors.rose.default, fontWeight: '800', fontSize: typography.sm },
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.lg,
    marginBottom: 6,
  },
  empty: { color: colors.text.muted, fontSize: typography.xs, paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 6,
  },
  rowName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  qty: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
});
