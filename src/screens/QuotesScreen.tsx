import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { Quote, QuoteStatus, RootStackParamList } from '../types';
import Toast from '../components/Toast';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS: (QuoteStatus | 'Tümü')[] = [
  'Tümü', 'Taslak', 'Onay Bekliyor', 'Müşteriye Gönderildi', 'Kabul Edildi', 'Reddedildi', 'Faturalandırıldı',
];

const STATUS_COLORS: Record<QuoteStatus, { bg: string; fg: string; border: string }> = {
  'Taslak':                { bg: colors.bg.card, fg: colors.text.muted, border: colors.border.secondary },
  'Onay Bekliyor':         { bg: colors.amber.bg, fg: colors.amber.default, border: colors.amber.border },
  'Müşteriye Gönderildi':  { bg: colors.blue.bg, fg: colors.blue.default, border: colors.blue.border },
  'Kabul Edildi':          { bg: colors.emerald.bg, fg: colors.emerald.default, border: colors.emerald.border },
  'Reddedildi':            { bg: colors.rose.bg, fg: colors.rose.default, border: colors.rose.border },
  'Faturalandırıldı':      { bg: colors.indigo.bg, fg: colors.indigo.light, border: colors.indigo.border },
};

export default function QuotesScreen() {
  const navigation = useNavigation<NavProp>();
  const { quotes, toast, deleteQuote } = useAppContext();
  const [filter, setFilter] = useState<QuoteStatus | 'Tümü'>('Tümü');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(
    () =>
      quotes.filter(q => {
        const matchFilter = filter === 'Tümü' || q.status === filter;
        const matchSearch =
          q.customerName.toLowerCase().includes(search.toLowerCase()) ||
          q.title.toLowerCase().includes(search.toLowerCase()) ||
          q.number.toLowerCase().includes(search.toLowerCase());
        const matchFrom = !dateFrom || q.date >= dateFrom;
        const matchTo = !dateTo || q.date <= dateTo;
        return matchFilter && matchSearch && matchFrom && matchTo;
      }),
    [quotes, filter, search, dateFrom, dateTo]
  );

  const stats = useMemo(() => {
    const total = quotes.length;
    const accepted = quotes.filter(q => q.status === 'Kabul Edildi' || q.status === 'Faturalandırıldı').length;
    const pending = quotes.filter(q => q.status === 'Onay Bekliyor' || q.status === 'Müşteriye Gönderildi').length;
    const totalAmount = quotes
      .filter(q => q.status === 'Kabul Edildi' || q.status === 'Faturalandırıldı')
      .reduce((s, q) => s + q.grandTotal, 0);
    return { total, accepted, pending, totalAmount };
  }, [quotes]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {toast && <Toast toast={toast} />}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Teklifler</Text>
          <Text style={styles.subtitle}>Keşif metrajı ve fiyatlandırma</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('NewQuote')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Yeni Teklif</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.emerald.default }]}>{stats.accepted}</Text>
          <Text style={styles.statLabel}>Kabul</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.amber.default }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Bekliyor</Text>
        </View>
        <View style={[styles.statCard, { flex: 1.4 }]}>
          <Text style={[styles.statValue, { color: colors.indigo.light, fontSize: typography.md }]}>
            ₺{(stats.totalAmount / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statLabel}>Kabul Tutarı</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.text.faint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Müşteri, başlık veya teklif no..."
          placeholderTextColor={colors.text.faint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* FAZ 4 — Tarih aralığı + şablonlar */}
      <View style={styles.dateRow}>
        <TextInput
          style={styles.dateInput}
          placeholder="Başlangıç (YYYY-MM-DD)"
          placeholderTextColor={colors.text.faint}
          value={dateFrom}
          onChangeText={setDateFrom}
        />
        <TextInput
          style={styles.dateInput}
          placeholder="Bitiş (YYYY-MM-DD)"
          placeholderTextColor={colors.text.faint}
          value={dateTo}
          onChangeText={setDateTo}
        />
        <TouchableOpacity
          style={styles.tplBtn}
          onPress={() => navigation.navigate('QuoteTemplates')}
          activeOpacity={0.85}
        >
          <Ionicons name="copy-outline" size={14} color="#fff" />
          <Text style={styles.tplBtnText}>Şablonlar</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={q => q.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <QuoteCard
            quote={item}
            onPress={() => navigation.navigate('QuoteDetail', { quoteId: item.id })}
            onDelete={() => deleteQuote(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={56} color={colors.text.faint} />
            <Text style={styles.emptyTitle}>Henüz teklif yok</Text>
            <Text style={styles.emptyDesc}>
              Yeni bir teklif oluşturmak için sağ üstteki “Yeni Teklif” butonuna basın.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => navigation.navigate('NewQuote')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyCtaText}>+ İlk Teklifi Oluştur</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function QuoteCard({
  quote,
  onPress,
  onDelete,
}: {
  quote: Quote;
  onPress: () => void;
  onDelete: () => void;
}) {
  const sc = STATUS_COLORS[quote.status];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNumber}>{quote.number}</Text>
          <Text style={styles.cardCustomer} numberOfLines={1}>{quote.customerName}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>{quote.title}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: sc.bg, borderColor: sc.border },
          ]}
        >
          <Text style={[styles.statusText, { color: sc.fg }]}>{quote.status}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={colors.text.faint} />
          <Text style={styles.metaText}>{quote.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="list-outline" size={12} color={colors.text.faint} />
          <Text style={styles.metaText}>{quote.lines.length} kalem</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={12} color={colors.text.faint} />
          <Text style={styles.metaText}>{quote.engineer}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.totalLabel}>KDV Dahil Toplam</Text>
          <Text style={styles.totalValue}>
            ₺{quote.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },

  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginVertical: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
  },
  statValue: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '900' },
  statLabel: { fontSize: 9, color: colors.text.muted, marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 4 },

  dateRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text.primary,
    fontSize: typography.xs,
  },
  tplBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.indigo.default,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  tplBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },

  filterScroll: { maxHeight: 44, marginTop: spacing.sm },
  filterRow: { paddingHorizontal: spacing.lg, gap: 6 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '800' },

  list: { padding: spacing.lg, paddingBottom: 80 },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cardTop: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  cardNumber: { fontSize: 10, color: colors.text.faint, fontWeight: '700', letterSpacing: 0.5 },
  cardCustomer: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '800', marginTop: 2 },
  cardTitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2, lineHeight: 16 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 9, fontWeight: '800' },

  cardMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10, color: colors.text.faint },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  totalLabel: { fontSize: 9, color: colors.text.faint, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: typography.lg, color: colors.emerald.default, fontWeight: '900', marginTop: 2 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.rose.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md, paddingHorizontal: 32 },
  emptyTitle: { fontSize: typography.md, color: colors.text.secondary, fontWeight: '700' },
  emptyDesc: { fontSize: typography.xs, color: colors.text.faint, textAlign: 'center', lineHeight: 18 },
  emptyCta: {
    backgroundColor: brand.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  emptyCtaText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
