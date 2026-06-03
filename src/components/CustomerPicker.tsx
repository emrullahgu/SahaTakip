// CustomerPicker — aranabilir müşteri seçici (ad/ünvan/vergi no/telefon).
// 8-müşteri sınırı + aramasızlık sorununu giderir; birden çok formda paylaşılır.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import type { Customer } from '../types';

interface Props {
  customers: Customer[];
  selectedId?: string;
  /** Seçim değişince çağrılır. Temizlenince null gelir. */
  onSelect: (customer: Customer | null) => void;
  /** "Temizle" / boş bırakmaya izin ver (varsayılan true). */
  allowNone?: boolean;
  placeholder?: string;
  /** Aramasız iken gösterilecek maksimum öneri (varsayılan 20). */
  limit?: number;
}

export default function CustomerPicker({
  customers,
  selectedId,
  onSelect,
  allowNone = true,
  placeholder = 'Ad, ünvan, vergi no, telefon ara...',
  limit = 20,
}: Props) {
  const [search, setSearch] = useState('');

  const selected = useMemo(
    () => customers.find(c => c.id === selectedId),
    [customers, selectedId],
  );

  const results = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return customers.slice(0, limit);
    return customers
      .filter(c =>
        (c.shortName || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (c.title || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (c.taxNumber || '').includes(q) ||
        (c.phone || '').includes(q),
      )
      .slice(0, limit);
  }, [customers, search, limit]);

  if (selected) {
    return (
      <View style={s.selectedRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.selectedName}>{selected.shortName}</Text>
          {!!selected.title && <Text style={s.selectedSub} numberOfLines={1}>{selected.title}</Text>}
        </View>
        {allowNone && (
          <TouchableOpacity style={s.clearBtn} onPress={() => { onSelect(null); setSearch(''); }}>
            <Ionicons name="close-circle" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <>
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.text.faint} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={placeholder}
          placeholderTextColor={colors.text.faint}
          autoCapitalize="none"
        />
      </View>
      <View style={{ gap: 6, marginTop: 6 }}>
        {results.length === 0 && <Text style={s.noResult}>Eşleşen müşteri yok.</Text>}
        {results.map(c => (
          <TouchableOpacity key={c.id} style={s.custRow} onPress={() => { onSelect(c); setSearch(''); }}>
            <View style={{ flex: 1 }}>
              <Text style={s.custName}>{c.shortName}</Text>
              {!!c.title && <Text style={s.custSub} numberOfLines={1}>{c.title}</Text>}
            </View>
            {!!c.city && <Text style={s.custCity}>{c.city}</Text>}
          </TouchableOpacity>
        ))}
        {!search.trim() && customers.length > results.length && (
          <Text style={s.noResult}>Daha fazlası için arayın ({customers.length} müşteri)…</Text>
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 2 },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, backgroundColor: colors.bg.secondary },
  custName: { color: colors.text.primary, fontWeight: '600', fontSize: typography.sm },
  custSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 1 },
  custCity: { color: colors.text.faint, fontSize: typography.xs },
  noResult: { color: colors.text.muted, fontSize: typography.xs, paddingVertical: 4 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, borderWidth: 1, borderColor: '#0ea5e9', borderRadius: radius.sm, backgroundColor: '#0ea5e922' },
  selectedName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  selectedSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 1 },
  clearBtn: { padding: 4 },
});
