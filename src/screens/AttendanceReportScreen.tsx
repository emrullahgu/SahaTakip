// AttendanceReportScreen — POZ-DEV-118 Aylık puantaj raporu
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { shiftsRepo, isOnlineMode } from '../services/data';
import type { Shift } from '../services/data/shiftsRepo';

interface UserRow {
  userId: string;
  totalMinutes: number;
  breakMinutes: number;
  days: number;
  shifts: number;
}

function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}s ${m.toString().padStart(2, '0')}d`;
}

function shiftDurationMin(s: Shift): number {
  if (!s.endAt) return 0;
  const start = new Date(s.startAt).getTime();
  const end = new Date(s.endAt).getTime();
  const total = Math.max(0, (end - start) / 60000);
  return Math.max(0, total - (s.breakMinutes ?? 0));
}

export default function AttendanceReportScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const online = isOnlineMode();

  const refresh = useCallback(async () => {
    setLoading(true);
    setShifts(await shiftsRepo.listMonth(year, month));
    setLoading(false);
  }, [year, month]);

  useEffect(() => { refresh(); }, [refresh]);

  const rows = useMemo<UserRow[]>(() => {
    const byUser = new Map<string, UserRow>();
    const daysSet = new Map<string, Set<string>>();
    for (const s of shifts) {
      const u = byUser.get(s.userId) ?? { userId: s.userId, totalMinutes: 0, breakMinutes: 0, days: 0, shifts: 0 };
      u.totalMinutes += shiftDurationMin(s);
      u.breakMinutes += s.breakMinutes ?? 0;
      u.shifts += 1;
      byUser.set(s.userId, u);
      const dayKey = s.startAt.slice(0, 10);
      const set = daysSet.get(s.userId) ?? new Set<string>();
      set.add(dayKey);
      daysSet.set(s.userId, set);
    }
    return Array.from(byUser.values()).map(r => ({ ...r, days: daysSet.get(r.userId)?.size ?? 0 }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [shifts]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({ totalMinutes: acc.totalMinutes + r.totalMinutes, breakMinutes: acc.breakMinutes + r.breakMinutes, shifts: acc.shifts + r.shifts, users: acc.users + 1 }),
      { totalMinutes: 0, breakMinutes: 0, shifts: 0, users: 0 }
    );
  }, [rows]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

  if (!online) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.faint} />
          <Text style={styles.emptyText}>Puantaj raporu için çevrimiçi olmalısınız.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Personel" value={String(totals.users)} color="#0ea5e9" />
        <Stat label="Vardiya" value={String(totals.shifts)} color="#22c55e" />
        <Stat label="Toplam" value={hhmm(totals.totalMinutes)} color="#8b5cf6" />
        <Stat label="Mola" value={hhmm(totals.breakMinutes)} color="#f59e0b" />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color="#22c55e" /></View>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.text.faint} />
            <Text style={styles.emptyText}>Bu ayda kayıtlı vardiya yok.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.theadRow}>
              <Text style={[styles.th, { flex: 2 }]}>Kullanıcı</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Gün</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Vardiya</Text>
              <Text style={[styles.th, { flex: 1.4, textAlign: 'right' }]}>Mesai</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Mola</Text>
            </View>
            {rows.map((r, i) => (
              <View key={r.userId} style={[styles.trow, i % 2 === 0 && styles.altRow]}>
                <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{r.userId.slice(0, 8)}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.days}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.shifts}</Text>
                <Text style={[styles.td, { flex: 1.4, textAlign: 'right', color: '#22c55e', fontWeight: '700' }]}>{hhmm(r.totalMinutes)}</Text>
                <Text style={[styles.td, { flex: 1.2, textAlign: 'right', color: '#f59e0b' }]}>{hhmm(r.breakMinutes)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  navBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 8, padding: spacing.md },
  statCard: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  statValue: { fontWeight: '800', fontSize: typography.sm },
  statLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  table: { borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, overflow: 'hidden' },
  theadRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border.primary, backgroundColor: '#0f172a' },
  th: { color: colors.text.muted, fontSize: 11, fontWeight: '800' },
  trow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  altRow: { backgroundColor: '#0a1220' },
  td: { color: colors.text.primary, fontSize: typography.xs },
});
