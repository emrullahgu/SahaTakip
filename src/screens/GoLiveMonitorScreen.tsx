// Faz 55 — GoLiveMonitorScreen (POZ-DEV-254)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveMonitor, GO_LIVE_HEALTH_COLOR } from '../services/goLive';
import type { GoLiveMonitorCard } from '../types';

const TREND_ICON: Record<GoLiveMonitorCard['trend'], string> = { up: 'trending-up', down: 'trending-down', flat: 'remove' };
const TREND_COLOR: Record<GoLiveMonitorCard['trend'], string> = { up: '#22c55e', down: '#ef4444', flat: '#64748b' };

export default function GoLiveMonitorScreen() {
  const [cards, setCards] = useState<GoLiveMonitorCard[]>([]);
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;
  useFocusEffect(useCallback(() => { (async () => setCards(await listGoLiveMonitor()))(); }, []));
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="pulse" size={48} color="#22c55e" />
          <Text style={s.heroT}>Canlı İzleme Paneli</Text>
          <Text style={s.heroD}>Hata, performans, kullanıcı aktivitesi göstergeleri</Text>
        </View>
        <View style={s.grid}>
          {cards.map(c => {
            const col = GO_LIVE_HEALTH_COLOR[c.status];
            return (
              <View key={c.id} style={[s.kpi, { width: tileW as any, borderColor: col }]}>
                <View style={s.kpiTop}>
                  <View style={[s.dot, { backgroundColor: col }]} />
                  <Ionicons name={TREND_ICON[c.trend] as any} size={16} color={TREND_COLOR[c.trend]} />
                </View>
                <Text style={s.kpiL}>{c.label}</Text>
                <Text style={[s.kpiV, { color: col }]}>{c.value}{c.unit ? <Text style={s.kpiU}> {c.unit}</Text> : null}</Text>
                <Text style={s.target}>Hedef: {c.target}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#22c55e', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  kpi: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, gap: 4 },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  kpiV: { fontSize: typography.xxl, fontWeight: '800' },
  kpiU: { fontSize: typography.sm, fontWeight: '600' },
  target: { color: colors.text.muted, fontSize: 10 },
});
