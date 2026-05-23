// AssignmentsScreen — POZ-DEV-056
// Personel & araç zimmet özeti: kişiye/araca atanmış malzemeler.

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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listWarehouses } from '../services/warehouses';
import { listBalancesByWarehouse } from '../services/stock';
import { listMaterials } from '../services/materials';
import {
  Warehouse,
  Material,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Assignments'>;

interface Row {
  warehouse: Warehouse;
  items: { material: Material; qty: number }[];
  total: number;
}

export default function AssignmentsScreen() {
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const warehouses = await listWarehouses();
    const mats = await listMaterials();
    const matMap: Record<string, Material> = {};
    mats.forEach(m => (matMap[m.id] = m));

    const assigned = warehouses.filter(w => w.kind === 'arac' || w.kind === 'personel');
    const out: Row[] = [];
    for (const w of assigned) {
      const bals = await listBalancesByWarehouse(w.id);
      const items = bals
        .filter(b => b.qty > 0)
        .map(b => ({ material: matMap[b.materialId], qty: b.qty }))
        .filter(it => !!it.material);
      out.push({ warehouse: w, items, total: items.reduce((s, it) => s + it.qty, 0) });
    }
    setRows(out);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Zimmet Listesi</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('WarehouseForm')}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Zimmet noktası yok.</Text>
            <Text style={styles.emptyHint}>
              Önce Depo & Zimmet ekranından personel veya araç ekleyin.
            </Text>
          </View>
        ) : (
          rows.map(r => (
            <View key={r.warehouse.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    r.warehouse.kind === 'arac'
                      ? { borderColor: '#22c55e', backgroundColor: '#22c55e22' }
                      : { borderColor: '#a855f7', backgroundColor: '#a855f722' },
                  ]}
                >
                  <Ionicons
                    name={r.warehouse.kind === 'arac' ? 'car-outline' : 'person-outline'}
                    size={18}
                    color={r.warehouse.kind === 'arac' ? '#22c55e' : '#a855f7'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{r.warehouse.name}</Text>
                  <Text style={styles.cardMeta}>
                    {r.warehouse.kind === 'arac' ? 'Araç' : 'Personel'}
                    {r.warehouse.responsibleName ? ` · ${r.warehouse.responsibleName}` : ''}
                    {' · '}
                    {r.items.length} kalem
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() =>
                    navigation.navigate('WarehouseDetail', { warehouseId: r.warehouse.id })
                  }
                >
                  <Ionicons name="chevron-forward" size={16} color={brand.green} />
                </TouchableOpacity>
              </View>

              {r.items.length === 0 ? (
                <Text style={styles.empty2}>Henüz zimmet yok.</Text>
              ) : (
                r.items.slice(0, 6).map(it => (
                  <View key={it.material.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{it.material.name}</Text>
                    <Text style={styles.itemQty}>
                      {it.qty} {it.material.unit}
                    </Text>
                  </View>
                ))
              )}
              {r.items.length > 6 && (
                <Text style={styles.moreText}>+{r.items.length - 6} kalem daha</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 6 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  emptyHint: {
    color: colors.text.faint,
    fontSize: typography.xs,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
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
  detailBtn: { padding: 6 },
  empty2: { color: colors.text.muted, fontSize: typography.xs, paddingTop: 4 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  itemName: { color: colors.text.primary, fontSize: typography.xs },
  itemQty: { color: colors.text.primary, fontWeight: '800', fontSize: typography.xs },
  moreText: { color: colors.text.faint, fontSize: typography.xs, marginTop: 4 },
});
