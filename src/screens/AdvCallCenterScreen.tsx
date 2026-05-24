// Faz 58 — AdvCallCenterScreen (POZ-DEV-286)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import {
  listCallAgents, listCallRecords,
  CALL_AGENT_STATUS_LABEL, CALL_AGENT_STATUS_COLOR,
  CALL_OUTCOME_LABEL, CALL_OUTCOME_COLOR,
} from '../services/advanced';
import type { AdvCallAgent, AdvCallRecord } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

function fmt(sec: number): string {
  if (sec === 0) return '-';
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${m}d ${s}sn`;
}

export default function AdvCallCenterScreen() {
  const [agents, setAgents] = useState<AdvCallAgent[]>([]);
  const [records, setRecords] = useState<AdvCallRecord[]>([]);
  useFocusEffect(useCallback(() => {
    (async () => { setAgents(await listCallAgents()); setRecords(await listCallRecords()); })();
  }, []));

  const totalCalls = agents.reduce((a, x) => a + x.calls, 0);
  const avgSat = agents.filter(a => a.satisfaction > 0).reduce((a, x) => a + x.satisfaction, 0) / Math.max(1, agents.filter(a => a.satisfaction > 0).length);
  const onCall = agents.filter(a => a.status === 'on_call').length;
  const available = agents.filter(a => a.status === 'available').length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={records}
        keyExtractor={r => r.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.kpiRow}>
              <Kpi label="Bugün Çağrı" value={totalCalls.toString()} color="#22c55e" />
              <Kpi label="Müsait" value={available.toString()} color="#22c55e" />
              <Kpi label="Görüşmede" value={onCall.toString()} color="#3b82f6" />
              <Kpi label="Memnuniyet" value={avgSat.toFixed(1)} color="#f59e0b" />
            </View>

            <Text style={s.sectionT}>Operatörler</Text>
            {agents.map(a => (
              <View key={a.id} style={[s.card, { marginBottom: spacing.xs }]}>
                <View style={s.row}>
                  <View style={[s.dot, { backgroundColor: CALL_AGENT_STATUS_COLOR[a.status as keyof typeof CALL_AGENT_STATUS_COLOR] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardT}>{a.name}</Text>
                    <Text style={s.cardD}>{a.calls} çağrı · ort. {fmt(a.avgDurationSec)}</Text>
                  </View>
                  {a.satisfaction > 0 && (
                    <View style={s.satBox}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={s.satT}>{a.satisfaction.toFixed(1)}</Text>
                    </View>
                  )}
                  <View style={[s.statusPill, { borderColor: CALL_AGENT_STATUS_COLOR[a.status as keyof typeof CALL_AGENT_STATUS_COLOR] }]}>
                    <Text style={[s.statusT, { color: CALL_AGENT_STATUS_COLOR[a.status as keyof typeof CALL_AGENT_STATUS_COLOR] }]}>{CALL_AGENT_STATUS_LABEL[a.status as keyof typeof CALL_AGENT_STATUS_LABEL]}</Text>
                  </View>
                </View>
              </View>
            ))}

            <Text style={s.sectionT}>Son Çağrılar</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="call-outline"
            title="Çağrı kaydı yok"
            subtitle="Çağrı merkezi üzerinden bugün henüz bir görüşme yapılmadı."
          />
        }
        renderItem={({ item: r }) => (
          <View style={[s.card, { borderLeftColor: CALL_OUTCOME_COLOR[r.outcome as keyof typeof CALL_OUTCOME_COLOR], borderLeftWidth: 4, marginBottom: spacing.xs }]}>
            <View style={s.row}>
              <Ionicons name={r.direction === 'in' ? 'call' : 'arrow-redo'} size={20} color={r.direction === 'in' ? '#22c55e' : '#3b82f6'} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardT}>{r.customer}</Text>
                <Text style={s.cardD}>{r.agent} · {r.at} · {fmt(r.durationSec)}</Text>
              </View>
              {r.hasRecording && <Ionicons name="recording" size={16} color={colors.text.muted} />}
              <View style={[s.statusPill, { borderColor: CALL_OUTCOME_COLOR[r.outcome as keyof typeof CALL_OUTCOME_COLOR] }]}>
                <Text style={[s.statusT, { color: CALL_OUTCOME_COLOR[r.outcome as keyof typeof CALL_OUTCOME_COLOR] }]}>{CALL_OUTCOME_LABEL[r.outcome as keyof typeof CALL_OUTCOME_LABEL]}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Text style={[s.kpiV, { color }]}>{value}</Text>
      <Text style={s.kpiL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  satBox: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f59e0b22', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999 },
  satT: { color: '#f59e0b', fontSize: typography.xs, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
});
