// ProductItemsScreen — POZ-DEV-242 Ürün listesi + filtre/arama
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, RefreshControl} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, ProductItem, ProductItemStatus } from '../types';
import {
  listProductItems, deleteProductItem, filterProductItems,
  PRODUCT_ITEM_STATUS_LABEL, PRODUCT_ITEM_STATUS_COLOR,
} from '../services/productItems';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { a11yButton, a11yInput } from '../utils/a11y';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ProductItems'>;
const STATUSES: ProductItemStatus[] = ['in_stock', 'in_use', 'in_transit', 'maintenance', 'retired'];

export default function ProductItemsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductItemStatus | 'all'>(route.params?.status || 'all');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setItems(await listProductItems()); }
    finally { setLoading(false); setLoaded(true); }
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => filterProductItems(items, { search, status: status === 'all' ? undefined : status, customerId: route.params?.customerId }), [items, search, status, route.params?.customerId]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="Ad / kod / seri no..." placeholderTextColor={colors.text.faint} returnKeyType="search" autoCorrect={false} {...a11yInput('Ürün ara', search)} />
        <TouchableOpacity style={s.addBtn} onPress={() => nav.navigate('ProductItemForm')} {...a11yButton('Yeni ürün ekle')}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
        <Tab label="Tümü" active={status === 'all'} onPress={() => setStatus('all')} count={items.length} />
        {STATUSES.map(st => (
          <Tab key={st} label={PRODUCT_ITEM_STATUS_LABEL[st as keyof typeof PRODUCT_ITEM_STATUS_LABEL]} color={PRODUCT_ITEM_STATUS_COLOR[st as keyof typeof PRODUCT_ITEM_STATUS_COLOR]} active={status === st} onPress={() => setStatus(st)} count={items.filter(x => x.status === st).length} />
        ))}
      </ScrollView>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.text.muted} />}
        ListEmptyComponent={loaded ? (
          <EmptyState
            icon="cube-outline"
            title="Ürün bulunamadı"
            subtitle="Filtreleri veya aramayı değiştirerek tekrar deneyebilirsiniz."
            actionLabel="+ Yeni Ürün"
            onAction={() => nav.navigate('ProductItemForm')}
          />
        ) : null}
        renderItem={({ item: p }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('ProductItemDetail', { itemId: p.id })}>
            <View style={[s.statusStripe, { backgroundColor: PRODUCT_ITEM_STATUS_COLOR[p.status as keyof typeof PRODUCT_ITEM_STATUS_COLOR] }]} />
            <View style={{ flex: 1 }}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{p.name}</Text>
                <View style={[s.badge, { backgroundColor: PRODUCT_ITEM_STATUS_COLOR[p.status as keyof typeof PRODUCT_ITEM_STATUS_COLOR] + '33', borderColor: PRODUCT_ITEM_STATUS_COLOR[p.status as keyof typeof PRODUCT_ITEM_STATUS_COLOR] }]}>
                  <Text style={[s.badgeText, { color: PRODUCT_ITEM_STATUS_COLOR[p.status as keyof typeof PRODUCT_ITEM_STATUS_COLOR] }]}>{PRODUCT_ITEM_STATUS_LABEL[p.status as keyof typeof PRODUCT_ITEM_STATUS_LABEL]}</Text>
                </View>
              </View>
              <Text style={s.cardMeta}>Kod: {p.code}{p.serialNo ? ` · SN: ${p.serialNo}` : ''}</Text>
              {(p.location || p.model) && <Text style={s.cardMeta}>{p.model || ''} {p.location ? `@ ${p.location}` : ''}</Text>}
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Sil', 'Ürün silinsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: async () => {
                try { await deleteProductItem(p.id); refresh(); }
                catch (e: any) { Alert.alert('Hata', e?.message || 'Ürün silinemedi.'); }
              } },
            ])} style={s.delBtn} {...a11yButton(`${p.name} ürününü sil`)}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress, color, count }: { label: string; active: boolean; onPress: () => void; color?: string; count: number }) {
  return (
    <TouchableOpacity style={[s.tab, active && { backgroundColor: color || '#0ea5e9', borderColor: color || '#0ea5e9' }]} onPress={onPress}>
      <Text style={[s.tabText, active && { color: '#fff' }]}>{label} ({count})</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', gap: 6, padding: spacing.md },
  search: { flex: 1, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text.primary },
  addBtn: { backgroundColor: '#22c55e', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tabs: { paddingHorizontal: spacing.md, gap: 6, paddingBottom: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  tabText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  content: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, overflow: 'hidden' },
  statusStripe: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, flex: 1 },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  delBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: '#ef444422' },
});
