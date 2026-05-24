// Faz 59 — OrdListScreen (POZ-DEV-292)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listOrders, ORD_STATUS_LABEL, ORD_STATUS_COLOR, ORD_STATUS_ICON, ORD_CHANNEL_LABEL } from '../services/orders';
import type { RootStackParamList, Order, OrdStatus } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS: ('all' | OrdStatus)[] = ['all', 'draft', 'submitted', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];

export default function OrdListScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | OrdStatus>('all');
  const [search, setSearch] = useState('');
  useFocusEffect(useCallback(() => { (async () => setItems(await listOrders()))(); }, []));

  const filtered = items.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !o.customerName.toLowerCase().includes(search.toLowerCase()) && !o.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={colors.text.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Müşteri / Sipariş No"
            placeholderTextColor={colors.text.muted}
            style={s.searchInput}
          />
        </View>
        <TouchableOpacity style={s.newBtn} activeOpacity={0.85} onPress={() => nav.navigate('OrdForm')}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={{ maxHeight: 50 }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && { backgroundColor: f === 'all' ? '#f97316' : ORD_STATUS_COLOR[f as OrdStatus] }]}
            onPress={() => setFilter(f)}
            activeOpacity={0.85}
          >
            <Text style={[s.chipT, filter === f && { color: '#fff' }]}>
              {f === 'all' ? 'Tümü' : ORD_STATUS_LABEL[f as OrdStatus]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={o => o.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <EmptyState
            icon="bag-handle-outline"
            title="Sipariş yok"
            subtitle="Bu filtreye uygun herhangi bir sipariş kaydı bulunamadı."
            actionLabel="+ Yeni Sipariş"
            onAction={() => nav.navigate('OrdForm')}
          />
        }
        renderItem={({ item: o }) => (
          <TouchableOpacity
            key={o.id}
            style={[s.card, { borderLeftColor: ORD_STATUS_COLOR[o.status as OrdStatus] }]}
            activeOpacity={0.85}
            onPress={() => nav.navigate('OrdDetail', { id: o.id })}
          >
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.code}>{o.code}</Text>
                <Text style={s.cust}>{o.customerName}</Text>
              </View>
              <View style={[s.statusPill, { borderColor: ORD_STATUS_COLOR[o.status as OrdStatus] }]}>
                <Ionicons name={ORD_STATUS_ICON[o.status as OrdStatus] as any} size={12} color={ORD_STATUS_COLOR[o.status as OrdStatus]} />
                <Text style={[s.statusT, { color: ORD_STATUS_COLOR[o.status as OrdStatus] }]}>{ORD_STATUS_LABEL[o.status as OrdStatus]}</Text>
              </View>
            </View>
            <View style={s.cardBody}>
              <View style={s.metaCol}>
                <Text style={s.metaL}>Tarih</Text>
                <Text style={s.metaV}>{o.orderDate}</Text>
              </View>
              <View style={s.metaCol}>
                <Text style={s.metaL}>Kanal</Text>
                <Text style={s.metaV}>{ORD_CHANNEL_LABEL[o.channel as keyof typeof ORD_CHANNEL_LABEL]}</Text>
              </View>
              <View style={s.metaCol}>
                <Text style={s.metaL}>Tutar</Text>
                <Text style={[s.metaV, { color: '#22c55e', fontWeight: '800' }]}>₺{o.total.toLocaleString('tr-TR')}</Text>
              </View>
            </View>
            <View style={s.cardFoot}>
              <Ionicons name="person" size={12} color={colors.text.muted} />
              <Text style={s.foot}>{o.salesRepName}</Text>
              <Text style={s.foot}>·</Text>
              <Text style={s.foot}>{o.items.length} kalem</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, gap: 6, borderWidth: 1, borderColor: colors.border.primary },
  searchInput: { flex: 1, color: colors.text.primary, paddingVertical: 8, fontSize: typography.sm },
  newBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  filterRow: { paddingHorizontal: spacing.md, gap: 8, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  emptyT: { color: colors.text.muted, fontSize: typography.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  code: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  cust: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
  cardBody: { flexDirection: 'row', backgroundColor: colors.bg.primary, padding: spacing.sm, borderRadius: radius.sm, gap: spacing.sm },
  metaCol: { flex: 1 },
  metaL: { color: colors.text.muted, fontSize: typography.xs },
  metaV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: 2 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foot: { color: colors.text.muted, fontSize: typography.xs },
});
