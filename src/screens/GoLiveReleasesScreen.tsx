// Faz 55 — GoLiveReleasesScreen (POZ-DEV-261)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveReleases } from '../services/goLive';
import type { GoLiveRelease } from '../types';

const TYPE_LABEL: Record<GoLiveRelease['type'], string> = { patch: 'Patch', minor: 'Minor', major: 'Major' };
const TYPE_COLOR: Record<GoLiveRelease['type'], string> = { patch: '#22c55e', minor: '#3b82f6', major: '#a855f7' };
const STATUS_LABEL: Record<GoLiveRelease['status'], string> = { planned: 'Planlandı', in_progress: 'Geliştirme', released: 'Yayında' };
const STATUS_COLOR: Record<GoLiveRelease['status'], string> = { planned: '#64748b', in_progress: '#f59e0b', released: '#22c55e' };
const STATUS_ICON: Record<GoLiveRelease['status'], string> = { planned: 'calendar-outline', in_progress: 'hammer', released: 'checkmark-done-circle' };

export default function GoLiveReleasesScreen() {
  const [items, setItems] = useState<GoLiveRelease[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listGoLiveReleases()))(); }, []));
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="git-branch" size={48} color="#10b981" />
          <Text style={s.heroT}>Sürüm Planı & Release Notları</Text>
          <Text style={s.heroD}>{items.length} sürüm</Text>
        </View>
        {items.map(r => (
          <View key={r.id} style={[s.card, { borderLeftColor: TYPE_COLOR[r.type] }]}>
            <View style={s.headRow}>
              <Text style={s.ver}>v{r.version}</Text>
              <View style={[s.pill, { backgroundColor: TYPE_COLOR[r.type] + '33', borderColor: TYPE_COLOR[r.type] }]}>
                <Text style={[s.pillT, { color: TYPE_COLOR[r.type] }]}>{TYPE_LABEL[r.type]}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: STATUS_COLOR[r.status] + '33', borderColor: STATUS_COLOR[r.status] }]}>
                <Ionicons name={STATUS_ICON[r.status] as any} size={11} color={STATUS_COLOR[r.status]} />
                <Text style={[s.pillT, { color: STATUS_COLOR[r.status] }]}>{STATUS_LABEL[r.status]}</Text>
              </View>
            </View>
            <Text style={s.date}><Ionicons name="calendar" size={11} color={colors.text.muted} /> Planlanan: {r.plannedDate}</Text>
            <View style={s.notesBox}>
              {r.notes.map((n, i) => (
                <View key={i} style={s.noteRow}>
                  <Ionicons name="chevron-forward-circle" size={12} color={TYPE_COLOR[r.type]} />
                  <Text style={s.note}>{n}</Text>
                </View>
              ))}
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#10b981', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  ver: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, marginLeft: 'auto' },
  pillT: { fontSize: 10, fontWeight: '800' },
  date: { color: colors.text.muted, fontSize: typography.xs },
  notesBox: { backgroundColor: colors.bg.primary, padding: 8, borderRadius: 6, gap: 6 },
  noteRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  note: { flex: 1, color: colors.text.primary, fontSize: typography.xs, lineHeight: 16 },
});
