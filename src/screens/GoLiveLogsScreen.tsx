// Faz 55 — GoLiveLogsScreen (POZ-DEV-255)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveLogs, GO_LIVE_SEVERITY_LABEL, GO_LIVE_SEVERITY_COLOR } from '../services/goLive';
import type { GoLiveLogEntry } from '../types';

const KIND_LABEL: Record<GoLiveLogEntry['kind'], string> = { crash: 'Crash', api: 'API Hata', supabase: 'Supabase' };
const KIND_COLOR: Record<GoLiveLogEntry['kind'], string> = { crash: '#ef4444', api: '#f59e0b', supabase: '#a855f7' };
const KIND_ICON: Record<GoLiveLogEntry['kind'], string> = { crash: 'bug', api: 'cloud-offline', supabase: 'server' };

export default function GoLiveLogsScreen() {
  const [logs, setLogs] = useState<GoLiveLogEntry[]>([]);
  const [filter, setFilter] = useState<GoLiveLogEntry['kind'] | 'all'>('all');
  useFocusEffect(useCallback(() => { (async () => setLogs(await listGoLiveLogs()))(); }, []));

  const filtered = useMemo(() => filter === 'all' ? logs : logs.filter(l => l.kind === filter), [logs, filter]);
  const stats = useMemo(() => ({
    open: logs.filter(l => !l.resolved).length,
    critical: logs.filter(l => l.severity === 'critical' && !l.resolved).length,
    total: logs.reduce((s, l) => s + l.count, 0),
  }), [logs]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="bug" size={48} color="#f59e0b" />
          <Text style={s.heroT}>Hata Log Takibi</Text>
          <Text style={s.heroD}>Crash, API ve Supabase hatalarının günlük izlenmesi</Text>
        </View>
        <View style={s.statRow}>
          <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.open}</Text><Text style={s.statL}>Açık</Text></View>
          <View style={[s.statBox, { borderColor: '#b91c1c' }]}><Text style={[s.statV, { color: '#b91c1c' }]}>{stats.critical}</Text><Text style={s.statL}>Kritik Açık</Text></View>
          <View style={[s.statBox, { borderColor: '#3b82f6' }]}><Text style={[s.statV, { color: '#3b82f6' }]}>{stats.total}</Text><Text style={s.statL}>Toplam Olay</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <TouchableOpacity onPress={() => setFilter('all')} style={[s.chip, filter === 'all' && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}>
            <Text style={[s.chipT, filter === 'all' && { color: '#fff' }]}>Hepsi</Text>
          </TouchableOpacity>
          {(['crash', 'api', 'supabase'] as const).map(k => (
            <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[s.chip, { borderColor: KIND_COLOR[k] }, filter === k && { backgroundColor: KIND_COLOR[k] }]}>
              <Text style={[s.chipT, { color: KIND_COLOR[k] }, filter === k && { color: '#fff' }]}>{KIND_LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {filtered.map(l => (
          <View key={l.id} style={[s.card, { borderLeftColor: l.resolved ? '#22c55e' : GO_LIVE_SEVERITY_COLOR[l.severity] }]}>
            <View style={s.headRow}>
              <View style={[s.kindPill, { backgroundColor: KIND_COLOR[l.kind] + '33', borderColor: KIND_COLOR[l.kind] }]}>
                <Ionicons name={KIND_ICON[l.kind] as any} size={11} color={KIND_COLOR[l.kind]} />
                <Text style={[s.kindT, { color: KIND_COLOR[l.kind] }]}>{KIND_LABEL[l.kind]}</Text>
              </View>
              <View style={[s.sevPill, { backgroundColor: GO_LIVE_SEVERITY_COLOR[l.severity] + '33', borderColor: GO_LIVE_SEVERITY_COLOR[l.severity] }]}>
                <Text style={[s.sevT, { color: GO_LIVE_SEVERITY_COLOR[l.severity] }]}>{GO_LIVE_SEVERITY_LABEL[l.severity]}</Text>
              </View>
              {l.resolved && (
                <View style={[s.resolvedPill, { borderColor: '#22c55e' }]}>
                  <Ionicons name="checkmark" size={10} color="#22c55e" />
                  <Text style={[s.resolvedT, { color: '#22c55e' }]}>Çözüldü</Text>
                </View>
              )}
            </View>
            <Text style={s.msg}>{l.message}</Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>Tekrar: <Text style={{ color: colors.text.primary, fontWeight: '700' }}>{l.count}</Text></Text>
              <Text style={s.meta}>Son: {l.lastAt}</Text>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { fontSize: typography.md, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipT: { fontSize: typography.xs, fontWeight: '700', color: colors.text.primary },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  kindPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  kindT: { fontSize: 10, fontWeight: '800' },
  sevPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  sevT: { fontSize: 10, fontWeight: '800' },
  resolvedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  resolvedT: { fontSize: 10, fontWeight: '800' },
  msg: { color: colors.text.primary, fontSize: typography.sm, fontFamily: 'monospace' as any },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.text.muted, fontSize: 10 },
});
