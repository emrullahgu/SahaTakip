// Faz 47 — AiExecSummaryScreen (POZ-DEV-180)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getAiSummary, AI_SEV_COLOR, AI_SEV_ICON } from '../services/exec';
import type { AiExecSummary } from '../types';

export default function AiExecSummaryScreen() {
  const [d, setD] = useState<AiExecSummary | null>(null);
  const nav = useNavigation<any>();
  useFocusEffect(useCallback(() => { (async () => setD(await getAiSummary()))(); }, []));

  if (!d) return <SafeAreaView style={s.safe} />;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <View style={s.row}>
            <Ionicons name="sparkles" size={28} color="#ec4899" />
            <Text style={s.heroL}>AI Yönetici Özeti</Text>
          </View>
          <Text style={s.headline}>{d.headline}</Text>
          <Text style={s.ts}>Üretildi: {new Date(d.generatedAt).toLocaleString('tr-TR')}</Text>
        </View>

        <View style={s.snapRow}>
          <View style={s.snap}>
            <Text style={s.snapV}>₺{(d.kpiSnapshot.revenue / 1000).toFixed(0)}K</Text>
            <Text style={s.snapL}>Ciro</Text>
          </View>
          <View style={s.snap}>
            <Text style={[s.snapV, { color: '#22c55e' }]}>₺{(d.kpiSnapshot.profit / 1000).toFixed(0)}K</Text>
            <Text style={s.snapL}>Kâr</Text>
          </View>
          <View style={s.snap}>
            <Text style={[s.snapV, { color: '#0ea5e9' }]}>{d.kpiSnapshot.openJobs}</Text>
            <Text style={s.snapL}>Açık İş</Text>
          </View>
          <View style={s.snap}>
            <Text style={[s.snapV, { color: '#ef4444' }]}>{d.kpiSnapshot.overdueQuotes}</Text>
            <Text style={s.snapL}>Gecikmiş</Text>
          </View>
        </View>

        <Text style={s.section}>Bugün dikkat edilmesi gerekenler</Text>
        {d.bullets.map(b => (
          <View key={b.id} style={[s.bullet, { borderLeftColor: AI_SEV_COLOR[b.severity] }]}>
            <View style={s.bulletHead}>
              <Ionicons name={AI_SEV_ICON[b.severity] as any} size={16} color={AI_SEV_COLOR[b.severity]} />
              <Text style={[s.bulletCat, { color: AI_SEV_COLOR[b.severity] }]}>{b.category.toUpperCase()}</Text>
            </View>
            <Text style={s.bulletT}>{b.text}</Text>
            {b.actionLabel && b.actionRoute && (
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: AI_SEV_COLOR[b.severity] }]} onPress={() => nav.navigate(b.actionRoute!)}>
                <Text style={s.actionT}>{b.actionLabel}</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: '#ec489922', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ec4899', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroL: { color: '#ec4899', fontSize: typography.md, fontWeight: '800' },
  headline: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  ts: { color: colors.text.faint, fontSize: typography.xs },
  snapRow: { flexDirection: 'row', gap: spacing.xs },
  snap: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  snapV: { color: colors.text.primary, fontSize: typography.base, fontWeight: '800' },
  snapL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  bullet: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderLeftWidth: 4, gap: 4 },
  bulletHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulletCat: { fontSize: typography.xs, fontWeight: '800' },
  bulletT: { color: colors.text.primary, fontSize: typography.sm },
  actionBtn: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  actionT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
});
