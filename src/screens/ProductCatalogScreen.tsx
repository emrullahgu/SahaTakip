// ProductCatalogScreen — 13K+ ürünü kategorize/marka filtreli arama
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { MATERIAL_CATALOG, MATERIAL_CATEGORIES, MATERIAL_BRANDS } from '../data/initialData';
import { FLATLIST_DEFAULTS } from '../utils/perf';

export default function ProductCatalogScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    let base = MATERIAL_CATALOG;
    if (category) base = base.filter(m => m.category === category);
    if (brand) base = base.filter(m => m.brand === brand);
    if (q) {
      base = base.filter(m =>
        (m.name || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (m.code || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (m.brand || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (m.category || '').toLocaleLowerCase('tr-TR').includes(q),
      );
    }
    return base.slice(0, 500);
  }, [search, category, brand]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Ürün Kataloğu</Text>
        <Text style={s.headerMeta}>
          {MATERIAL_CATALOG.length.toLocaleString('tr-TR')} ürün · {MATERIAL_CATEGORIES.length} kategori · {MATERIAL_BRANDS.length} marka
        </Text>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.text.faint} />
        <TextInput
          style={s.searchInput}
          placeholder="Ad, kod, marka veya kategori..."
          placeholderTextColor={colors.text.faint}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <View style={s.filterGroup}>
        <View style={s.filterLabelRow}>
          <Text style={s.filterLabel}>Kategori {category ? `· ${category}` : ''}</Text>
          <TouchableOpacity onPress={() => setShowAllCats(v => !v)} style={s.toggleBtn}>
            <Text style={s.toggleText}>{showAllCats ? 'Daralt ▲' : `Tümünü gör (${MATERIAL_CATEGORIES.length}) ▼`}</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.chipWrap, !showAllCats && s.chipWrapCollapsed]}>
          <Chip label="Tümü" active={!category} onPress={() => setCategory(null)} />
          {MATERIAL_CATEGORIES.map(c => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
          ))}
        </View>
      </View>

      <View style={s.filterGroup}>
        <View style={s.filterLabelRow}>
          <Text style={s.filterLabel}>Marka {brand ? `· ${brand}` : ''}</Text>
          <TouchableOpacity onPress={() => setShowAllBrands(v => !v)} style={s.toggleBtn}>
            <Text style={s.toggleText}>{showAllBrands ? 'Daralt ▲' : `Tümünü gör (${MATERIAL_BRANDS.length}) ▼`}</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.chipWrap, !showAllBrands && s.chipWrapCollapsed]}>
          <Chip label="Tümü" active={!brand} onPress={() => setBrand(null)} />
          {MATERIAL_BRANDS.map(b => (
            <Chip key={b} label={b} active={brand === b} onPress={() => setBrand(brand === b ? null : b)} />
          ))}
        </View>
      </View>

      <Text style={s.resultCount}>
        {filtered.length === 500 ? 'İlk 500 sonuç' : `${filtered.length} sonuç`}
      </Text>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={s.content}
        renderItem={({ item }) => {
          const tags = [item.brand, item.category].filter(Boolean).join(' · ');
          const showOriginal =
            item.currency && item.currency !== 'TL' && item.currency !== 'TRY' && item.listPrice;
          return (
            <View style={s.card}>
              <View style={{ flex: 1 }}>
                {!!item.code && <Text style={s.code}>{item.code}</Text>}
                <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                {!!tags && <Text style={s.tags}>{tags}</Text>}
              </View>
              <View style={s.priceBox}>
                <Text style={s.priceTL}>₺{item.price.toLocaleString('tr-TR')}</Text>
                {showOriginal && (
                  <Text style={s.priceOrig}>{item.listPrice} {item.currency}</Text>
                )}
                {!!item.discountRate && item.discountRate > 0 && (
                  <Text style={s.discount}>%{item.discountRate} isk.</Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={s.empty}>Sonuç bulunamadı.</Text>
        }
      />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.lg },
  headerMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: spacing.md, marginBottom: 8,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
    backgroundColor: colors.bg.secondary, borderWidth: 1,
    borderColor: colors.border.primary, borderRadius: radius.sm,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 2 },
  filterGroup: { marginBottom: 8 },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: 6,
  },
  filterLabel: {
    color: colors.text.faint,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  toggleBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  toggleText: { color: '#10b981', fontSize: 11, fontWeight: '700' },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  chipWrapCollapsed: { maxHeight: 34, overflow: 'hidden' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  resultCount: { paddingHorizontal: spacing.md, paddingVertical: 4, color: colors.text.faint, fontSize: typography.xs },
  content: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md,
  },
  code: { color: colors.text.faint, fontSize: 11, fontWeight: '700' },
  name: { color: colors.text.primary, fontWeight: '600', fontSize: typography.sm, marginTop: 2 },
  tags: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  priceBox: { alignItems: 'flex-end', minWidth: 90 },
  priceTL: { color: '#10b981', fontWeight: '800', fontSize: typography.sm },
  priceOrig: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  discount: { color: '#f59e0b', fontSize: 10, fontWeight: '700', marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.xl },
});
