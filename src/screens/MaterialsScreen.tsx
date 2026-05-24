// MaterialsScreen — POZ-DEV-054, 057
// Malzeme listesi + ekle/düzenle/sil + barkod arama.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listMaterials,
  deleteMaterial,
  findByBarcode,
} from '../services/materials';
import { totalQtyOfMaterial } from '../services/stock';
import { Material, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Materials'>;

export default function MaterialsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Material[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const list = await listMaterials();
    setItems(list);
    const t: Record<string, number> = {};
    for (const m of list) {
      t[m.id] = await totalQtyOfMaterial(m.id);
    }
    setTotals(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = items.filter(m => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      (m.barcode ?? '').toLowerCase().includes(q) ||
      (m.category ?? '').toLowerCase().includes(q)
    );
  });

  const onDelete = (m: Material) => {
    Alert.alert('Sil', `"${m.name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteMaterial(m.id);
          load();
        },
      },
    ]);
  };

  const scanLookup = async () => {
    // BarcodeScan ekranı bulduğunda code parametresi ile geri dönüş yerine
    // direkt malzeme arama yapalım. Burada basit yaklaşım: arama alanına yaz.
    navigation.navigate('BarcodeScan', { mode: 'material-lookup' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Malzemeler ({items.length})</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={scanLookup}>
            <Ionicons name="scan-outline" size={18} color={brand.green} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('MaterialForm')}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          placeholder="Ad, kod veya barkod ara"
          placeholderTextColor={colors.text.faint}
        />
      </View>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const total = totals[item.id] ?? 0;
          const low = item.minStock && total < item.minStock;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('MaterialForm', { materialId: item.id })
              }
              onLongPress={() => onDelete(item)}
            >
              <View
                style={[
                  styles.iconBox,
                  low
                    ? { backgroundColor: colors.rose.bg, borderColor: colors.rose.border }
                    : { backgroundColor: colors.indigo.bg, borderColor: colors.indigo.border },
                ]}
              >
                <Ionicons
                  name={low ? 'alert-circle-outline' : 'cube-outline'}
                  size={18}
                  color={low ? colors.rose.default : brand.blueLight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.code}
                  {item.category ? ` · ${item.category}` : ''}
                  {item.barcode ? ` · ${item.barcode}` : ''}
                </Text>
              </View>
              <View style={styles.qtyBox}>
                <Text style={[styles.qty, low ? { color: colors.rose.default } : null]}>
                  {total}
                </Text>
                <Text style={styles.unit}>{item.unit}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Malzeme yok"
            subtitle="Henüz malzeme eklenmemiş veya arama sonucu bulunamadı."
            actionLabel="+ Yeni Malzeme"
            onAction={() => navigation.navigate('MaterialForm')}
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
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: radius.full,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    paddingHorizontal: 12,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
  },
  search: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.sm,
    paddingVertical: 10,
  },
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
  qtyBox: { alignItems: 'flex-end' },
  qty: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  unit: { color: colors.text.muted, fontSize: typography.xs },
});

// Re-export findByBarcode hook helper if other screens want it after scanning
export { findByBarcode };
