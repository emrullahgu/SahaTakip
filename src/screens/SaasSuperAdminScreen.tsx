// Faz 50 — SaasSuperAdminScreen (POZ-DEV-209)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { getSaasSuperAdminMetrics, listSaasTenants, SAAS_STATUS_LABEL, SAAS_STATUS_COLOR, SAAS_PLAN_LABEL, SAAS_PLAN_COLOR } from '../services/saas';
import type { SaasSuperAdminMetric, SaasTenantSummary, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SaasSuperAdminScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 3 : 2;
  const [metrics, setMetrics] = useState<SaasSuperAdminMetric[]>([]);
  const [tenants, setTenants] = useState<SaasTenantSummary[]>([]);
  useFocusEffect(useCallback(() => {
    (async () => {
      setMetrics(await getSaasSuperAdminMetrics());
      setTenants(await listSaasTenants());
    })();
  }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="flash" size={48} color="#ef4444" />
          <Text style={s.heroT}>Süper Admin</Text>
          <Text style={s.heroD}>Tüm firmalar ve platform metrikleri</Text>
        </View>

        <View style={s.grid}>
          {metrics.map((m, idx) => (
            <View key={idx} style={[s.metricCard, { width: `${100 / cols - 1}%` as any, borderColor: m.color }]}>
              <Ionicons name={m.icon as any} size={24} color={m.color} />
              <Text style={[s.metricV, { color: m.color }]}>{m.value}</Text>
              <Text style={s.metricL}>{m.label}</Text>
              {m.delta !== undefined && (
                <View style={s.deltaRow}>
                  <Ionicons name={m.delta >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color={m.delta >= 0 ? '#22c55e' : '#ef4444'} />
                  <Text style={[s.deltaT, { color: m.delta >= 0 ? '#22c55e' : '#ef4444' }]}>%{Math.abs(m.delta).toFixed(1)}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={s.sectionHead}>
          <Text style={s.sectionT}>Tüm Firmalar</Text>
          <TouchableOpacity onPress={() => nav.navigate('SaasTenants')}>
            <Text style={s.linkT}>Tümü →</Text>
          </TouchableOpacity>
        </View>

        {tenants.slice(0, 6).map(t => (
          <View key={t.id} style={s.row}>
            <View style={[s.dot, { backgroundColor: SAAS_STATUS_COLOR[t.status] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowT}>{t.name}</Text>
              <Text style={s.rowD}>{t.ownerEmail}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: SAAS_PLAN_COLOR[t.plan] + '33', borderColor: SAAS_PLAN_COLOR[t.plan] }]}>
              <Text style={[s.pillT, { color: SAAS_PLAN_COLOR[t.plan] }]}>{SAAS_PLAN_LABEL[t.plan]}</Text>
            </View>
            <Text style={[s.statusT, { color: SAAS_STATUS_COLOR[t.status] }]}>{SAAS_STATUS_LABEL[t.status]}</Text>
          </View>
        ))}

        <View style={s.actions}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => nav.navigate('SaasBilling')} activeOpacity={0.85}>
            <Ionicons name="card" size={18} color="#fff" />
            <Text style={s.actionT}>Faturalandırma</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#a855f7' }]} onPress={() => nav.navigate('SaasHealth')} activeOpacity={0.85}>
            <Ionicons name="pulse" size={18} color="#fff" />
            <Text style={s.actionT}>Firma Sağlık</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  metricCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  metricV: { fontSize: typography.lg, fontWeight: '800' },
  metricL: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deltaT: { fontSize: typography.xs, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  sectionT: { flex: 1, color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  linkT: { color: '#0ea5e9', fontSize: typography.sm, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  rowD: { color: colors.text.muted, fontSize: typography.xs },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.sm },
  actionT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
});
