// Faz 53 — UatE2EView (uçtan uca akış görünümü)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getUatE2EByFlow, UAT_STATUS_COLOR, UAT_STATUS_LABEL } from '../services/uat';
import type { UatE2EFlow } from '../types';

type Props = {
  flow: UatE2EFlow['flow'];
  heroIcon: string;
  heroColor: string;
  heroTitle: string;
  heroDescription: string;
};

export default function UatE2EView({ flow, heroIcon, heroColor, heroTitle, heroDescription }: Props) {
  const [data, setData] = useState<UatE2EFlow | undefined>(undefined);
  useFocusEffect(useCallback(() => { (async () => setData(await getUatE2EByFlow(flow)))(); }, [flow]));

  if (!data) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.empty}><Ionicons name="hourglass" size={48} color={colors.text.muted} /><Text style={s.emptyT}>Yükleniyor…</Text></View></SafeAreaView>;
  }

  const passRate = data.steps > 0 ? Math.round((data.passed / data.steps) * 100) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.heroCard, { borderColor: heroColor }]}>
          <Ionicons name={heroIcon as any} size={48} color={heroColor} />
          <Text style={s.heroT}>{heroTitle}</Text>
          <Text style={s.heroD}>{heroDescription}</Text>
        </View>

        <View style={[s.summaryCard, { borderLeftColor: UAT_STATUS_COLOR[data.status] }]}>
          <View style={s.headRow}>
            <Text style={s.flowTitle}>{data.title}</Text>
            <View style={[s.pill, { backgroundColor: UAT_STATUS_COLOR[data.status] + '33', borderColor: UAT_STATUS_COLOR[data.status] }]}>
              <Text style={[s.pillT, { color: UAT_STATUS_COLOR[data.status] }]}>{UAT_STATUS_LABEL[data.status]}</Text>
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={[s.statBox, { borderColor: heroColor }]}><Text style={[s.statV, { color: heroColor }]}>%{passRate}</Text><Text style={s.statL}>Başarı</Text></View>
            <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{data.passed}</Text><Text style={s.statL}>Geçti</Text></View>
            <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{data.failed}</Text><Text style={s.statL}>Hata</Text></View>
            <View style={[s.statBox, { borderColor: '#f59e0b' }]}><Text style={[s.statV, { color: '#f59e0b' }]}>{data.blocked}</Text><Text style={s.statL}>Bloklu</Text></View>
          </View>
          <View style={s.metaRow}>
            <View style={s.metaItem}><Ionicons name="list" size={12} color={colors.text.muted} /><Text style={s.metaT}>{data.steps} adım</Text></View>
            <View style={s.metaItem}><Ionicons name="time" size={12} color={colors.text.muted} /><Text style={s.metaT}>{data.durationMin} dk</Text></View>
            <View style={s.metaItem}><Ionicons name="calendar" size={12} color={colors.text.muted} /><Text style={s.metaT}>{new Date(data.lastRunAt).toLocaleString('tr-TR')}</Text></View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  summaryCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flowTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 6 },
  statBox: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, backgroundColor: colors.bg.primary },
  statV: { fontSize: typography.md, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyT: { color: colors.text.muted },
});
