// StockMovementsScreen — POZ-DEV-055
// Tüm stok hareketleri listesi + filtreleme.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listMovements,
  listMovementsByMaterial,
} from '../services/stock';
import { listWarehouses } from '../services/warehouses';
import {
  StockMovement,
  StockMovementKind,
  Warehouse,
  RootStackParamList,
} from '../types';

type Rt = RouteProp<RootStackParamList, 'StockMovements'>;

const KIND_META: Record<StockMovementKind, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  giris: { label: 'Giriş', color: '#22c55e', icon: 'arrow-down-circle-outline' },
  cikis: { label: 'Çıkış', color: '#ef4444', icon: 'arrow-up-circle-outline' },
  transfer: { label: 'Transfer', color: '#3b82f6', icon: 'swap-horizontal-outline' },
  'is-emri': { label: 'İş emri', color: '#a855f7', icon: 'construct-outline' },
  sayim: { label: 'Sayım', color: '#eab308', icon: 'reader-outline' },
};

const FILTERS: ('Tümü' | StockMovementKind)[] = [
  'Tümü',
  'giris',
  'cikis',
  'transfer',
  'is-emri',
  'sayim',
];

export default function StockMovementsScreen() {
  const route = useRoute<Rt>();
  const materialId = route.params?.materialId;
  const warehouseId = route.params?.warehouseId;

  const [items, setItems] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Record<string, Warehouse>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Tümü');

  const load = useCallback(async () => {
    const all = materialId
      ? await listMovementsByMaterial(materialId)
      : await listMovements();
    const filtered = warehouseId
      ? all.filter(m => m.fromWarehouseId === warehouseId || m.toWarehouseId === warehouseId)
      : all;
    setItems(filtered);
    const ws = await listWarehouses();
    const map: Record<string, Warehouse> = {};
    ws.forEach(w => (map[w.id] = w));
    setWarehouses(map);
  }, [materialId, warehouseId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = filter === 'Tümü' ? items : items.filter(i => i.kind === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'Tümü' ? 'Tümü' : KIND_META[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Hareket yok.</Text>
          </View>
        ) : (
          filtered.map(mv => {
            const meta = KIND_META[mv.kind];
            const fromName = mv.fromWarehouseId ? warehouses[mv.fromWarehouseId]?.name : null;
            const toName = mv.toWarehouseId ? warehouses[mv.toWarehouseId]?.name : null;
            return (
              <View key={mv.id} style={styles.card}>
                <View
                  style={[
                    styles.icon,
                    { borderColor: meta.color, backgroundColor: meta.color + '22' },
                  ]}
                >
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{mv.materialName}</Text>
                  <Text style={styles.meta}>
                    {meta.label} ·{' '}
                    {new Date(mv.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {(fromName || toName) && (
                    <Text style={styles.meta}>
                      {fromName ? `${fromName} ` : ''}
                      {fromName && toName ? '→ ' : ''}
                      {toName ? toName : ''}
                    </Text>
                  )}
                  {mv.note ? <Text style={styles.note}>{mv.note}</Text> : null}
                </View>
                <Text style={[styles.qty, { color: meta.color }]}>
                  {mv.qty} {mv.materialUnit}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  filterRow: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  note: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
  qty: { fontWeight: '800', fontSize: typography.sm },
});
