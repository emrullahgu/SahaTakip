// WarehousesScreen — POZ-DEV-054
// Depo / araç / personel zimmet noktaları listesi. Kategori filtresi.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
 FlatList,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listWarehouses,
  deleteWarehouse,
} from '../services/warehouses';
import { Warehouse, WarehouseKind, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Warehouses'>;

const KIND_META: Record<WarehouseKind, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  depo: { label: 'Depo', icon: 'business-outline', color: '#3b82f6' },
  arac: { label: 'Araç', icon: 'car-outline', color: '#22c55e' },
  personel: { label: 'Personel', icon: 'person-outline', color: '#a855f7' },
};

const FILTERS: ('Tümü' | WarehouseKind)[] = ['Tümü', 'depo', 'arac', 'personel'];

export default function WarehousesScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Warehouse[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Tümü');

  const load = useCallback(async () => {
    setItems(await listWarehouses());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = filter === 'Tümü' ? items : items.filter(w => w.kind === filter);

  const onDelete = (w: Warehouse) => {
    Alert.alert('Sil', `"${w.name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteWarehouse(w.id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Depo & Zimmet ({items.length})</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('WarehouseForm')}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

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
              {f === 'Tümü' ? 'Tümü' : KIND_META[f as WarehouseKind].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const meta = KIND_META[item.kind as WarehouseKind];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('WarehouseDetail', { warehouseId: item.id })
              }
              onLongPress={() => onDelete(item)}
            >
              <View
                style={[
                  styles.iconBox,
                  { borderColor: meta.color, backgroundColor: meta.color + '22' },
                ]}
              >
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {meta.label}
                  {item.responsibleName ? ` · ${item.responsibleName}` : ''}
                  {item.code ? ` · ${item.code}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() =>
                  navigation.navigate('WarehouseForm', { warehouseId: item.id })
                }
              >
                <Ionicons name="create-outline" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="Nokta bulunamadı"
            subtitle="Filtreyi değiştirerek tekrar deneyebilir veya yeni bir zimmet noktası ekleyebilirsiniz."
            actionLabel="+ Yeni Depo/Zimmet"
            onAction={() => navigation.navigate('WarehouseForm')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingBottom: spacing.sm,
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
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
