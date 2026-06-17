import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { a11yButton, a11yInput, HIT_SLOP_8 } from '../utils/a11y';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { buildGlobalResults, type GlobalResult } from '../utils/globalSearch';
import type { RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const KIND_META: Record<GlobalResult['kind'], { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  customer: { icon: 'business-outline', label: 'Müşteri', color: colors.indigo.default },
  quote: { icon: 'document-text-outline', label: 'Teklif', color: colors.emerald.default },
  workOrder: { icon: 'construct-outline', label: 'İş Emri', color: colors.amber.default },
};

export default function GlobalSearchScreen() {
  const navigation = useNavigation<NavProp>();
  const { quotes, customers, workOrders } = useAppContext();
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => buildGlobalResults(query, { quotes, customers, workOrders }),
    [query, quotes, customers, workOrders],
  );

  const open = (r: GlobalResult) => {
    if (r.kind === 'customer') navigation.navigate('CustomerForm', { customerId: r.id });
    else if (r.kind === 'quote') navigation.navigate('QuoteDetail', { quoteId: r.id });
    else navigation.navigate('WorkOrderDetail', { workOrderId: r.id });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={HIT_SLOP_8} {...a11yButton('Geri')}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        )}
        <View style={s.search}>
          <Ionicons name="search-outline" size={16} color={colors.text.faint} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Müşteri, teklif veya iş emri ara..."
            placeholderTextColor={colors.text.faint}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            {...a11yInput('Genel arama', query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={HIT_SLOP_8} {...a11yButton('Aramayı temizle')}>
              <Ionicons name="close-circle" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim().length > 0 && (
        <Text style={s.count}>{results.length} sonuç</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(r) => `${r.kind}:${r.id}`}
        contentContainerStyle={results.length ? { padding: spacing.md } : { flex: 1 }}
        {...FLATLIST_DEFAULTS}
        renderItem={({ item }: { item: GlobalResult }) => {
          const meta = KIND_META[item.kind];
          return (
            <TouchableOpacity style={s.row} onPress={() => open(item)} activeOpacity={0.8} {...a11yButton(`${meta.label}: ${item.primary}`)}>
              <View style={[s.iconWrap, { backgroundColor: meta.color + '22' }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.primary} numberOfLines={1}>{item.primary}</Text>
                <Text style={s.secondary} numberOfLines={1}>{item.secondary}</Text>
              </View>
              <View style={[s.badge, { borderColor: meta.color }]}>
                <Text style={[s.badgeTxt, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          query.trim().length > 0
            ? <EmptyState icon="search-outline" title="Sonuç yok" subtitle="Farklı bir terimle aramayı deneyin." />
            : <EmptyState icon="search-outline" title="Genel Arama" subtitle="Müşteri, teklif ve iş emirlerinde tek yerden arama yapın." />
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.base, padding: 0 },
  count: { color: colors.text.muted, fontSize: typography.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  primary: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  secondary: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeTxt: { fontSize: typography.xs, fontWeight: '800' },
});
