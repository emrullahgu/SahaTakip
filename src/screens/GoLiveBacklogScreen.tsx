// Faz 55 — GoLiveBacklogScreen (POZ-DEV-260)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveBacklog } from '../services/goLive';
import type { GoLiveBacklogItem } from '../types';

const IMPACT_LABEL: Record<GoLiveBacklogItem['impact'], string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
const IMPACT_COLOR: Record<GoLiveBacklogItem['impact'], string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const EFFORT_LABEL: Record<GoLiveBacklogItem['effort'], string> = { s: 'S', m: 'M', l: 'L' };

export default function GoLiveBacklogScreen() {
  const [items, setItems] = useState<GoLiveBacklogItem[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listGoLiveBacklog()))(); }, []));
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="list" size={48} color="#8b5cf6" />
          <Text style={s.heroT}>Öncelikli İyileştirme Backlog</Text>
          <Text style={s.heroD}>{items.length} kayıt • Öncelik skoruna göre sıralı</Text>
        </View>
        {items.map((it, idx) => (
          <View key={it.id} style={[s.card, { borderLeftColor: IMPACT_COLOR[it.impact] }]}>
            <View style={s.headRow}>
              <View style={s.rankBox}><Text style={s.rank}>#{idx + 1}</Text></View>
              <Text style={s.scoreV}>{it.priorityScore}</Text>
              <View style={[s.pill, { backgroundColor: IMPACT_COLOR[it.impact] + '33', borderColor: IMPACT_COLOR[it.impact] }]}>
                <Text style={[s.pillT, { color: IMPACT_COLOR[it.impact] }]}>Etki: {IMPACT_LABEL[it.impact]}</Text>
              </View>
              <View style={[s.pill, { borderColor: '#06b6d4' }]}>
                <Text style={[s.pillT, { color: '#06b6d4' }]}>Efor: {EFFORT_LABEL[it.effort]}</Text>
              </View>
            </View>
            <Text style={s.title}>{it.title}</Text>
            <Text style={s.desc}>{it.description}</Text>
            <View style={s.metaRow}>
              <View style={[s.pill, { borderColor: '#a855f7' }]}>
                <Text style={[s.pillT, { color: '#a855f7' }]}>{it.category}</Text>
              </View>
              <View style={s.voteBox}>
                <Ionicons name="thumbs-up" size={11} color="#22c55e" />
                <Text style={s.voteT}>{it.votes} oy</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#8b5cf6', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  rankBox: { backgroundColor: '#8b5cf6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  rank: { color: '#fff', fontSize: 11, fontWeight: '800' },
  scoreV: { color: '#8b5cf6', fontSize: typography.md, fontWeight: '800' },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  desc: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  voteBox: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  voteT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
});
