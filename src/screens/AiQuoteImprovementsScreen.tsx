// Faz 43 — AiQuoteImprovementsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiQuoteImprovementSuggestion } from '../types';
import { listImprovements, generateImprovement } from '../services/smartQuote';

const CAT_LABEL: Record<AiQuoteImprovementSuggestion['category'], string> = { price: 'Fiyat', scope: 'Kapsam', wording: 'İfade', discount: 'İndirim', timing: 'Zamanlama' };
const CAT_COLOR: Record<AiQuoteImprovementSuggestion['category'], string> = { price: '#ef4444', scope: '#0ea5e9', wording: '#8b5cf6', discount: '#f59e0b', timing: '#22c55e' };

export default function AiQuoteImprovementsScreen() {
  const [items, setItems] = useState<AiQuoteImprovementSuggestion[]>([]);
  const [cust, setCust] = useState('');
  const load = useCallback(async () => { setItems(await listImprovements()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onGen = async () => {
    if (!cust.trim()) { Alert.alert('Eksik', 'Müşteri adı girin.'); return; }
    await generateImprovement(cust);
    setCust('');
    load();
  };
  const scoreColor = (s: number) => s > 80 ? '#22c55e' : s > 60 ? '#eab308' : '#f59e0b';

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.genBox}>
        <TextInput style={s.input} value={cust} onChangeText={setCust} placeholder="Müşteri adı..." placeholderTextColor={colors.text.faint} />
        <TouchableOpacity style={s.genBtn} onPress={onGen}>
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={s.genT}>Üret</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz öneri yok.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={[s.score, { backgroundColor: scoreColor(item.impactScore) }]}>
              <Text style={s.scoreV}>{item.impactScore}</Text>
              <Text style={s.scoreL}>etki</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.head}>
                <Text style={s.cust}>{item.customerName}</Text>
                <View style={[s.chip, { backgroundColor: CAT_COLOR[item.category] }]}>
                  <Text style={s.chipT}>{CAT_LABEL[item.category]}</Text>
                </View>
              </View>
              <Text style={s.sug}>{item.suggestion}</Text>
              <Text style={s.tm}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  genBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  input: { flex: 1, backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, backgroundColor: '#06b6d4', borderRadius: radius.sm },
  genT: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  score: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  scoreV: { color: '#fff', fontSize: typography.lg, fontWeight: '800' },
  scoreL: { color: '#fff', fontSize: 9, fontWeight: '700' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cust: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', flex: 1 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  sug: { color: colors.text.primary, fontSize: typography.xs, lineHeight: 18 },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 4 },
});
