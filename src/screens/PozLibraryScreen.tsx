// Faz 43 — PozLibraryScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { PozLibraryItem } from '../types';
import { listPoz, togglePoz } from '../services/smartQuote';

export default function PozLibraryScreen() {
  const [items, setItems] = useState<PozLibraryItem[]>([]);
  const [q, setQ] = useState('');
  const load = useCallback(async () => { setItems(await listPoz()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = items.filter(i => !q || i.code.toLowerCase().includes(q.toLowerCase()) || i.name.toLowerCase().includes(q.toLowerCase()) || i.category.toLowerCase().includes(q.toLowerCase()));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.search}>
        <Ionicons name="search" size={16} color={colors.text.muted} />
        <TextInput style={s.input} value={q} onChangeText={setQ} placeholder="POZ ara..." placeholderTextColor={colors.text.faint} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <View style={s.head}>
                <View style={s.catChip}><Text style={s.catChipT}>{item.category}</Text></View>
                <Text style={s.code}>{item.code}</Text>
              </View>
              <Text style={s.name}>{item.name}</Text>
              <View style={s.priceRow}>
                <Text style={s.pL}>İşçilik: ₺{item.laborCost.toLocaleString('tr-TR')}</Text>
                <Text style={s.pM}>Malzeme: ₺{item.materialCost.toLocaleString('tr-TR')}</Text>
                <Text style={s.pT}>Toplam: ₺{(item.laborCost + item.materialCost).toLocaleString('tr-TR')}/{item.unit}</Text>
              </View>
            </View>
            <Switch value={item.active} onValueChange={async () => { await togglePoz(item.id); load(); }} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  search: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, margin: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  input: { flex: 1, color: colors.text.primary, padding: 0 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catChip: { backgroundColor: '#8b5cf6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  catChipT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  code: { color: '#0ea5e9', fontSize: typography.xs, fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: 4 },
  priceRow: { marginTop: 4, gap: 2 },
  pL: { color: colors.text.muted, fontSize: 10 },
  pM: { color: colors.text.muted, fontSize: 10 },
  pT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
});
