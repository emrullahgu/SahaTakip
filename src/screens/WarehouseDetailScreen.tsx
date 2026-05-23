// WarehouseDetailScreen — POZ-DEV-054, 055
// Tek depo/zimmet noktasının stok dökümü + hareketleri.

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
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { getWarehouse } from '../services/warehouses';
import { listBalancesByWarehouse, listMovementsByWarehouse } from '../services/stock';
import { listMaterials } from '../services/materials';
import {
  Warehouse,
  Material,
  StockBalance,
  StockMovement,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WarehouseDetail'>;
type Rt = RouteProp<RootStackParamList, 'WarehouseDetail'>;

const MOV_LABEL: Record<StockMovement['kind'], string> = {
  giris: 'Giriş',
  cikis: 'Çıkış',
  transfer: 'Transfer',
  'is-emri': 'İş emri',
  sayim: 'Sayım',
};

export default function WarehouseDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { warehouseId } = route.params;

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material>>({});

  const load = useCallback(async () => {
    const [w, bals, movs, mats] = await Promise.all([
      getWarehouse(warehouseId),
      listBalancesByWarehouse(warehouseId),
      listMovementsByWarehouse(warehouseId),
      listMaterials(),
    ]);
    setWarehouse(w);
    setBalances(bals);
    setMovements(movs);
    const map: Record<string, Material> = {};
    mats.forEach(m => (map[m.id] = m));
    setMaterials(map);
  }, [warehouseId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!warehouse) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.text.muted, padding: spacing.lg }}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{warehouse.name}</Text>
          <Text style={styles.meta}>
            {warehouse.kind === 'depo'
              ? 'Depo'
              : warehouse.kind === 'arac'
              ? 'Araç'
              : 'Personel Zimmet'}
            {warehouse.responsibleName ? ` · ${warehouse.responsibleName}` : ''}
            {warehouse.code ? ` · ${warehouse.code}` : ''}
          </Text>
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

        <Text style={styles.section}>Bakiye ({balances.length})</Text>
        {balances.length === 0 ? (
          <Text style={styles.empty}>Bu noktada malzeme yok.</Text>
        ) : (
          balances.map(b => {
            const m = materials[b.materialId];
            const low = m?.minStock && b.qty < m.minStock;
            return (
              <View key={`${b.materialId}_${b.warehouseId}`} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{m?.name ?? '—'}</Text>
                  <Text style={styles.rowMeta}>{m?.code ?? ''}</Text>
                </View>
                <Text style={[styles.qty, low ? { color: colors.rose.default } : null]}>
                  {b.qty} {m?.unit ?? ''}
                </Text>
              </View>
            );
          })
        )}

        <Text style={styles.section}>Son Hareketler ({movements.length})</Text>
        {movements.length === 0 ? (
          <Text style={styles.empty}>Hareket yok.</Text>
        ) : (
          movements.slice(0, 30).map(mv => {
            const incoming = mv.toWarehouseId === warehouseId;
            return (
              <View key={mv.id} style={styles.row}>
                <View
                  style={[
                    styles.movIcon,
                    {
                      backgroundColor: incoming ? colors.emerald.bg : colors.rose.bg,
                      borderColor: incoming ? colors.emerald.border : colors.rose.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={incoming ? 'arrow-down-outline' : 'arrow-up-outline'}
                    size={14}
                    color={incoming ? '#10b981' : colors.rose.default}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{mv.materialName}</Text>
                  <Text style={styles.rowMeta}>
                    {MOV_LABEL[mv.kind]} ·{' '}
                    {new Date(mv.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={[styles.qty, { color: incoming ? '#10b981' : colors.rose.default }]}>
                  {incoming ? '+' : '−'}
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
  content: { padding: spacing.lg, paddingBottom: 100 },
  header: { marginBottom: spacing.md },
  name: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
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
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.md,
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
  movIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
