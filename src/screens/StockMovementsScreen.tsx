// StockMovementsScreen — POZ-DEV-055
// Tüm stok hareketleri listesi + filtreleme.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
 FlatList,} from 'react-native';
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
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

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
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
      setLoaded(true);
    }
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
              {f === 'Tümü' ? 'Tümü' : KIND_META[f as StockMovementKind].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={mv => mv.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />}
        ListEmptyComponent={loaded ? (
          <EmptyState
            icon="time-outline"
            title="Hareket yok"
            subtitle="Filtreyi değiştirerek tekrar deneyebilirsiniz."
          />
        ) : null}
        renderItem={({ item: mv }) => {
          const meta = KIND_META[mv.kind as StockMovementKind];
          const fromName = mv.fromWarehouseId ? warehouses[mv.fromWarehouseId]?.name : null;
          const toName = mv.toWarehouseId ? warehouses[mv.toWarehouseId]?.name : null;
          return (
            <View style={styles.card}>
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
        }}
      />
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
