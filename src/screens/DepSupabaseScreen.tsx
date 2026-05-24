// Faz 51 — DepSupabaseScreen (POZ-DEV-211)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getDepSupabase, listDepEnvVars, DEP_STATUS_COLOR, DEP_STATUS_ICON, DEP_STATUS_LABEL } from '../services/deploy';
import type { DepSupabaseConfig, DepEnvVar } from '../types';

const SCOPE_LABEL: Record<string, string> = { mobile: 'Mobil', web: 'Web', server: 'Sunucu', all: 'Hepsi' };
const SCOPE_COLOR: Record<string, string> = { mobile: '#0ea5e9', web: '#a855f7', server: '#ef4444', all: '#22c55e' };

export default function DepSupabaseScreen() {
  const [cfg, setCfg] = useState<DepSupabaseConfig | null>(null);
  const [envs, setEnvs] = useState<DepEnvVar[]>([]);
  useFocusEffect(useCallback(() => { (async () => { setCfg(await getDepSupabase()); setEnvs(await listDepEnvVars()); })(); }, []));

  if (!cfg) return <SafeAreaView style={s.safe} />;

  const missing = envs.filter(e => e.required && !e.set).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.statusCard, { borderColor: DEP_STATUS_COLOR[cfg.status] }]}>
          <Ionicons name={DEP_STATUS_ICON[cfg.status] as any} size={48} color={DEP_STATUS_COLOR[cfg.status]} />
          <Text style={[s.statusT, { color: DEP_STATUS_COLOR[cfg.status] }]}>{DEP_STATUS_LABEL[cfg.status]}</Text>
          <Text style={s.statusD}>Supabase Bağlantısı</Text>
        </View>

        <View style={s.card}>
          <View style={s.row}><Text style={s.label}>Proje URL</Text><Text style={s.value}>{cfg.projectUrl}</Text></View>
          <View style={s.row}><Text style={s.label}>Anon Key</Text><Ionicons name={cfg.anonKeySet ? 'checkmark-circle' : 'close-circle'} size={16} color={cfg.anonKeySet ? '#22c55e' : '#ef4444'} /></View>
          <View style={s.row}><Text style={s.label}>Service Role</Text><Ionicons name={cfg.serviceRoleSet ? 'checkmark-circle' : 'close-circle'} size={16} color={cfg.serviceRoleSet ? '#22c55e' : '#ef4444'} /></View>
          <View style={s.row}><Text style={s.label}>Bölge</Text><Text style={s.value}>{cfg.region}</Text></View>
          <View style={s.row}><Text style={s.label}>DB Boyutu</Text><Text style={s.value}>{cfg.dbSize}</Text></View>
          <View style={s.row}><Text style={s.label}>Aylık Egress</Text><Text style={s.value}>{cfg.monthlyEgress}</Text></View>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <Text style={s.label}>Auth Sağlayıcılar</Text>
            <View style={s.providersRow}>
              {cfg.authProviders.map(p => (
                <View key={p} style={s.providerChip}><Text style={s.providerT}>{p}</Text></View>
              ))}
            </View>
          </View>
        </View>

        <View style={s.sectionHead}>
          <Text style={s.sectionT}>Ortam Değişkenleri</Text>
          {missing > 0 && (
            <View style={s.missingPill}>
              <Ionicons name="alert-circle" size={12} color="#ef4444" />
              <Text style={s.missingT}>{missing} eksik</Text>
            </View>
          )}
        </View>

        {envs.map(e => (
          <View key={e.id} style={[s.envRow, { borderLeftColor: e.set ? '#22c55e' : e.required ? '#ef4444' : '#f59e0b' }]}>
            <Ionicons name={e.set ? 'checkmark-circle' : 'close-circle'} size={18} color={e.set ? '#22c55e' : '#ef4444'} />
            <View style={{ flex: 1 }}>
              <View style={s.envKeyRow}>
                <Text style={s.envKey}>{e.key}</Text>
                <View style={[s.scopePill, { backgroundColor: SCOPE_COLOR[e.scope] + '33', borderColor: SCOPE_COLOR[e.scope] }]}>
                  <Text style={[s.scopeT, { color: SCOPE_COLOR[e.scope] }]}>{SCOPE_LABEL[e.scope]}</Text>
                </View>
                {e.required && <View style={s.reqPill}><Text style={s.reqT}>ZORUNLU</Text></View>}
              </View>
              <Text style={s.envDesc}>{e.description}</Text>
              {e.masked && <Text style={s.envMasked}>{e.masked}</Text>}
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
  statusCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', gap: 4 },
  statusT: { fontSize: typography.lg, fontWeight: '800' },
  statusD: { color: colors.text.muted, fontSize: typography.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.primary, gap: spacing.sm },
  label: { color: colors.text.muted, fontSize: typography.sm },
  value: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', flexShrink: 1 },
  providersRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  providerChip: { backgroundColor: colors.bg.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: colors.border.primary },
  providerT: { color: colors.text.primary, fontSize: 10, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  sectionT: { flex: 1, color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  missingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef444433', borderColor: '#ef4444', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  missingT: { color: '#ef4444', fontSize: typography.xs, fontWeight: '800' },
  envRow: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  envKeyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  envKey: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  scopePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  scopeT: { fontSize: 10, fontWeight: '800' },
  reqPill: { backgroundColor: '#ef444433', borderColor: '#ef4444', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  reqT: { color: '#ef4444', fontSize: 9, fontWeight: '800' },
  envDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  envMasked: { color: colors.text.faint, fontSize: typography.xs, marginTop: 2, fontFamily: 'monospace' as any },
});
