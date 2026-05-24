// Faz 55 — GoLiveSupportScreen (POZ-DEV-262)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveSupport } from '../services/goLive';
import type { GoLiveSupportPlanItem } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const FREQ_LABEL: Record<GoLiveSupportPlanItem['frequency'], string> = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', on_demand: 'Talep Üzerine' };
const FREQ_COLOR: Record<GoLiveSupportPlanItem['frequency'], string> = { daily: '#ef4444', weekly: '#f59e0b', monthly: '#3b82f6', on_demand: '#a855f7' };

export default function GoLiveSupportScreen() {
  const [items, setItems] = useState<GoLiveSupportPlanItem[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listGoLiveSupport()))(); }, []));
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={it => it.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.heroCard}>
            <Ionicons name="shield-half" size={48} color="#f97316" />
            <Text style={s.heroT}>Sürekli Bakım & Destek Süreci</Text>
            <Text style={s.heroD}>{items.length} sorumluluk alanı tanımlandı</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-outline"
            title="Destek planı yok"
            subtitle="Henüz bir bakım veya destek sorumluluk alanı tanımlanmadı."
          />
        }
        renderItem={({ item: it }) => (
          <View key={it.id} style={[s.card, { borderLeftColor: FREQ_COLOR[it.frequency as keyof typeof FREQ_COLOR] }]}>
            <View style={s.headRow}>
              <Ionicons name="shield-checkmark" size={20} color="#f97316" />
              <Text style={s.area}>{it.area}</Text>
            </View>
            <Text style={s.desc}>{it.description}</Text>
            <View style={s.metaRow}>
              <View style={[s.pill, { backgroundColor: FREQ_COLOR[it.frequency as keyof typeof FREQ_COLOR] + '33', borderColor: FREQ_COLOR[it.frequency as keyof typeof FREQ_COLOR] }]}>
                <Text style={[s.pillT, { color: FREQ_COLOR[it.frequency as keyof typeof FREQ_COLOR] }]}>{FREQ_LABEL[it.frequency as keyof typeof FREQ_LABEL]}</Text>
              </View>
              <View style={[s.pill, { borderColor: '#06b6d4' }]}>
                <Ionicons name="person" size={10} color="#06b6d4" /> <Text style={[s.pillT, { color: '#06b6d4' }]}>{it.owner}</Text>
              </View>
              <View style={[s.pill, { borderColor: '#22c55e' }]}>
                <Ionicons name="time" size={10} color="#22c55e" /> <Text style={[s.pillT, { color: '#22c55e' }]}>SLA: {it.sla}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#f97316', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  area: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', flex: 1 },
  desc: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 16, paddingLeft: 28 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 28 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
});
