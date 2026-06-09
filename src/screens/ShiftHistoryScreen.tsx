// ShiftHistoryScreen — POZ-DEV-360 Mesai Geçmişi (Tamamlanan Vardiyalar)
// Admin/Manager için: seçilen aydaki tüm tamamlanmış mesailer.
// Her satırda: Personel adı, başlangıç saati, bitiş saati, süre, konum.
// PDF olarak çıktı alma + her gün özet sekmesi.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { openUrlSafe } from '../utils/urlGuard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deliverPdf, PDF_BRAND_CSS, pdfBrandHeader } from '../services/pdf';
import { BRAND } from '../config/brand';

import { colors, spacing, radius, typography, brand } from '../theme';
import { shiftsRepo } from '../services/data/shiftsRepo';
import type { Shift } from '../services/data/shiftsRepo';
import { isOnlineMode } from '../services/data';
import { useAppContext } from '../context/AppContext';
import { useHasRole } from '../components/RoleGuard';
import RoleLockScreen from '../components/RoleLockScreen';

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}
function fmtDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}
function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface HistoryRow {
  id: string;
  employeeName: string;
  userId: string;
  startAt: string;
  endAt: string | null | undefined;
  durationMin: number;
  breakMinutes: number;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  notes?: string | null;
  status: 'completed' | 'active';
}

export default function ShiftHistoryScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) {
    return <RoleLockScreen description="Mesai geçmişini yalnızca yönetici ve müdür görüntüleyebilir." />;
  }
  return <ShiftHistoryInner />;
}

