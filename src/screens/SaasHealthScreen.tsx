// Faz 50 — SaasHealthScreen (POZ-DEV-210)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasTenantHealth, SAAS_STATUS_LABEL, SAAS_STATUS_COLOR } from '../services/saas';
import type { SaasTenantHealth } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const scoreColor = (n: number) => n >= 85 ? '#22c55e' : n >= 65 ? '#facc15' : n >= 45 ? '#f59e0b' : '#ef4444';

export default function SaasHealthScreen() {
  const [items, setItems] = useState<SaasTenantHealth[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listSaasTenantHealth()))(); }, []));

  const stats = useMemo(() => ({
    healthy: items.filter(t => t.status === 'healthy').length,
    atRisk: items.filter(t => t.status === 'at_risk').length,
    churning: items.filter(t => t.status === 'churning').length,
    avgScore: items.length ? Math.round(items.reduce((a, t) => a + t.score, 0) / items.length) : 0,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items.sort((a, b) => a.score - b.score)}
        keyExtractor={t => t.tenantId}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={[s.heroCard, { borderColor: scoreColor(stats.avgScore) }]}>
              <Text style={[s.heroScore, { color: scoreColor(stats.avgScore) }]}>{stats.avgScore}</Text>
              <Text style={s.heroL}>Ortalama Sağlık Skoru</Text>
            </View>

            <View style={s.statRow}>
              <View style={[s.statBox, { borderColor: '#22c55e' }]}>
                <Ionicons name="heart" size={20} color="#22c55e" />
                <Text style={[s.statV, { color: '#22c55e' }]}>{stats.healthy}</Text>
                <Text style={s.statL}>Sağlıklı</Text>
              </View>
              <View style={[s.statBox, { borderColor: '#f59e0b' }]}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={[s.statV, { color: '#f59e0b' }]}>{stats.atRisk}</Text>
                <Text style={s.statL}>Risk Altında</Text>
              </View>
              <View style={[s.statBox, { borderColor: '#ef4444' }]}>
                <Ionicons name="trending-down" size={20} color="#ef4444" />
                <Text style={[s.statV, { color: '#ef4444' }]}>{stats.churning}</Text>
                <Text style={s.statL}>Kaybediliyor</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Sağlık verisi yok"
            subtitle="Firma kullanım sağlık analizleri burada listelenir."
          />
        }
        renderItem={({ item: t }) => {
          const c = scoreColor(t.score);
          return (
            <View key={t.tenantId} style={[s.card, { borderLeftColor: c }]}>
              <View style={s.headRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{t.tenantName}</Text>
                  <View style={[s.pill, { backgroundColor: SAAS_STATUS_COLOR[t.status] + '33', borderColor: SAAS_STATUS_COLOR[t.status], alignSelf: 'flex-start', marginTop: 4 }]}>
                    <Text style={[s.pillT, { color: SAAS_STATUS_COLOR[t.status] }]}>{SAAS_STATUS_LABEL[t.status]}</Text>
                  </View>
                </View>
                <View style={[s.scoreCircle, { borderColor: c }]}>
                  <Text style={[s.scoreV, { color: c }]}>{t.score}</Text>
                </View>
              </View>

              <View style={s.barWrap}>
                <View style={[s.barFill, { width: `${t.score}%`, backgroundColor: c }]} />
              </View>

              <View style={s.metaRow}>
                <Text style={s.metaT}><Ionicons name="time" size={11} color={colors.text.muted} /> {t.lastLoginDaysAgo === 0 ? 'Bugün' : `${t.lastLoginDaysAgo}g önce`}</Text>
                <Text style={s.metaT}><Ionicons name="people" size={11} color={colors.text.muted} /> {t.activeUsers7d} aktif (7g)</Text>
                <Text style={s.metaT}><Ionicons name="clipboard" size={11} color={colors.text.muted} /> {t.workOrdersThisMonth} iş emri</Text>
                <Text style={s.metaT}><Ionicons name="speedometer" size={11} color={colors.text.muted} /> %{t.usagePctOfLimit} limit</Text>
              </View>

              {t.churnRiskFactors.length > 0 && (
                <View style={s.risks}>
                  {t.churnRiskFactors.map((r, i) => (
                    <View key={i} style={s.riskRow}>
                      <Ionicons name="alert-circle" size={12} color="#ef4444" />
                      <Text style={s.riskT}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', gap: 4 },
  heroScore: { fontSize: 48, fontWeight: '800' },
  heroL: { color: colors.text.muted, fontSize: typography.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', gap: 2 },
  statV: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreV: { fontSize: typography.lg, fontWeight: '800' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  barWrap: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  risks: { gap: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border.primary },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  riskT: { color: '#ef4444', fontSize: typography.xs, fontWeight: '600' },
});
