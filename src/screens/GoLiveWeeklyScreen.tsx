// Faz 55 — GoLiveWeeklyScreen (POZ-DEV-258)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getGoLiveWeekly } from '../services/goLive';
import type { GoLiveWeeklyReport } from '../types';
import EmptyState from '../components/EmptyState';

export default function GoLiveWeeklyScreen() {
  const [r, setR] = useState<GoLiveWeeklyReport | null>(null);
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;
  useFocusEffect(useCallback(() => { (async () => setR(await getGoLiveWeekly()))(); }, []));
  if (!r) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <EmptyState icon="calendar-outline" title="Yükleniyor…" subtitle="Haftalık rapor verileri hazırlanıyor." />
      </SafeAreaView>
    );
  }
  const activeRate = Math.round((r.activeUsers / r.totalUsers) * 100);
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="calendar" size={48} color="#3b82f6" />
          <Text style={s.heroT}>İlk Hafta Canlı Kullanım Raporu</Text>
          <Text style={s.heroD}>{r.weekStart} → {r.weekEnd}</Text>
        </View>
        <View style={s.grid}>
          <Kpi w={tileW} l="Toplam Kullanıcı" v={r.totalUsers.toString()} c="#3b82f6" />
          <Kpi w={tileW} l="Aktif Kullanıcı" v={`${r.activeUsers} (%${activeRate})`} c="#22c55e" />
          <Kpi w={tileW} l="Toplam Oturum" v={r.sessions.toString()} c="#06b6d4" />
          <Kpi w={tileW} l="Crash" v={r.crashes.toString()} c="#ef4444" />
          <Kpi w={tileW} l="Hata" v={r.errors.toString()} c="#f59e0b" />
          <Kpi w={tileW} l="Geri Bildirim" v={r.feedbacks.toString()} c="#a855f7" />
          <Kpi w={tileW} l="Çözülen Hata" v={r.resolvedBugs.toString()} c="#10b981" />
          <Kpi w={tileW} l="Aktivasyon" v={`%${activeRate}`} c="#ec4899" />
        </View>
        <Text style={s.sectionT}>Öne Çıkanlar</Text>
        {r.highlights.map((h, i) => (
          <View key={i} style={s.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={s.bullet}>{h}</Text>
          </View>
        ))}
        <Text style={s.sectionT}>Öncelikli Konular</Text>
        {r.topIssues.map((it, i) => (
          <View key={i} style={s.bulletRow}>
            <Ionicons name="warning" size={16} color="#f59e0b" />
            <Text style={s.bullet}>{it}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ w, l, v, c }: { w: string; l: string; v: string; c: string }) {
  return (
    <View style={[s.kpi, { width: w as any, borderColor: c }]}>
      <Text style={s.kpiL}>{l}</Text>
      <Text style={[s.kpiV, { color: c }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', textAlign: 'center' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  kpi: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, marginBottom: spacing.sm, gap: 4 },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  bullet: { flex: 1, color: colors.text.primary, fontSize: typography.xs, lineHeight: 18 },
});
