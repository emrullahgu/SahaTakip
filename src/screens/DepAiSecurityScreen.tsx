// Faz 51 — DepAiSecurityScreen (POZ-DEV-217)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepRateLimits, listDepAiLogs } from '../services/deploy';
import type { DepAiRateLimit, DepAiRequestLog } from '../types';

const ROLE_LABEL: Record<DepAiRateLimit['role'], string> = { admin: 'Yönetici', manager: 'Yetkili', staff: 'Personel', customer: 'Müşteri' };
const ROLE_COLOR: Record<DepAiRateLimit['role'], string> = { admin: '#ef4444', manager: '#f59e0b', staff: '#0ea5e9', customer: '#22c55e' };
const STATUS_COLOR: Record<DepAiRequestLog['status'], string> = { ok: '#22c55e', rate_limited: '#f59e0b', error: '#ef4444' };
const STATUS_LABEL: Record<DepAiRequestLog['status'], string> = { ok: 'OK', rate_limited: 'Limit', error: 'Hata' };

export default function DepAiSecurityScreen() {
  const [limits, setLimits] = useState<DepAiRateLimit[]>([]);
  const [logs, setLogs] = useState<DepAiRequestLog[]>([]);
  useFocusEffect(useCallback(() => { (async () => { setLimits(await listDepRateLimits()); setLogs(await listDepAiLogs()); })(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="shield-half" size={48} color="#ec4899" />
          <Text style={s.heroT}>AI Güvenlik & İzleme</Text>
          <Text style={s.heroD}>Role bazlı rate limit • istek logları</Text>
        </View>

        <Text style={s.section}>Rate Limit Kuralları</Text>
        {limits.map(l => (
          <View key={l.id} style={[s.card, { borderLeftColor: ROLE_COLOR[l.role] }]}>
            <View style={s.headRow}>
              <Ionicons name="person-circle" size={22} color={ROLE_COLOR[l.role]} />
              <View style={{ flex: 1 }}>
                <Text style={s.role}>{ROLE_LABEL[l.role]}</Text>
                <Text style={s.metaT}>{l.requestsPerMin}/dk • {l.tokensPerDay.toLocaleString('tr-TR')} token/gün</Text>
              </View>
              <View style={[s.pill, { backgroundColor: (l.enabled ? '#22c55e' : '#64748b') + '33', borderColor: l.enabled ? '#22c55e' : '#64748b' }]}>
                <Text style={[s.pillT, { color: l.enabled ? '#22c55e' : '#64748b' }]}>{l.enabled ? 'AÇIK' : 'KAPALI'}</Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={s.section}>Son AI İstekleri</Text>
        {logs.map(l => (
          <View key={l.id} style={[s.logCard, { borderLeftColor: STATUS_COLOR[l.status] }]}>
            <View style={s.logHead}>
              <Text style={s.user}>{l.user}</Text>
              <View style={[s.pill, { backgroundColor: STATUS_COLOR[l.status] + '33', borderColor: STATUS_COLOR[l.status] }]}>
                <Text style={[s.pillT, { color: STATUS_COLOR[l.status] }]}>{STATUS_LABEL[l.status]}</Text>
              </View>
            </View>
            <View style={s.logMeta}>
              <Text style={s.metaT}>{l.role} • {l.provider}</Text>
              <Text style={s.metaT}>{l.tokens.toLocaleString('tr-TR')} token</Text>
              <Text style={s.metaT}>{l.durationMs}ms</Text>
              <Text style={s.metaT}>{new Date(l.at).toLocaleString('tr-TR')}</Text>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ec4899', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm, textTransform: 'uppercase' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  role: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  logCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 4 },
  logHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  user: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  logMeta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
