// Faz 50 — SaasUsageLimitsScreen (POZ-DEV-206)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasUsage } from '../services/saas';
import type { SaasUsageMetric } from '../types';

const ICON: Record<SaasUsageMetric['metric'], string> = {
  users: 'people', workorders: 'clipboard', storage_mb: 'cloud',
  ai_tokens: 'sparkles', sms: 'chatbubble', api_calls: 'git-network',
};

const pctColor = (p: number) => p >= 90 ? '#ef4444' : p >= 70 ? '#f59e0b' : '#22c55e';
const fmt = (m: SaasUsageMetric) => m.metric === 'storage_mb'
  ? `${(m.current / 1024).toFixed(1)} / ${(m.limit / 1024).toFixed(0)} GB`
  : `${m.current.toLocaleString('tr-TR')} / ${m.limit.toLocaleString('tr-TR')} ${m.unit}`;
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('tr-TR') : '';

export default function SaasUsageLimitsScreen() {
  const [items, setItems] = useState<SaasUsageMetric[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listSaasUsage()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="speedometer" size={48} color="#ec4899" />
          <Text style={s.heroT}>Kullanım Limitleri</Text>
          <Text style={s.heroD}>Plan limitleri ve mevcut kullanım. %90 üzerinde uyarı tetiklenir.</Text>
        </View>

        {items.map(m => {
          const pct = Math.min(100, Math.round((m.current / m.limit) * 100));
          const c = pctColor(pct);
          return (
            <View key={m.id} style={[s.card, { borderLeftColor: c }]}>
              <View style={s.headRow}>
                <Ionicons name={ICON[m.metric] as any} size={20} color={c} />
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{m.label}</Text>
                  <Text style={s.value}>{fmt(m)}</Text>
                </View>
                <Text style={[s.pct, { color: c }]}>%{pct}</Text>
              </View>
              <View style={s.barWrap}>
                <View style={[s.barFill, { width: `${pct}%`, backgroundColor: c }]} />
              </View>
              {m.resetAt && (
                <Text style={s.reset}><Ionicons name="refresh" size={11} color={colors.text.muted} /> Sıfırlanma: {fmtDate(m.resetAt)}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ec4899', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  value: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pct: { fontSize: typography.md, fontWeight: '800' },
  barWrap: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  reset: { color: colors.text.muted, fontSize: typography.xs },
});
