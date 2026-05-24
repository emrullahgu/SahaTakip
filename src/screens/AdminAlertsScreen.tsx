// Faz 49 — AdminAlertsScreen (POZ-DEV-197)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listAdminAlerts, ackAlert, ALERT_SEV_LABEL, ALERT_SEV_COLOR, ALERT_KIND_LABEL, ALERT_KIND_ICON } from '../services/secCenter';
import type { AdminAlert, AdminAlertSeverity } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

export default function AdminAlertsScreen() {
  const [list, setList] = useState<AdminAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unack'>('unack');

  const load = useCallback(async () => setList(await listAdminAlerts()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = list.filter(a => filter === 'all' || !a.ack);
  const unack = list.filter(a => !a.ack).length;
  const critical = list.filter(a => !a.ack && a.severity === 'critical').length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList<AdminAlert>
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={a => a.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.summary}>
              <View style={s.sumBox}>
                <Text style={s.sumV}>{unack}</Text>
                <Text style={s.sumL}>Onaylanmamış</Text>
              </View>
              <View style={[s.sumBox, { backgroundColor: '#ef444433' }]}>
                <Text style={[s.sumV, { color: '#ef4444' }]}>{critical}</Text>
                <Text style={s.sumL}>Kritik</Text>
              </View>
            </View>

            <View style={s.chips}>
              {(['unack', 'all'] as const).map(k => (
                <TouchableOpacity key={k} style={[s.chip, filter === k && { backgroundColor: '#ec4899' }]} onPress={() => setFilter(k)}>
                  <Text style={[s.chipT, filter === k && { color: '#fff' }]}>{k === 'unack' ? 'Bekleyen' : 'Tümü'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Uyarı yok"
            subtitle="Tüm sistem bildirimleri onaylandı veya henüz bir uyarı oluşmadı."
          />
        }
        renderItem={({ item: a }: { item: AdminAlert }) => (
          <View key={a.id} style={[s.card, { borderLeftColor: ALERT_SEV_COLOR[a.severity as AdminAlertSeverity] }, a.ack && { opacity: 0.55 }]}>
            <View style={s.row}>
              <View style={[s.iconBox, { backgroundColor: ALERT_SEV_COLOR[a.severity as AdminAlertSeverity] + '22', borderColor: ALERT_SEV_COLOR[a.severity as AdminAlertSeverity] }]}>
                <Ionicons name={ALERT_KIND_ICON[a.kind as keyof typeof ALERT_KIND_ICON] as any} size={20} color={ALERT_SEV_COLOR[a.severity as AdminAlertSeverity]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{a.title}</Text>
                <Text style={s.kind}>{ALERT_KIND_LABEL[a.kind as keyof typeof ALERT_KIND_LABEL]} · {new Date(a.at).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.sev, { backgroundColor: ALERT_SEV_COLOR[a.severity as AdminAlertSeverity] + '33', borderColor: ALERT_SEV_COLOR[a.severity as AdminAlertSeverity] }]}>
                <Text style={[s.sevT, { color: ALERT_SEV_COLOR[a.severity as AdminAlertSeverity] }]}>{ALERT_SEV_LABEL[a.severity as AdminAlertSeverity]}</Text>
              </View>
            </View>
            <Text style={s.body}>{a.body}</Text>
            {!a.ack && (
              <TouchableOpacity style={s.btn} onPress={async () => { await ackAlert(a.id); load(); }}>
                <Ionicons name="checkmark-done" size={14} color="#fff" />
                <Text style={s.btnT}>Onayla</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.sm },
  sumBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  sumV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  kind: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sev: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  sevT: { fontSize: typography.xs, fontWeight: '800' },
  body: { color: colors.text.primary, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: '#0ea5e9' },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
