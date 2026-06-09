// AttendanceReportScreen — POZ-DEV-118 Aylık puantaj raporu
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deliverPdf, PDF_BRAND_CSS, pdfBrandHeader } from '../services/pdf';
import { BRAND } from '../config/brand';

import { colors, spacing, radius, typography } from '../theme';
import { shiftsRepo, isOnlineMode } from '../services/data';
import type { Shift } from '../services/data/shiftsRepo';
import { useAppContext } from '../context/AppContext';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface UserRow {
  userId: string;
  name: string;
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
  const nav = useNavigation<Nav>();
  const { employees } = useAppContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const online = isOnlineMode();

  const employeesById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of employees) m[e.id] = e.name;
    return m;
  }, [employees]);

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
      const name =
        (s.employeeId && employeesById[s.employeeId]) ||
        employeesById[s.userId] ||
        `Personel #${(s.userId || '').slice(0, 6) || '—'}`;
      const u = byUser.get(s.userId) ?? { userId: s.userId, name, totalMinutes: 0, breakMinutes: 0, days: 0, shifts: 0 };
      u.name = name;
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
  }, [shifts, employeesById]);

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

  const exportPdf = useCallback(async () => {
    if (rows.length === 0) {
      Alert.alert('PDF', 'Bu ay için yazdırılacak veri yok.');
      return;
    }
    setExporting(true);
    try {
      const esc = (v: string) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const trs = rows.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
          <td><strong>${esc(r.name)}</strong></td>
          <td class="right">${r.days}</td>
          <td class="right">${r.shifts}</td>
          <td class="right" style="color:#15803d;font-weight:700">${esc(hhmm(r.totalMinutes))}</td>
          <td class="right" style="color:#b45309">${esc(hhmm(r.breakMinutes))}</td>
        </tr>`).join('');
      const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/><title>Puantaj ${esc(monthLabel)}</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: Helvetica, Arial, sans-serif; color:#1f2937; margin:0; padding:24px; font-size:11px; }
  .header { border-bottom:3px solid #1e40af; padding-bottom:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:flex-end; }
  .title { font-size:20px; font-weight:900; color:#1e40af; }
  .sub { font-size:10px; color:#6b7280; }
  .stats { display:flex; gap:10px; margin-bottom:14px; }
  .stat { flex:1; border:1px solid #e5e7eb; border-radius:6px; padding:10px; background:#f9fafb; }
  .stat .l { font-size:9px; color:#6b7280; font-weight:700; text-transform:uppercase; }
  .stat .v { font-size:16px; font-weight:900; color:#1e40af; margin-top:2px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#1e40af; color:#fff; padding:8px 6px; font-size:10px; font-weight:800; text-align:left; text-transform:uppercase; }
  td { padding:7px 6px; border-bottom:1px solid #e5e7eb; font-size:11px; }
  td.right { text-align:right; font-variant-numeric:tabular-nums; }
  .footer { margin-top:22px; font-size:9px; color:#6b7280; text-align:center; border-top:1px solid #e5e7eb; padding-top:10px; }
  ${PDF_BRAND_CSS}
  tbody tr { page-break-inside: avoid; }
</style></head><body>
${pdfBrandHeader('PUANTAJ RAPORU', monthLabel)}
<div class="stats">
  <div class="stat"><div class="l">Personel</div><div class="v">${totals.users}</div></div>
  <div class="stat"><div class="l">Vardiya</div><div class="v">${totals.shifts}</div></div>
  <div class="stat"><div class="l">Toplam Mesai</div><div class="v">${esc(hhmm(totals.totalMinutes))}</div></div>
  <div class="stat"><div class="l">Toplam Mola</div><div class="v">${esc(hhmm(totals.breakMinutes))}</div></div>
</div>
<table><thead><tr><th>Personel</th><th style="text-align:right">Gün</th><th style="text-align:right">Vardiya</th><th style="text-align:right">Mesai</th><th style="text-align:right">Mola</th></tr></thead><tbody>${trs}</tbody></table>
<div class="footer">${esc(BRAND.company.legalName)} · Bu rapor sistem tarafından üretilmiştir.</div>
</body></html>`;
      await deliverPdf(html, { fileName: `Puantaj-${monthLabel}.pdf`, dialogTitle: `Puantaj ${monthLabel}` });
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'PDF oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  }, [rows, totals, monthLabel]);

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

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => nav.navigate('ShiftHistory')}
          style={[styles.actionBtn, { backgroundColor: '#1e40af' }]}
        >
          <Ionicons name="list-outline" size={14} color="#fff" />
          <Text style={styles.actionBtnText}>Detaylı Geçmiş</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={exportPdf}
          disabled={exporting || rows.length === 0}
          style={[styles.actionBtn, { backgroundColor: '#dc2626' }, (exporting || rows.length === 0) && { opacity: 0.5 }]}
        >
          {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="document-text-outline" size={14} color="#fff" />}
          <Text style={styles.actionBtnText}>PDF Al</Text>
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
                <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{r.name}</Text>
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
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
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
