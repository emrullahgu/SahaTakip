// Faz 42 — FieldCommandCenterScreen: canlı operasyon paneli
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldJob, FieldZone, FieldEmergencyDispatch, FieldOpsLiveStat } from '../types';
import { listJobs, listZones, listEmergencies, getLiveStats, STAGE_COLOR, STAGE_LABEL, PRIORITY_COLOR } from '../services/fieldOps';

export default function FieldCommandCenterScreen() {
  const [stats, setStats] = useState<FieldOpsLiveStat[]>([]);
  const [jobs, setJobs] = useState<FieldJob[]>([]);
  const [zones, setZones] = useState<FieldZone[]>([]);
  const [emerg, setEmerg] = useState<FieldEmergencyDispatch[]>([]);
  const load = useCallback(async () => {
    setStats(await getLiveStats());
    setJobs(await listJobs());
    setZones(await listZones());
    setEmerg(await listEmergencies());
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const live = jobs.filter(j => j.stage !== 'completed' && j.stage !== 'cancelled');
  const pendingE = emerg.filter(e => e.status === 'pending' || e.status === 'dispatched');

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 40 }}>
        <View style={s.grid}>
          {stats.map(st => (
            <View key={st.id} style={[s.statBox, { borderColor: st.color }]}>
              <Ionicons name={st.icon as any} size={22} color={st.color} />
              <Text style={[s.statV, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statL}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sH}>🚨 Bekleyen Acil ({pendingE.length})</Text>
          {pendingE.length === 0 ? <Text style={s.empty}>—</Text> :
            pendingE.map(e => (
              <View key={e.id} style={[s.row, { borderLeftColor: '#ef4444' }]}>
                <Ionicons name="flash" size={18} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={s.rT}>{e.title}</Text>
                  <Text style={s.rS}>{e.address}{e.dispatchedUserName ? ` · ${e.dispatchedUserName}` : ''}</Text>
                </View>
                {e.etaMinutes && <Text style={s.eta}>{e.etaMinutes}dk</Text>}
              </View>
            ))}
        </View>

        <View style={s.section}>
          <Text style={s.sH}>📡 Canlı İşler ({live.length})</Text>
          {live.map(j => (
            <View key={j.id} style={[s.row, { borderLeftColor: PRIORITY_COLOR[j.priority] }]}>
              <View style={[s.dot, { backgroundColor: STAGE_COLOR[j.stage] }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.rT}>{j.customerName}</Text>
                <Text style={s.rS}>{j.assignedUserName} · {STAGE_LABEL[j.stage]}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sH}>🗺️ Bölgeler</Text>
          <View style={s.zonesGrid}>
            {zones.map(z => (
              <View key={z.id} style={[s.zone, { borderColor: z.color }]}>
                <View style={[s.zDot, { backgroundColor: z.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.zN}>{z.name}</Text>
                  <Text style={s.zS}>{z.activeJobs} aktif · {z.memberCount} kişi</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, fontSize: typography.xs, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statBox: { flex: 1, minWidth: '45%', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 2, alignItems: 'center' },
  statV: { fontSize: typography.xxl, fontWeight: '800', marginTop: 4 },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  section: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, padding: spacing.sm, gap: 4 },
  sH: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderLeftWidth: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  rS: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  eta: { color: '#f59e0b', fontWeight: '800', fontSize: typography.xs },
  zonesGrid: { gap: 4 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 1 },
  zDot: { width: 14, height: 14, borderRadius: 7 },
  zN: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  zS: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
});