function ShiftHistoryInner() {
  const { employees } = useAppContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'completed'>('all');
  const [exporting, setExporting] = useState(false);
  const online = isOnlineMode();

  const employeesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of employees) {
      map[e.id] = e.name;
      // Bazı kayıtlarda user_id employees.id'ye eşit; yine de ayrı kontrol için aynı haritada tutalım.
    }
    return map;
  }, [employees]);

  const refresh = useCallback(async () => {
    if (!online) {
      setShifts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await shiftsRepo.listMonth(year, month);
      setShifts(list);
    } finally {
      setLoading(false);
    }
  }, [year, month, online]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = useMemo<HistoryRow[]>(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return shifts
      .map<HistoryRow>((s) => {
        const name =
          (s.employeeId && employeesById[s.employeeId]) ||
          employeesById[s.userId] ||
          `Personel #${(s.userId || '').slice(0, 6) || '—'}`;
        const startMs = new Date(s.startAt).getTime();
        const endMs = s.endAt ? new Date(s.endAt).getTime() : Date.now();
        const total = Number.isFinite(startMs) && Number.isFinite(endMs) ? (endMs - startMs) / 60000 : 0;
        const dur = Math.max(0, total - (s.breakMinutes ?? 0));
        return {
          id: s.id,
          employeeName: name,
          userId: s.userId,
          startAt: s.startAt,
          endAt: s.endAt,
          durationMin: dur,
          breakMinutes: s.breakMinutes ?? 0,
          startLat: s.startLat,
          startLng: s.startLng,
          endLat: s.endLat,
          endLng: s.endLng,
          notes: s.notes,
          status: s.endAt ? 'completed' : 'active',
        };
      })
      .filter((r) => {
        if (filter === 'completed') return r.status === 'completed';
        if (filter === 'today') return r.startAt.slice(0, 10) === todayKey;
        return true;
      })
      .sort((a, b) => (a.startAt < b.startAt ? 1 : -1));
  }, [shifts, employeesById, filter]);

  const stats = useMemo(() => {
    const completed = rows.filter((r) => r.status === 'completed');
    const totalMin = completed.reduce((acc, r) => acc + r.durationMin, 0);
    return {
      total: rows.length,
      completed: completed.length,
      active: rows.length - completed.length,
      totalHours: totalMin / 60,
    };
  }, [rows]);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  const openMap = useCallback((lat?: number | null, lng?: number | null) => {
    if (lat == null || lng == null) return;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    openUrlSafe(url, { silent: true });
  }, []);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  const buildPdfHtml = useCallback((): string => {
    const tableRows = rows
      .map((r) => {
        const loc = r.startLat != null && r.startLng != null ? `${r.startLat.toFixed(4)}, ${r.startLng.toFixed(4)}` : '—';
        const status = r.status === 'completed' ? '<span style="color:#15803d;font-weight:700">Tamamlandı</span>' : '<span style="color:#b45309;font-weight:700">Devam Ediyor</span>';
        return `
          <tr>
            <td><strong>${escapeHtml(r.employeeName)}</strong></td>
            <td>${escapeHtml(fmtDate(r.startAt))}</td>
            <td class="center">${escapeHtml(fmtTime(r.startAt))}</td>
            <td class="center">${escapeHtml(fmtTime(r.endAt))}</td>
            <td class="right">${escapeHtml(fmtDuration(r.durationMin))}</td>
            <td class="right">${r.breakMinutes ? r.breakMinutes + ' dk' : '—'}</td>
            <td class="small">${escapeHtml(loc)}</td>
            <td>${status}</td>
          </tr>`;
      })
      .join('');

    const empSummary = (() => {
      const byEmp = new Map<string, { name: string; count: number; totalMin: number }>();
      for (const r of rows) {
        if (r.status !== 'completed') continue;
        const key = r.userId;
        const cur = byEmp.get(key) ?? { name: r.employeeName, count: 0, totalMin: 0 };
        cur.count += 1;
        cur.totalMin += r.durationMin;
        byEmp.set(key, cur);
      }
      return Array.from(byEmp.values())
        .sort((a, b) => b.totalMin - a.totalMin)
        .map(
          (e) => `
          <tr>
            <td><strong>${escapeHtml(e.name)}</strong></td>
            <td class="center">${e.count}</td>
            <td class="right"><strong>${escapeHtml(fmtDuration(e.totalMin))}</strong></td>
          </tr>`,
        )
        .join('');
    })();

    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8" />
<title>Mesai Geçmişi ${escapeHtml(monthLabel)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 26px 28px; font-size: 10px; }
  .header { border-bottom: 3px solid #1e40af; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  .title { font-size: 20px; font-weight: 900; color: #1e40af; }
  .sub { font-size: 10px; color: #6b7280; margin-top: 4px; }
  .stats { display: flex; gap: 10px; margin-bottom: 14px; }
  .stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; background: #f9fafb; }
  .stat .l { font-size: 9px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .stat .v { font-size: 16px; font-weight: 900; color: #1e40af; margin-top: 2px; }
  h2 { font-size: 13px; font-weight: 800; color: #1e40af; margin: 18px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e40af; color: #fff; padding: 7px 5px; font-size: 9px; font-weight: 800; text-transform: uppercase; text-align: left; }
  td { padding: 6px 5px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: middle; }
  td.center { text-align: center; }
  td.right { text-align: right; font-variant-numeric: tabular-nums; }
  td.small { font-size: 9px; color: #6b7280; }
  tr:nth-child(even) td { background: #fafbfc; }
  .footer { margin-top: 22px; font-size: 9px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  .empty { padding: 30px; text-align: center; color: #6b7280; }
  ${PDF_BRAND_CSS}
  tbody tr { page-break-inside: avoid; }
</style></head><body>
  ${pdfBrandHeader('MESAİ GEÇMİŞİ', monthLabel)}

  <div class="stats">
    <div class="stat"><div class="l">Toplam Vardiya</div><div class="v">${stats.total}</div></div>
    <div class="stat"><div class="l">Tamamlanan</div><div class="v">${stats.completed}</div></div>
    <div class="stat"><div class="l">Aktif</div><div class="v">${stats.active}</div></div>
    <div class="stat"><div class="l">Toplam Süre</div><div class="v">${stats.totalHours.toFixed(1)} sa</div></div>
  </div>

  <h2>Detaylı Vardiya Listesi</h2>
  ${rows.length === 0 ? '<div class="empty">Bu ay/filtre için kayıt yok.</div>' : `
  <table>
    <thead><tr>
      <th>Personel</th>
      <th>Tarih</th>
      <th style="text-align:center">Başlangıç</th>
      <th style="text-align:center">Bitiş</th>
      <th style="text-align:right">Süre</th>
      <th style="text-align:right">Mola</th>
      <th>Konum</th>
      <th>Durum</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>`}

  ${empSummary ? `
  <h2>Personel Özeti (Tamamlanan)</h2>
  <table>
    <thead><tr>
      <th>Personel</th>
      <th style="text-align:center">Vardiya</th>
      <th style="text-align:right">Toplam Süre</th>
    </tr></thead>
    <tbody>${empSummary}</tbody>
  </table>` : ''}

  <div class="footer">${escapeHtml(BRAND.company.legalName)} · Bu rapor sistem tarafından üretilmiştir.</div>
</body></html>`;
  }, [rows, stats, monthLabel]);

  const exportPdf = useCallback(async () => {
    if (rows.length === 0) {
      Alert.alert('PDF', 'Bu ay için yazdırılacak kayıt yok.');
      return;
    }
    setExporting(true);
    try {
      const html = buildPdfHtml();
      await deliverPdf(html, { fileName: `Mesai-Gecmisi-${monthLabel}.pdf`, dialogTitle: `Mesai Geçmişi ${monthLabel}` });
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'PDF oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  }, [rows.length, buildPdfHtml, monthLabel]);

  if (!online) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.faint} />
          <Text style={styles.emptyText}>Mesai geçmişi için çevrimiçi olmalısınız.</Text>
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

      <View style={styles.filterRow}>
        {(['all', 'today', 'completed'] as const).map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setFilter(k)}
            style={[styles.chip, filter === k && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === k && styles.chipTextActive]}>
              {k === 'all' ? 'Tümü' : k === 'today' ? 'Bugün' : 'Tamamlanan'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={exportPdf}
          disabled={exporting || rows.length === 0}
          style={[styles.pdfBtn, (exporting || rows.length === 0) && { opacity: 0.5 }]}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="document-text-outline" size={16} color="#fff" />
          )}
          <Text style={styles.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Toplam" value={String(stats.total)} color="#0ea5e9" />
        <Stat label="Tamamlandı" value={String(stats.completed)} color="#22c55e" />
        <Stat label="Aktif" value={String(stats.active)} color="#f59e0b" />
        <Stat label="Saat" value={stats.totalHours.toFixed(1)} color="#8b5cf6" />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={brand.green} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.text.faint} />
            <Text style={styles.emptyText}>Bu ay/filtre için kayıt yok.</Text>
          </View>
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={18} color={brand.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.employeeName}
                  </Text>
                  <Text style={styles.date}>{fmtDate(r.startAt)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    r.status === 'completed' ? styles.badgeOk : styles.badgeWarn,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      r.status === 'completed' ? styles.badgeOkText : styles.badgeWarnText,
                    ]}
                  >
                    {r.status === 'completed' ? 'Tamamlandı' : 'Aktif'}
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Başlangıç</Text>
                  <Text style={styles.timeValue}>{fmtTime(r.startAt)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.text.muted} />
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Bitiş</Text>
                  <Text style={[styles.timeValue, r.status === 'active' && { color: '#f59e0b' }]}>
                    {fmtTime(r.endAt)}
                  </Text>
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Süre</Text>
                  <Text style={[styles.timeValue, { color: brand.green }]}>
                    {fmtDuration(r.durationMin)}
                  </Text>
                </View>
              </View>

              {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}

              <View style={styles.locRow}>
                {r.startLat != null && r.startLng != null ? (
                  <TouchableOpacity style={styles.locBtn} onPress={() => openMap(r.startLat, r.startLng)}>
                    <Ionicons name="location-outline" size={14} color={brand.blue} />
                    <Text style={styles.locText}>Başlangıç konumu</Text>
                  </TouchableOpacity>
                ) : null}
                {r.endLat != null && r.endLng != null ? (
                  <TouchableOpacity style={styles.locBtn} onPress={() => openMap(r.endLat, r.endLng)}>
                    <Ionicons name="location" size={14} color={brand.green} />
                    <Text style={styles.locText}>Bitiş konumu</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.md,
    textTransform: 'capitalize',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#062a14' },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8, padding: spacing.md },
  statCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
  },
  statValue: { fontWeight: '800', fontSize: typography.sm },
  statLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  date: { color: colors.text.muted, fontSize: 11, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOk: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#15803d' },
  badgeWarn: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: '#b45309' },
  statusText: { fontSize: 10, fontWeight: '800' },
  badgeOkText: { color: '#15803d' },
  badgeWarnText: { color: '#b45309' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: 6,
    paddingHorizontal: 4,
  },
  timeBlock: { alignItems: 'center', minWidth: 64 },
  timeLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  timeValue: { color: colors.text.primary, fontWeight: '800', marginTop: 2, fontSize: typography.sm },
  notes: {
    marginTop: spacing.sm,
    padding: 8,
    backgroundColor: colors.bg.primary,
    borderRadius: radius.sm,
    color: colors.text.secondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  locRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: radius.sm,
  },
  locText: { color: brand.blue, fontSize: 11, fontWeight: '700' },
});
