// AssetsScreen — POZ-DEV-086 Cihaz/ekipman listesi
import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listAssets, ASSET_TYPES, ASSET_TYPE_LABEL } from '../services/assets';
import { Asset, AssetType, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Assets'>;
type RP = RouteProp<RootStackParamList, 'Assets'>;

export default function AssetsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RP>();
  const filterCustomerId = route.params?.customerId;
  const [items, setItems] = useState<Asset[]>([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>(route.params?.type ?? 'all');

  const refresh = useCallback(async () => {
    setItems(await listAssets());
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => {
    return items.filter(a => {
      if (filterCustomerId && a.customerId !== filterCustomerId) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        return (
          a.name.toLowerCase().includes(s) ||
          (a.code || '').toLowerCase().includes(s) ||
          (a.serialNo || '').toLowerCase().includes(s) ||
          (a.customerName || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [items, q, typeFilter, filterCustomerId]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Cihaz / kod / seri ara…"
          placeholderTextColor={colors.text.faint}
          value={q}
          onChangeText={setQ}
        />
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('AssetForm', filterCustomerId ? { customerId: filterCustomerId } : undefined)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        <Chip label="Tümü" active={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
        {ASSET_TYPES.map(t => (
          <Chip
            key={t.value}
            label={t.label}
            active={typeFilter === t.value}
            onPress={() => setTypeFilter(t.value)}
            icon={t.icon}
          />
        ))}
      </View>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Cihaz bulunamadı"
            subtitle="Filtreleri değiştirerek tekrar deneyebilir veya yeni bir cihaz ekleyebilirsiniz."
            actionLabel="+ Yeni Cihaz"
            onAction={() => navigation.navigate('AssetForm', filterCustomerId ? { customerId: filterCustomerId } : undefined)}
          />
        }
        renderItem={({ item }) => {
          const t = ASSET_TYPES.find(x => x.value === item.type);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('AssetDetail', { assetId: item.id })}
            >
              <View style={styles.iconBox}>
                <Ionicons name={(t?.icon as any) || 'cube-outline'} size={20} color={brand.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.sub}>
                  {ASSET_TYPE_LABEL[item.type as keyof typeof ASSET_TYPE_LABEL]}
                  {item.serialNo ? ` · SN: ${item.serialNo}` : ''}
                </Text>
                {item.customerName ? (
                  <Text style={styles.subFaint}>{item.customerName}</Text>
                ) : null}
              </View>
              {item.code ? (
                <View style={styles.codeBadge}>
                  <Ionicons name="qr-code-outline" size={11} color={brand.blueLight} />
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: string }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      {icon ? (
        <Ionicons name={icon as any} size={11} color={active ? '#fff' : colors.text.muted} />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', gap: 8, padding: spacing.lg, paddingBottom: 6 },
  search: {
    flex: 1, backgroundColor: colors.bg.secondary, borderWidth: 1,
    borderColor: colors.border.primary, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 9, color: colors.text.primary, fontSize: typography.sm,
  },
  newBtn: {
    flexDirection: 'row', gap: 4, backgroundColor: brand.green,
    paddingHorizontal: 12, borderRadius: radius.md, alignItems: 'center',
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.lg, marginBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  chipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md,
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.emerald.bg, alignItems: 'center', justifyContent: 'center',
  },
  title: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  subFaint: { color: colors.text.faint, fontSize: 11, marginTop: 1 },
  codeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.blue.bg, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  codeText: { color: brand.blueLight, fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted },
});
