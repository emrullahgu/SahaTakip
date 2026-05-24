// Faz 55 — GoLiveBugTasksScreen (POZ-DEV-257)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveBugTasks, GO_LIVE_SEVERITY_LABEL, GO_LIVE_SEVERITY_COLOR, GO_LIVE_STATUS_LABEL, GO_LIVE_STATUS_COLOR } from '../services/goLive';
import type { GoLiveBugTask } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const ROLE_LABEL: Record<GoLiveBugTask['assigneeRole'], string> = { admin: 'Admin', manager: 'Yönetici', field: 'Saha', support: 'Destek' };

export default function GoLiveBugTasksScreen() {
  const [tasks, setTasks] = useState<GoLiveBugTask[]>([]);
  useFocusEffect(useCallback(() => { (async () => setTasks(await listGoLiveBugTasks()))(); }, []));
  const stats = useMemo(() => ({
    open: tasks.filter(t => t.status === 'open').length,
    inProg: tasks.filter(t => t.status === 'in_progress').length,
    resolved: tasks.filter(t => t.status === 'resolved').length,
    fromFeedback: tasks.filter(t => t.feedbackId).length,
  }), [tasks]);
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={tasks}
        keyExtractor={t => t.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.heroCard}>
              <Ionicons name="construct" size={48} color="#a855f7" />
              <Text style={s.heroT}>Hata Bildiriminden Görev</Text>
              <Text style={s.heroD}>Geri bildirimden teknik görev oluşturma akışı</Text>
            </View>
            <View style={s.statRow}>
              <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.open}</Text><Text style={s.statL}>Açık</Text></View>
              <View style={[s.statBox, { borderColor: '#f59e0b' }]}><Text style={[s.statV, { color: '#f59e0b' }]}>{stats.inProg}</Text><Text style={s.statL}>Devam</Text></View>
              <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{stats.resolved}</Text><Text style={s.statL}>Çözüldü</Text></View>
              <View style={[s.statBox, { borderColor: '#06b6d4' }]}><Text style={[s.statV, { color: '#06b6d4' }]}>{stats.fromFeedback}</Text><Text style={s.statL}>Bildirimden</Text></View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="construct-outline"
            title="Görev yok"
            subtitle="Hata bildirimlerine bağlı bir teknik görev bulunmuyor."
          />
        }
        renderItem={({ item: t }) => (
          <View key={t.id} style={[s.card, { borderLeftColor: GO_LIVE_SEVERITY_COLOR[t.severity as keyof typeof GO_LIVE_SEVERITY_COLOR] }]}>
            <View style={s.headRow}>
              <View style={[s.pill, { backgroundColor: GO_LIVE_SEVERITY_COLOR[t.severity as keyof typeof GO_LIVE_SEVERITY_COLOR] + '33', borderColor: GO_LIVE_SEVERITY_COLOR[t.severity as keyof typeof GO_LIVE_SEVERITY_COLOR] }]}>
                <Text style={[s.pillT, { color: GO_LIVE_SEVERITY_COLOR[t.severity as keyof typeof GO_LIVE_SEVERITY_COLOR] }]}>{GO_LIVE_SEVERITY_LABEL[t.severity as keyof typeof GO_LIVE_SEVERITY_LABEL]}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: GO_LIVE_STATUS_COLOR[t.status as keyof typeof GO_LIVE_STATUS_COLOR] + '33', borderColor: GO_LIVE_STATUS_COLOR[t.status as keyof typeof GO_LIVE_STATUS_COLOR] }]}>
                <Text style={[s.pillT, { color: GO_LIVE_STATUS_COLOR[t.status as keyof typeof GO_LIVE_STATUS_COLOR] }]}>{GO_LIVE_STATUS_LABEL[t.status as keyof typeof GO_LIVE_STATUS_LABEL]}</Text>
              </View>
              {t.feedbackId && (
                <View style={[s.pill, { borderColor: '#06b6d4' }]}>
                  <Text style={[s.pillT, { color: '#06b6d4' }]}>FB #{t.feedbackId}</Text>
                </View>
              )}
            </View>
            <Text style={s.title}>{t.title}</Text>
            <View style={s.metaRow}>
              <Text style={s.meta}><Ionicons name="person" size={11} color={colors.text.muted} /> {ROLE_LABEL[t.assigneeRole as keyof typeof ROLE_LABEL]}</Text>
              <Text style={s.meta}><Ionicons name="calendar" size={11} color={colors.text.muted} /> {t.createdAt}</Text>
              {t.eta && <Text style={[s.meta, { color: '#f59e0b' }]}>ETA: {t.eta}</Text>}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#a855f7', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: 6 },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { fontSize: typography.md, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { color: colors.text.muted, fontSize: 10 },
});
