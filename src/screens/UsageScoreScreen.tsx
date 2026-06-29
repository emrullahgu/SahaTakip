// UsageScoreScreen — Uygulama kullanım takibi + skor. Yönetici/müdür HERKESİ
// (leaderboard: aktif gün · oturum · aksiyon · skor); kullanıcı yalnız kendini görür.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography, brand } from '../theme';
import { useAuth } from '../context/AuthContext';
import { listUsage, flushUsage, UsageScore } from '../services/usageTracker';
import EmptyState from '../components/EmptyState';

const RANGES = [{ d: 7, l: '7 gün' }, { d: 30, l: '30 gün' }, { d: 90, l: '90 gün' }];
const MEDAL = ['🥇', '🥈', '🥉'];

function relTime(iso: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'az önce';
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

export default function UsageScoreScreen() {
  const { profile, user, isDemoMode } = useAuth();
  const role = profile?.role ?? (isDemoMode ? 'admin' : 'field');
  const isManager = isDemoMode || role === 'admin' || role === 'manager';

  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<UsageScore[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { await flushUsage(); setRows(await listUsage(days)); }
    finally { setLoading(false); }
  }, [days]);
  useFocusEffect(useCallback(() => { setLoading(true); refresh(); }, [refresh]));

  const RangeBar = (
    <View style={s.rangeBar}>
      {RANGES.map(r => (
        <TouchableOpacity key={r.d} style={[s.rangeChip, days === r.d && s.rangeSel]} onPress={() => { setLoading(true); setDays(r.d); }}>
          <Text style={[s.rangeText, days === r.d && s.rangeTextSel]}>{r.l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }

  // Kullanıcı: yalnız kendi (RLS zaten kısıtlar; ekranda da tek kart)
  if (!isManager) {
    const mine = rows.find(r => r.userId === user?.id) || rows[0];
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        {RangeBar}
        <ScrollView contentContainerStyle={s.content}>
          {!mine ? (
            <EmptyState icon="bar-chart-outline" title="Kullanım verisi yok" description="Uygulamayı kullandıkça aktiviteniz burada görünür." />
          ) : (
            <View style={s.selfCard}>
              <Text style={s.selfScore}>{mine.score}</Text>
              <Text style={s.selfScoreLabel}>Kullanım Skoru ({days} gün)</Text>
              <View style={s.statGrid}>
                <Stat label="Aktif gün" value={mine.activeDays} icon="calendar-outline" />
                <Stat label="Oturum" value={mine.sessions} icon="log-in-outline" />
                <Stat label="Aksiyon" value={mine.actions} icon="hand-left-outline" />
                <Stat label="Ekran" value={mine.screens} icon="phone-portrait-outline" />
              </View>
              <Text style={s.lastActive}>Son aktiflik: {relTime(mine.lastActive)}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Yönetici/müdür: leaderboard
  const maxScore = rows.length ? rows[0].score || 1 : 1;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {RangeBar}
      {rows.length === 0 ? (
        <EmptyState icon="bar-chart-outline" title="Kullanım verisi yok" description="Ekip uygulamayı kullandıkça skorlar burada birikecek." />
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.hint}>{rows.length} kullanıcı · son {days} gün · skora göre sıralı</Text>
          {rows.map((u, i) => (
            <View key={u.userId} style={s.row}>
              <Text style={s.rank}>{MEDAL[i] || `${i + 1}.`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{u.name}</Text>
                <Text style={s.meta}>{u.activeDays} gün · {u.sessions} oturum · {u.actions} aksiyon · {relTime(u.lastActive)}</Text>
                <View style={s.barTrack}><View style={[s.barFill, { width: `${Math.max(4, Math.round((u.score / maxScore) * 100))}%` }]} /></View>
              </View>
              <Text style={s.score}>{u.score}</Text>
            </View>
          ))}
          <Text style={s.formula}>Skor = aktif gün×10 + oturum×5 + aksiyon×1 + ekran×0.5</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.statBox}>
      <Ionicons name={icon} size={18} color={brand.blue} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 90, gap: spacing.sm },
  rangeBar: { flexDirection: 'row', gap: 8, padding: spacing.md },
  rangeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  rangeSel: { backgroundColor: brand.blue, borderColor: brand.blue },
  rangeText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  rangeTextSel: { color: '#fff' },
  hint: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  rank: { width: 30, textAlign: 'center', fontSize: typography.md, fontWeight: '800', color: colors.text.muted },
  name: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  barTrack: { height: 5, backgroundColor: colors.bg.tertiary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 5, backgroundColor: brand.green, borderRadius: 3 },
  score: { color: brand.green, fontSize: typography.lg, fontWeight: '900', minWidth: 44, textAlign: 'right' },
  formula: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.md },
  selfCard: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  selfScore: { color: brand.green, fontSize: 56, fontWeight: '900' },
  selfScoreLabel: { color: colors.text.muted, fontSize: typography.base, fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginTop: spacing.xl },
  statBox: { width: 130, alignItems: 'center', gap: 4, paddingVertical: spacing.md, backgroundColor: colors.bg.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  statValue: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '900' },
  statLabel: { color: colors.text.muted, fontSize: typography.xs },
  lastActive: { color: colors.text.faint, fontSize: typography.sm, marginTop: spacing.lg },
});
