// Faz 56 — CovCategoryScreen (POZ-DEV-265)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getCovCategory, COV_STATUS_COLOR, COV_STATUS_LABEL, COV_STATUS_ICON } from '../services/coverage';
import type { CovCategory, RootStackParamList } from '../types';

type R = RouteProp<RootStackParamList, 'CovCategory'>;

export default function CovCategoryScreen() {
  const { params } = useRoute<R>();
  const [cat, setCat] = useState<CovCategory | null>(null);
  useFocusEffect(useCallback(() => { (async () => { const c = await getCovCategory(params.id); setCat(c ?? null); })(); }, [params.id]));
  if (!cat) return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.empty}><Ionicons name="alert-circle" size={48} color={colors.text.muted} /><Text style={s.emptyT}>Kategori bulunamadı</Text></View></SafeAreaView>;
  const total = cat.items.length;
  const done = cat.items.filter(i => i.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name={cat.icon as any} size={48} color="#6366f1" />
          <Text style={s.heroT}>{cat.no}. {cat.title}</Text>
          <Text style={s.heroD}>{done}/{total} tamamlandı · %{pct}</Text>
        </View>
        {cat.items.map((it, i) => (
          <View key={i} style={[s.item, { borderLeftColor: COV_STATUS_COLOR[it.status] }]}>
            <View style={s.itemHead}>
              <Ionicons name={COV_STATUS_ICON[it.status] as any} size={18} color={COV_STATUS_COLOR[it.status]} />
              <Text style={s.itemT}>{it.text}</Text>
            </View>
            <View style={s.itemMeta}>
              <View style={[s.badge, { borderColor: COV_STATUS_COLOR[it.status] }]}>
                <Text style={[s.badgeT, { color: COV_STATUS_COLOR[it.status] }]}>{COV_STATUS_LABEL[it.status]}</Text>
              </View>
              {it.faz !== undefined && <Text style={s.fazT}>Faz {it.faz}</Text>}
            </View>
            {it.note && <Text style={s.note}>{it.note}</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyT: { color: colors.text.muted, fontSize: typography.sm },
  hero: { alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', textAlign: 'center' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  item: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', flex: 1 },
  itemMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: 6, alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeT: { fontSize: typography.xs, fontWeight: '700' },
  fazT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  note: { color: colors.text.muted, fontSize: typography.xs, marginTop: 6, fontStyle: 'italic' },
});
