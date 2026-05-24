// Faz 50 — SaasLicensesScreen (POZ-DEV-205)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasLicenses, toggleLicenseAutoRenew, SAAS_STATUS_LABEL, SAAS_STATUS_COLOR, SAAS_PLAN_LABEL, SAAS_PLAN_COLOR } from '../services/saas';
import type { SaasLicense } from '../types';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('tr-TR');
const daysUntil = (s: string) => Math.round((new Date(s).getTime() - Date.now()) / 86400000);

export default function SaasLicensesScreen() {
  const [items, setItems] = useState<SaasLicense[]>([]);
  const load = useCallback(async () => setItems(await listSaasLicenses()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => ({
    active: items.filter(l => l.status === 'active').length,
    expiring: items.filter(l => l.status === 'expiring').length,
    expired: items.filter(l => l.status === 'expired').length,
    seats: items.reduce((a, l) => a + l.seats, 0),
  }), [items]);

  const onToggle = async (id: string) => { await toggleLicenseAutoRenew(id); await load(); };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.statRow}>
          <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{stats.active}</Text><Text style={s.statL}>Aktif</Text></View>
          <View style={[s.statBox, { borderColor: '#f59e0b' }]}><Text style={[s.statV, { color: '#f59e0b' }]}>{stats.expiring}</Text><Text style={s.statL}>Yakında</Text></View>
          <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.expired}</Text><Text style={s.statL}>Bitti</Text></View>
          <View style={s.statBox}><Text style={s.statV}>{stats.seats}</Text><Text style={s.statL}>Koltuk</Text></View>
        </View>

        {items.map(l => {
          const d = daysUntil(l.endsAt);
          return (
            <View key={l.id} style={[s.card, { borderLeftColor: SAAS_STATUS_COLOR[l.status] }]}>
              <View style={s.headRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{l.tenantName}</Text>
                  <Text style={s.range}>{fmtDate(l.startsAt)} → {fmtDate(l.endsAt)}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: SAAS_PLAN_COLOR[l.plan] + '33', borderColor: SAAS_PLAN_COLOR[l.plan] }]}>
                  <Text style={[s.pillT, { color: SAAS_PLAN_COLOR[l.plan] }]}>{SAAS_PLAN_LABEL[l.plan]}</Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <View style={[s.pill, { backgroundColor: SAAS_STATUS_COLOR[l.status] + '33', borderColor: SAAS_STATUS_COLOR[l.status] }]}>
                  <Text style={[s.pillT, { color: SAAS_STATUS_COLOR[l.status] }]}>{SAAS_STATUS_LABEL[l.status]}</Text>
                </View>
                <Text style={s.metaT}><Ionicons name="people" size={11} color={colors.text.muted} /> {l.seats} koltuk</Text>
                <Text style={s.metaT}><Ionicons name="calendar" size={11} color={colors.text.muted} /> {l.cycle === 'monthly' ? 'Aylık' : 'Yıllık'}</Text>
                <Text style={[s.daysT, { color: d < 0 ? '#ef4444' : d < 30 ? '#f59e0b' : '#22c55e' }]}>
                  {d < 0 ? `${Math.abs(d)} gün geçti` : `${d} gün kaldı`}
                </Text>
              </View>
              <View style={s.renewRow}>
                <Ionicons name="refresh" size={14} color={colors.text.muted} />
                <Text style={s.renewT}>Oto-yenileme</Text>
                <View style={{ flex: 1 }} />
                <Switch
                  value={l.autoRenew}
                  onValueChange={() => onToggle(l.id)}
                  trackColor={{ true: '#22c55e', false: '#475569' }}
                  thumbColor="#fff"
                />
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
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  range: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  daysT: { fontSize: typography.xs, fontWeight: '700', marginLeft: 'auto' },
  renewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border.primary },
  renewT: { color: colors.text.muted, fontSize: typography.xs },
});
