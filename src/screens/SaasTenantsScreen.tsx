// Faz 50 — SaasTenantsScreen (POZ-DEV-201)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasTenants, SAAS_STATUS_LABEL, SAAS_STATUS_COLOR, SAAS_PLAN_LABEL, SAAS_PLAN_COLOR } from '../services/saas';
import type { SaasTenantSummary } from '../types';

const fmtTL = (n: number) => `₺${n.toLocaleString('tr-TR')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('tr-TR');
const daysUntil = (s: string) => Math.round((new Date(s).getTime() - Date.now()) / 86400000);

export default function SaasTenantsScreen() {
  const [items, setItems] = useState<SaasTenantSummary[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listSaasTenants()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(t => t.status === 'active').length,
    trial: items.filter(t => t.status === 'trial').length,
    mrr: items.reduce((a, t) => a + t.mrr, 0),
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.statRow}>
          <View style={s.statBox}><Text style={s.statV}>{stats.total}</Text><Text style={s.statL}>Toplam</Text></View>
          <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{stats.active}</Text><Text style={s.statL}>Aktif</Text></View>
          <View style={[s.statBox, { borderColor: '#0ea5e9' }]}><Text style={[s.statV, { color: '#0ea5e9' }]}>{stats.trial}</Text><Text style={s.statL}>Deneme</Text></View>
          <View style={[s.statBox, { borderColor: '#a855f7' }]}><Text style={[s.statV, { color: '#a855f7', fontSize: typography.md }]}>{fmtTL(stats.mrr)}</Text><Text style={s.statL}>MRR</Text></View>
        </View>

        {items.map(t => {
          const d = daysUntil(t.licenseEndsAt);
          const expiringSoon = d > 0 && d <= 30;
          return (
            <View key={t.id} style={[s.card, t.isCurrent && { borderColor: '#22c55e', borderWidth: 2 }]}>
              <View style={s.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{t.name}{t.isCurrent && '  ●'}</Text>
                  <Text style={s.mail}>{t.ownerEmail}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: SAAS_PLAN_COLOR[t.plan] + '33', borderColor: SAAS_PLAN_COLOR[t.plan] }]}>
                  <Text style={[s.pillT, { color: SAAS_PLAN_COLOR[t.plan] }]}>{SAAS_PLAN_LABEL[t.plan]}</Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <View style={[s.pill, { backgroundColor: SAAS_STATUS_COLOR[t.status] + '33', borderColor: SAAS_STATUS_COLOR[t.status] }]}>
                  <Text style={[s.pillT, { color: SAAS_STATUS_COLOR[t.status] }]}>{SAAS_STATUS_LABEL[t.status]}</Text>
                </View>
                <Text style={s.metaT}><Ionicons name="people" size={11} color={colors.text.muted} /> {t.users}</Text>
                <Text style={s.metaT}><Ionicons name="cloud" size={11} color={colors.text.muted} /> {(t.storageMb / 1024).toFixed(1)} GB</Text>
                <Text style={s.metaT}><Ionicons name="cash" size={11} color={colors.text.muted} /> {fmtTL(t.mrr)}/ay</Text>
              </View>
              <View style={s.licenseRow}>
                <Text style={s.licT}>Lisans: {fmtDate(t.licenseEndsAt)}</Text>
                <Text style={[s.licD, { color: d < 0 ? '#ef4444' : expiringSoon ? '#f59e0b' : colors.text.muted }]}>
                  {d < 0 ? `${Math.abs(d)} gün geçti` : `${d} gün kaldı`}
                </Text>
              </View>
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
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  statV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  mail: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  licenseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.primary },
  licT: { color: colors.text.muted, fontSize: typography.xs },
  licD: { fontSize: typography.xs, fontWeight: '700' },
});
