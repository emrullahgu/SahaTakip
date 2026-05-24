// DbIndexHintsScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { DbIndexHint } from '../types';
import { listIndexHints, applyIndex } from '../services/platform';

export default function DbIndexHintsScreen() {
  const [items, setItems] = useState<DbIndexHint[]>([]);
  const [filter, setFilter] = useState<'all' | 'suggested'>('all');
  const load = useCallback(async () => { setItems(await listIndexHints()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onApply = (id: string, t: string, c: string) => {
    Alert.alert('Index Uygula', `${t}.${c} sütununa index uygulansın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Uygula', onPress: async () => { await applyIndex(id); load(); } },
    ]);
  };
  const filtered = filter === 'suggested' ? items.filter(i => i.suggested && !i.applied) : items;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.tabs}>
        {(['all', 'suggested'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.tab, filter === f && s.tabA]} onPress={() => setFilter(f)}>
            <Text style={[s.tabT, filter === f && s.tabTA]}>{f === 'all' ? 'Tümü' : 'Önerilen'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="server-outline" size={18} color="#0ea5e9" />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.table}.{item.column}</Text>
                <Text style={s.sub}>{item.rowCount.toLocaleString('tr-TR')} satır · Tahmini hız +%{item.estimatedGainPct}</Text>
              </View>
              {item.applied ? (
                <View style={s.ok}><Ionicons name="checkmark" size={14} color="#22c55e" /><Text style={s.okT}>Uygulandı</Text></View>
              ) : (
                <TouchableOpacity style={s.btn} onPress={() => onApply(item.id, item.table, item.column)}>
                  <Text style={s.btnT}>Uygula</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  tabs: { flexDirection: 'row', padding: spacing.sm, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary },
  tabA: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  tabT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  tabTA: { color: '#fff' },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  btn: { backgroundColor: '#0ea5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#22c55e' },
  okT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
});
