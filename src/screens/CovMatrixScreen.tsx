// Faz 56 — CovMatrixScreen (POZ-DEV-264)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listCovCategories, COV_STATUS_COLOR } from '../services/coverage';
import type { CovCategory, CovStatus, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CovMatrix'>;

export default function CovMatrixScreen() {
  const nav = useNavigation<Nav>();
  const [cats, setCats] = useState<CovCategory[]>([]);
  useFocusEffect(useCallback(() => { (async () => setCats(await listCovCategories()))(); }, []));
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.headerT}>23 Kategori — Kapsam Matrisi</Text>
        <Text style={s.headerD}>Kategoriye dokunarak madde madde durumu görün</Text>
        {cats.map(c => {
          const counts: Record<CovStatus, number> = { done: 0, partial: 0, planned: 0, missing: 0 };
          c.items.forEach(it => { counts[it.status]++; });
          return (
            <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.85} onPress={() => nav.navigate('CovCategory', { id: c.id })}>
              <View style={s.cardHead}>
                <View style={s.iconBox}><Ionicons name={c.icon as any} size={22} color="#6366f1" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardT}>{c.no}. {c.title}</Text>
                  <Text style={s.cardD}>{c.items.length} özellik</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
              </View>
              <View style={s.statRow}>
                {(['done', 'partial', 'planned', 'missing'] as CovStatus[]).map(st => (
                  <View key={st} style={[s.statPill, { borderColor: COV_STATUS_COLOR[st] }]}>
                    <View style={[s.statDot, { backgroundColor: COV_STATUS_COLOR[st] }]} />
                    <Text style={[s.statN, { color: COV_STATUS_COLOR[st] }]}>{counts[st]}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  headerT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  headerD: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statN: { fontSize: typography.xs, fontWeight: '700' },
});
