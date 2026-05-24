// Faz 49 — SecHealthScreen (POZ-DEV-200)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getSecHealth, HEALTH_STATUS_LABEL, HEALTH_STATUS_COLOR, HEALTH_STATUS_ICON } from '../services/secCenter';
import type { SecHealth, SecHealthItem } from '../types';

const CAT_LABEL: Record<SecHealthItem['category'], string> = {
  auth: 'Kimlik Doğrulama', data: 'Veri', backup: 'Yedekleme', monitoring: 'İzleme', compliance: 'Uyumluluk',
};
const CAT_ICON: Record<SecHealthItem['category'], string> = {
  auth: 'key', data: 'server', backup: 'save', monitoring: 'eye', compliance: 'shield-checkmark',
};

const scoreColor = (n: number) => n >= 85 ? '#22c55e' : n >= 70 ? '#facc15' : n >= 50 ? '#f59e0b' : '#ef4444';
const scoreLabel = (n: number) => n >= 85 ? 'Mükemmel' : n >= 70 ? 'İyi' : n >= 50 ? 'Geliştirilmeli' : 'Kritik';

export default function SecHealthScreen() {
  const [h, setH] = useState<SecHealth | null>(null);
  useFocusEffect(useCallback(() => { (async () => setH(await getSecHealth()))(); }, []));

  const grouped = useMemo(() => {
    if (!h) return {} as Record<SecHealthItem['category'], SecHealthItem[]>;
    return h.items.reduce<Record<string, SecHealthItem[]>>((acc, it) => {
      (acc[it.category] ||= []).push(it); return acc;
    }, {});
  }, [h]);

  if (!h) return <SafeAreaView style={s.safe} />;

  const sColor = scoreColor(h.score);
  const stats = {
    ok: h.items.filter(i => i.status === 'ok').length,
    warn: h.items.filter(i => i.status === 'warn').length,
    fail: h.items.filter(i => i.status === 'fail').length,
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.heroCard, { borderColor: sColor }]}>
          <View style={[s.scoreCircle, { borderColor: sColor }]}>
            <Text style={[s.scoreV, { color: sColor }]}>{h.score}</Text>
            <Text style={s.scoreM}>/100</Text>
          </View>
          <Text style={[s.scoreL, { color: sColor }]}>{scoreLabel(h.score)}</Text>
          <Text style={s.scoreD}>Son güncelleme: {new Date(h.generatedAt).toLocaleString('tr-TR')}</Text>
        </View>

        <View style={s.statRow}>
          <View style={[s.statBox, { borderColor: '#22c55e' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={[s.statV, { color: '#22c55e' }]}>{stats.ok}</Text>
            <Text style={s.statL}>İyi</Text>
          </View>
          <View style={[s.statBox, { borderColor: '#f59e0b' }]}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={[s.statV, { color: '#f59e0b' }]}>{stats.warn}</Text>
            <Text style={s.statL}>Uyarı</Text>
          </View>
          <View style={[s.statBox, { borderColor: '#ef4444' }]}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={[s.statV, { color: '#ef4444' }]}>{stats.fail}</Text>
            <Text style={s.statL}>Sorun</Text>
          </View>
        </View>

        {Object.entries(grouped).map(([cat, items]) => (
          <View key={cat} style={s.catBlock}>
            <View style={s.catHeader}>
              <Ionicons name={CAT_ICON[cat as SecHealthItem['category']] as any} size={16} color={colors.text.muted} />
              <Text style={s.catT}>{CAT_LABEL[cat as SecHealthItem['category']]}</Text>
            </View>
            {items.map((it, idx) => (
              <View key={idx} style={[s.item, { borderLeftColor: HEALTH_STATUS_COLOR[it.status] }]}>
                <Ionicons name={HEALTH_STATUS_ICON[it.status] as any} size={20} color={HEALTH_STATUS_COLOR[it.status]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.itemL}>{it.label}</Text>
                  <Text style={s.itemD}>{it.detail}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: HEALTH_STATUS_COLOR[it.status] + '33', borderColor: HEALTH_STATUS_COLOR[it.status] }]}>
                  <Text style={[s.statusT, { color: HEALTH_STATUS_COLOR[it.status] }]}>{HEALTH_STATUS_LABEL[it.status]}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', gap: 4 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scoreV: { fontSize: 36, fontWeight: '800' },
  scoreM: { color: colors.text.muted, fontSize: typography.sm, marginTop: -4 },
  scoreL: { fontSize: typography.lg, fontWeight: '800' },
  scoreD: { color: colors.text.muted, fontSize: typography.xs },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', gap: 2 },
  statV: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs },
  catBlock: { gap: 6, marginTop: spacing.sm },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catT: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '800', textTransform: 'uppercase' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  itemL: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  itemD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '800' },
});
