// ManagerCommandCenterScreen — Yönetici Komuta Merkezi
// Tek noktadan: aktif mesai, tamamlanan mesai, iş emirleri, teklifler,
// maliyet/harcamalar, müşteri performansı, aktivite akışı (audit log) ve PDF.
// Admin/Manager rol-kilidi.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deliverPdf, PDF_BRAND_CSS, pdfBrandHeader } from '../services/pdf';
import { BRAND } from '../config/brand';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useHasRole } from '../components/RoleGuard';
import RoleLockScreen from '../components/RoleLockScreen';
import { computeKpi } from '../services/reports';
import type { ReportPeriod, RootStackParamList } from '../types';
import { shiftsRepo } from '../services/data/shiftsRepo';
import type { Shift } from '../services/data/shiftsRepo';
import { auditRepo } from '../services/data/auditRepo';
import type { AuditLogRow } from '../services/data/auditRepo';
import { isOnlineMode, supabase } from '../services/data';
import { listExpenses, type Expense } from '../services/expenses';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
function fmtHours(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '0 sa';
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}
function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
function trDate(iso: string) {
  try {
    // ISO 'YYYY-MM-DD' \u00fczerinde UTC->yerel kaymas\u0131n\u0131 \u00f6nlemek i\u00e7in elle parse
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return new Date(iso).toLocaleDateString('tr-TR');
  } catch {
    return iso;
  }
}
function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Audit action → kullanıcı dostu etiket + ikon
const ACTION_META: Record<string, { label: string; icon: keyof typeof import('@expo/vector-icons/build/Ionicons').default.glyphMap; color: string }> = {
  'work_order.create': { label: 'iş emri oluşturdu', icon: 'add-circle-outline', color: '#22c55e' },
  'work_order.update': { label: 'iş emrini güncelledi', icon: 'create-outline', color: '#0ea5e9' },
  'work_order.delete': { label: 'iş emrini sildi', icon: 'trash-outline', color: '#ef4444' },
  'work_order.status': { label: 'iş emri durumunu güncelledi', icon: 'swap-horizontal-outline', color: '#0ea5e9' },
  'work_order.assign': { label: 'iş emri atadı', icon: 'person-add-outline', color: '#8b5cf6' },
  'work_order.transfer': { label: 'iş emrini devretti', icon: 'git-branch-outline', color: '#8b5cf6' },
  'work_order.approve': { label: 'iş emrini onayladı', icon: 'checkmark-circle-outline', color: '#22c55e' },
  'work_order.client_accept': { label: 'müşteri kabul etti', icon: 'thumbs-up-outline', color: '#10b981' },
  'work_order.media': { label: 'iş emrine medya ekledi', icon: 'image-outline', color: '#06b6d4' },
  'quote.create': { label: 'teklif oluşturdu', icon: 'document-text-outline', color: '#f59e0b' },
  'quote.update': { label: 'teklifi güncelledi', icon: 'create-outline', color: '#f59e0b' },
  'quote.delete': { label: 'teklifi sildi', icon: 'trash-outline', color: '#ef4444' },
  'quote.status': { label: 'teklif durumunu değiştirdi', icon: 'flag-outline', color: '#8b5cf6' },
  'quote.share_token': { label: 'teklif linki paylaştı', icon: 'share-outline', color: '#06b6d4' },
  'customer.create': { label: 'müşteri ekledi', icon: 'business-outline', color: '#22c55e' },
  'customer.update': { label: 'müşteri güncelledi', icon: 'create-outline', color: '#0ea5e9' },
  'customer.delete': { label: 'müşteriyi sildi', icon: 'trash-outline', color: '#ef4444' },
  'employee.wage_update': { label: 'maaş güncelledi', icon: 'cash-outline', color: '#f59e0b' },
  'shift.start': { label: 'mesai başlattı', icon: 'play-circle-outline', color: '#22c55e' },
  'shift.end': { label: 'mesai bitirdi', icon: 'stop-circle-outline', color: '#6b7280' },
  'expense.create': { label: 'masraf ekledi', icon: 'cash-outline', color: '#f59e0b' },
  'expense.update': { label: 'masraf güncelledi', icon: 'create-outline', color: '#f59e0b' },
  'expense.delete': { label: 'masraf sildi', icon: 'trash-outline', color: '#ef4444' },
  'payment.create': { label: 'tahsilat girdi', icon: 'wallet-outline', color: '#10b981' },
  'payment.delete': { label: 'tahsilat sildi', icon: 'trash-outline', color: '#ef4444' },
  'order.create': { label: 'sipariş oluşturdu', icon: 'bag-handle-outline', color: '#f97316' },
  'order.delete': { label: 'siparişi sildi', icon: 'trash-outline', color: '#ef4444' },
};

const PERIODS: { kind: ReportPeriod; label: string }[] = [
  { kind: 'daily', label: 'Bugün' },
  { kind: 'weekly', label: 'Bu Hafta' },
  { kind: 'monthly', label: 'Bu Ay' },
];

export default function ManagerCommandCenterScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) {
    return <RoleLockScreen description="Yönetici Komuta Merkezini yalnızca yönetici ve müdür görüntüleyebilir." />;
  }
  return <Inner />;
}

function Inner() {
  const nav = useNavigation<Nav>();
  const { workOrders, quotes, customers, employees } = useAppContext();
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
  const [periodShifts, setPeriodShifts] = useState<Shift[]>([]);
  const [audit, setAudit] = useState<AuditLogRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const online = isOnlineMode();

  const employeesById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of employees) m[e.id] = e.name;
    return m;
  }, [employees]);

  const { startDate, endDate } = useMemo(() => {
    // rangeFor (services/reports) UTC kayd\u0131rd\u0131\u011f\u0131 i\u00e7in burada yerel saatle hesapl\u0131yoruz
    const a = new Date();
    let s: Date;
    let e: Date;
    if (period === 'daily') {
      s = new Date(a.getFullYear(), a.getMonth(), a.getDate());
      e = s;
    } else if (period === 'weekly') {
      const dow = (a.getDay() + 6) % 7;
      s = new Date(a.getFullYear(), a.getMonth(), a.getDate() - dow);
      e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
    } else {
      s = new Date(a.getFullYear(), a.getMonth(), 1);
      e = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    }
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startDate: fmt(s), endDate: fmt(e) };
  }, [period]);

  const { kpi, byStatus, byEngineer, byCustomer } = useMemo(
    () => computeKpi(period, startDate, endDate, workOrders, quotes, customers),
    [period, startDate, endDate, workOrders, quotes, customers],
  );

  const load = useCallback(async () => {
    if (!online) return;
    setLoading(true);
    try {
      // Mevcut ay + bir önceki ay birleştirilmiş çekim
      // (UTC kayması ve dönem geçişlerinde veri eksikliğini önlemek için)
      const today = new Date();
      const y = today.getFullYear();
      const m = today.getMonth() + 1; // 1..12
      const prevY = m === 1 ? y - 1 : y;
      const prevM = m === 1 ? 12 : m - 1;
      const [active, monthList, prevList, auditList, expList] = await Promise.all([
        shiftsRepo.listActive(),
        shiftsRepo.listMonth(y, m),
        shiftsRepo.listMonth(prevY, prevM),
        auditRepo.list(60),
        listExpenses().catch(() => [] as Expense[]),
      ]);
      const allMonths = [...prevList, ...monthList];
      setActiveShifts(active);
      setPeriodShifts(
        allMonths.filter((sh) => {
          const d = (sh.startAt || '').slice(0, 10);
          return d >= startDate && d <= endDate;
        }),
      );
      setAudit(auditList);
      setExpenses(expList);

      // Profilleri (auth user_id → ad) toplu çöz
      const uids = new Set<string>();
      for (const a of auditList) if (a.user_id) uids.add(a.user_id);
      for (const sh of active) uids.add(sh.userId);
      for (const sh of allMonths) uids.add(sh.userId);
      const ids = Array.from(uids).filter((id) => id && !profilesById[id]);
      if (ids.length) {
        try {
          const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
          if (data && data.length) {
            setProfilesById((prev) => {
              const next = { ...prev };
              for (const p of data as Array<{ id: string; full_name: string | null }>) {
                if (p.full_name) next[p.id] = p.full_name;
              }
              return next;
            });
          }
        } catch {
          // sessiz geç
        }
      }
    } finally {
      setLoading(false);
    }
  }, [online, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Mesai özetleri
  const shiftAgg = useMemo(() => {
    const byEmp = new Map<string, { name: string; minutes: number; count: number }>();
    let totalMin = 0;
    let completed = 0;
    for (const s of periodShifts) {
      if (!s.endAt) continue;
      const startMs = new Date(s.startAt).getTime();
      const endMs = new Date(s.endAt).getTime();
      const dur = Math.max(0, (endMs - startMs) / 60000 - (s.breakMinutes ?? 0));
      totalMin += dur;
      completed += 1;
      const name =
        (s.employeeId && employeesById[s.employeeId]) ||
        employeesById[s.userId] ||
        profilesById[s.userId] ||
        `Personel #${(s.userId || '').slice(0, 6)}`;
      // \u00c7\u00f6z\u00fcml\u00fc isim kanonik anahtar (employee_id ile user_id farkl\u0131 olabilir; ad ayn\u0131ysa tek sat\u0131ra topla)
      const key = name;
      const cur = byEmp.get(key) ?? { name, minutes: 0, count: 0 };
      cur.minutes += dur;
      cur.count += 1;
      byEmp.set(key, cur);
    }
    const top = Array.from(byEmp.values())
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
    return { totalMin, completed, top, active: activeShifts.length };
  }, [periodShifts, activeShifts, employeesById, profilesById]);

  // En pahalı 5 iş
  const topCostWO = useMemo(() => {
    return workOrders
      .filter((w) => (w.date || '').slice(0, 10) >= startDate && (w.date || '').slice(0, 10) <= endDate)
      .map((w) => ({
        id: w.id,
        client: w.client,
        engineer: w.assignedToName || w.engineer || '—',
        cost: (w.laborCost ?? 0) + (w.materialCost ?? 0) + (w.otherCost ?? 0),
        status: w.status,
        date: w.date,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [workOrders, startDate, endDate]);

  // Maliyet kırılımı
  const costBreakdown = useMemo(() => {
    const wos = workOrders.filter(
      (w) => (w.date || '').slice(0, 10) >= startDate && (w.date || '').slice(0, 10) <= endDate,
    );
    return {
      labor: wos.reduce((s, w) => s + (w.laborCost ?? 0), 0),
      material: wos.reduce((s, w) => s + (w.materialCost ?? 0), 0),
      other: wos.reduce((s, w) => s + (w.otherCost ?? 0), 0),
    };
  }, [workOrders, startDate, endDate]);

  // Teklif kırılımı
  const quotesAgg = useMemo(() => {
    const inRange = quotes.filter((q) => {
      const d = ((q as any).date || (q as any).createdAt || '').slice(0, 10);
      return d >= startDate && d <= endDate;
    });
    const byEng = new Map<string, { name: string; count: number; amount: number }>();
    for (const q of inRange) {
      const name = (q as any).engineer || '—';
      const cur = byEng.get(name) ?? { name, count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += Number((q as any).grandTotal ?? 0);
      byEng.set(name, cur);
    }
    return {
      list: inRange,
      total: inRange.reduce((s, q) => s + Number((q as any).grandTotal ?? 0), 0),
      accepted: inRange.filter((q) => (q as any).status === 'Kabul Edildi').length,
      byEng: Array.from(byEng.values()).sort((a, b) => b.amount - a.amount).slice(0, 5),
    };
  }, [quotes, startDate, endDate]);

  // Aktivite akışı — audit log
  const activityRows = useMemo(() => {
    return audit
      .filter((a) => {
        const d = (a.created_at || '').slice(0, 10);
        return d >= startDate && d <= endDate;
      })
      .slice(0, 30)
      .map((a) => {
        const meta = ACTION_META[a.action] ?? { label: a.action, icon: 'ellipse-outline' as const, color: '#64748b' };
        const userName = a.user_id
          ? employeesById[a.user_id] || profilesById[a.user_id] || `Kullanıcı #${a.user_id.slice(0, 6)}`
          : 'Sistem';
        return { ...a, meta, userName };
      });
  }, [audit, startDate, endDate, employeesById, profilesById]);

  // Harcamalar (expenses tablosu)
  const expenseAgg = useMemo(() => {
    const inRange = expenses.filter((e) => e.date >= startDate && e.date <= endDate);
    const byCat = new Map<string, number>();
    let total = 0;
    for (const e of inRange) {
      total += e.amount;
      byCat.set(e.type, (byCat.get(e.type) ?? 0) + e.amount);
    }
    const cats = Array.from(byCat.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    return { list: inRange, total, cats, latest: inRange.slice(0, 8) };
  }, [expenses, startDate, endDate]);

  // PDF — kombine yönetici raporu
  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const periodLabel = PERIODS.find((p) => p.kind === period)?.label || period;
      const rev = TL(kpi.revenue);
      const cost = TL(kpi.cost);
      const profit = TL(kpi.profit);

      const statusRows = byStatus
        .map(
          (b) => `<tr><td>${esc(b.label)}</td><td class="right">${b.value}</td></tr>`,
        )
        .join('');
      const engRows = byEngineer
        .slice(0, 10)
        .map(
          (b) => `<tr><td>${esc(b.label)}</td><td class="right">${TL(b.value)}</td></tr>`,
        )
        .join('');
      const custRows = byCustomer
        .map(
          (b) => `<tr><td>${esc(b.label)}</td><td class="right">${TL(b.value)}</td></tr>`,
        )
        .join('');
      const shiftRows = shiftAgg.top
        .map(
          (e) => `<tr><td><strong>${esc(e.name)}</strong></td><td class="right">${e.count}</td><td class="right">${esc(fmtHours(e.minutes))}</td></tr>`,
        )
        .join('');
      const costRows = topCostWO
        .map(
          (w) => `<tr><td>${esc(w.client)}</td><td>${esc(w.engineer)}</td><td>${esc(w.status)}</td><td class="right">${TL(w.cost)}</td></tr>`,
        )
        .join('');
      const quoteEngRows = quotesAgg.byEng
        .map(
          (q) => `<tr><td><strong>${esc(q.name)}</strong></td><td class="right">${q.count}</td><td class="right">${TL(q.amount)}</td></tr>`,
        )
        .join('');
      const activityHtml = activityRows
        .slice(0, 50)
        .map((a) => `<tr><td class="small">${esc(fmtDateTime(a.created_at))}</td><td><strong>${esc(a.userName)}</strong> ${esc(a.meta?.label ?? '')}</td><td class="small">${esc(a.table_name || '')}${a.ref_id ? ' #' + esc(String(a.ref_id).slice(0, 8)) : ''}</td></tr>`)
        .join('');

      const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/>
<title>Yönetici Raporu ${esc(periodLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 26px 28px; font-size: 10px; }
  .header { border-bottom: 3px solid #1e40af; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  .title { font-size: 22px; font-weight: 900; color: #1e40af; letter-spacing: 0.5px; }
  .sub { font-size: 10px; color: #6b7280; margin-top: 4px; }
  .stats { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .stat { flex: 1; min-width: 130px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; background: #f9fafb; }
  .stat .l { font-size: 9px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .stat .v { font-size: 16px; font-weight: 900; color: #1e40af; margin-top: 2px; }
  .stat.green .v { color: #15803d; } .stat.red .v { color: #b91c1c; } .stat.orange .v { color: #b45309; }
  h2 { font-size: 13px; font-weight: 800; color: #1e40af; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #1e40af; color: #fff; padding: 7px 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; text-align: left; }
  td { padding: 6px 6px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: middle; }
  td.right { text-align: right; font-variant-numeric: tabular-nums; }
  td.small { font-size: 9px; color: #6b7280; }
  tr:nth-child(even) td { background: #fafbfc; }
  .footer { margin-top: 24px; font-size: 9px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  .empty { padding: 14px; text-align: center; color: #9ca3af; font-style: italic; }
  .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pgbrk { page-break-before: always; }
  ${PDF_BRAND_CSS}
  tbody tr { page-break-inside: avoid; }
</style></head><body>
  ${pdfBrandHeader('YÖNETİCİ RAPORU', `${periodLabel} · ${trDate(startDate)} → ${trDate(endDate)}`)}

  <div class="stats">
    <div class="stat green"><div class="l">Ciro</div><div class="v">${esc(rev)}</div></div>
    <div class="stat orange"><div class="l">Maliyet</div><div class="v">${esc(cost)}</div></div>
    <div class="stat ${kpi.profit >= 0 ? 'green' : 'red'}"><div class="l">Net Kâr</div><div class="v">${esc(profit)}</div></div>
    <div class="stat"><div class="l">Açık İş</div><div class="v">${kpi.workOrdersOpen}</div></div>
    <div class="stat"><div class="l">Tamamlanan</div><div class="v">${kpi.workOrdersCompleted}</div></div>
    <div class="stat ${kpi.slaBreaches > 0 ? 'red' : 'green'}"><div class="l">SLA İhlal</div><div class="v">${kpi.slaBreaches}</div></div>
  </div>

  <h2>Mesai Özeti</h2>
  <div class="stats">
    <div class="stat"><div class="l">Aktif Mesai</div><div class="v">${shiftAgg.active}</div></div>
    <div class="stat"><div class="l">Tamamlanan Vardiya</div><div class="v">${shiftAgg.completed}</div></div>
    <div class="stat"><div class="l">Toplam Çalışma</div><div class="v">${esc(fmtHours(shiftAgg.totalMin))}</div></div>
  </div>
  ${shiftRows ? `<table><thead><tr><th>Personel</th><th style="text-align:right">Vardiya</th><th style="text-align:right">Süre</th></tr></thead><tbody>${shiftRows}</tbody></table>` : '<div class="empty">Bu dönem için mesai kaydı yok.</div>'}

  <h2>Maliyet & Harcamalar</h2>
  <div class="stats">
    <div class="stat orange"><div class="l">İşçilik</div><div class="v">${esc(TL(costBreakdown.labor))}</div></div>
    <div class="stat orange"><div class="l">Malzeme</div><div class="v">${esc(TL(costBreakdown.material))}</div></div>
    <div class="stat orange"><div class="l">Diğer</div><div class="v">${esc(TL(costBreakdown.other))}</div></div>
  </div>
  <strong style="font-size:11px">En Pahalı 5 İş</strong>
  ${costRows ? `<table><thead><tr><th>Müşteri</th><th>Personel</th><th>Durum</th><th style="text-align:right">Maliyet</th></tr></thead><tbody>${costRows}</tbody></table>` : '<div class="empty">Veri yok.</div>'}

  <h2>İş Emirleri</h2>
  <div class="twocol">
    <div>
      <strong style="font-size:11px">Durum Dağılımı</strong>
      ${statusRows ? `<table><thead><tr><th>Durum</th><th style="text-align:right">Adet</th></tr></thead><tbody>${statusRows}</tbody></table>` : '<div class="empty">Veri yok.</div>'}
    </div>
    <div>
      <strong style="font-size:11px">Personel Performansı (Ciro)</strong>
      ${engRows ? `<table><thead><tr><th>Personel</th><th style="text-align:right">Ciro</th></tr></thead><tbody>${engRows}</tbody></table>` : '<div class="empty">Veri yok.</div>'}
    </div>
  </div>
  <strong style="font-size:11px">En Aktif Müşteriler</strong>
  ${custRows ? `<table><thead><tr><th>Müşteri</th><th style="text-align:right">Ciro</th></tr></thead><tbody>${custRows}</tbody></table>` : '<div class="empty">Veri yok.</div>'}

  <h2>Teklifler</h2>
  <div class="stats">
    <div class="stat"><div class="l">Oluşturulan</div><div class="v">${quotesAgg.list.length}</div></div>
    <div class="stat green"><div class="l">Kabul Edilen</div><div class="v">${quotesAgg.accepted}</div></div>
    <div class="stat"><div class="l">Toplam Tutar</div><div class="v">${esc(TL(quotesAgg.total))}</div></div>
  </div>
  ${quoteEngRows ? `<table><thead><tr><th>Personel</th><th style="text-align:right">Teklif</th><th style="text-align:right">Toplam</th></tr></thead><tbody>${quoteEngRows}</tbody></table>` : '<div class="empty">Bu dönem teklif yok.</div>'}

  <h2>Aktivite Akışı (Kim Ne Yaptı)</h2>
  ${activityHtml ? `<table><thead><tr><th>Zaman</th><th>İşlem</th><th>Kayıt</th></tr></thead><tbody>${activityHtml}</tbody></table>` : '<div class="empty">Bu dönem için aktivite kaydı yok.</div>'}

  <div class="footer">${esc(BRAND.company.legalName)} · Yönetici Komuta Merkezi · Bu rapor sistem tarafından üretilmiştir.</div>
</body></html>`;

      await deliverPdf(html, { fileName: `Yonetici-Raporu-${periodLabel}.pdf`, dialogTitle: `Yönetici Raporu ${periodLabel}` });
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'PDF oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  }, [period, kpi, byStatus, byEngineer, byCustomer, shiftAgg, costBreakdown, topCostWO, quotesAgg, activityRows, startDate, endDate]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="speedometer" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Yönetici Komuta Merkezi</Text>
            <Text style={s.heroSub}>
              {trDate(startDate)} → {trDate(endDate)} · Kim ne yaptı, nerede, ne harcadı
            </Text>
          </View>
        </View>

        {/* Period */}
        <View style={s.periodRow}>
          {PERIODS.map((p) => {
            const on = p.kind === period;
            return (
              <TouchableOpacity
                key={p.kind}
                onPress={() => setPeriod(p.kind)}
                style={[s.periodBtn, on && s.periodOn]}
                activeOpacity={0.85}
              >
                <Text style={[s.periodText, on && { color: '#062a14' }]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={exportPdf}
            disabled={exporting}
            style={[s.pdfBtn, exporting && { opacity: 0.5 }]}
            activeOpacity={0.85}
          >
            {exporting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="document-text-outline" size={14} color="#fff" />}
            <Text style={s.pdfBtnText}>PDF</Text>
          </TouchableOpacity>
        </View>

        {!online && (
          <View style={s.warn}>
            <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
            <Text style={s.warnText}>Bazı veriler (mesai, aktivite akışı) çevrimiçi modda yüklenir.</Text>
          </View>
        )}

        {/* KPI grid */}
        <View style={s.kpiGrid}>
          <KpiCard label="Ciro" value={TL(kpi.revenue)} color="#22c55e" icon="cash-outline" />
          <KpiCard label="Maliyet" value={TL(kpi.cost)} color="#f59e0b" icon="wallet-outline" />
          <KpiCard label="Net Kâr" value={TL(kpi.profit)} color={kpi.profit >= 0 ? '#10b981' : '#ef4444'} icon="trending-up-outline" />
          <KpiCard label="Açık İş" value={String(kpi.workOrdersOpen)} color="#0ea5e9" icon="briefcase-outline" />
          <KpiCard label="Aktif Mesai" value={String(shiftAgg.active)} color="#8b5cf6" icon="pulse" />
          <KpiCard label="SLA İhlal" value={String(kpi.slaBreaches)} color={kpi.slaBreaches > 0 ? '#ef4444' : '#64748b'} icon="time-outline" />
        </View>

        {/* Hızlı erişim */}
        <View style={s.quickRow}>
          <QuickBtn label="Canlı Mesai" icon="pulse" color="#22c55e" onPress={() => nav.navigate('AdminShiftDashboard')} />
          <QuickBtn label="Mesai Geçmişi" icon="time-outline" color="#0ea5e9" onPress={() => nav.navigate('ShiftHistory')} />
          <QuickBtn label="Puantaj" icon="calendar-outline" color="#8b5cf6" onPress={() => nav.navigate('AttendanceReport')} />
          <QuickBtn label="Audit Log" icon="shield-checkmark-outline" color="#ef4444" onPress={() => nav.navigate('AuditLog')} />
        </View>

        {/* Aktif Mesai */}
        <Section title={`Şu An Mesaide (${activeShifts.length})`} icon="pulse" color="#22c55e">
          {activeShifts.length === 0 ? (
            <Text style={s.emptyText}>Şu an aktif mesai yok.</Text>
          ) : (
            activeShifts.slice(0, 8).map((sh) => {
              const name = employeesById[sh.employeeId || ''] || employeesById[sh.userId] || profilesById[sh.userId] || `Personel #${sh.userId.slice(0, 6)}`;
              const elapsed = Math.max(0, (Date.now() - new Date(sh.startAt).getTime()) / 60000);
              return (
                <View key={sh.id} style={s.row}>
                  <View style={[s.dot, { backgroundColor: '#22c55e' }]} />
                  <Text style={s.rowName} numberOfLines={1}>{name}</Text>
                  <Text style={s.rowMeta}>Başlangıç: {fmtTime(sh.startAt)}</Text>
                  <Text style={[s.rowValue, { color: '#22c55e' }]}>{fmtHours(elapsed)}</Text>
                </View>
              );
            })
          )}
        </Section>

        {/* Mesai Top 5 */}
        <Section title="Dönem Mesai Top 5" icon="ribbon-outline" color="#0ea5e9">
          <Text style={s.summaryText}>
            Toplam {shiftAgg.completed} vardiya · {fmtHours(shiftAgg.totalMin)} çalışma
          </Text>
          {shiftAgg.top.length === 0 ? (
            <Text style={s.emptyText}>Bu dönem tamamlanmış mesai yok.</Text>
          ) : (
            shiftAgg.top.map((e, i) => (
              <View key={e.name + i} style={s.row}>
                <Text style={s.rank}>#{i + 1}</Text>
                <Text style={s.rowName} numberOfLines={1}>{e.name}</Text>
                <Text style={s.rowMeta}>{e.count} vardiya</Text>
                <Text style={[s.rowValue, { color: '#0ea5e9' }]}>{fmtHours(e.minutes)}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Maliyet kırılımı */}
        <Section title="Maliyet & Harcamalar" icon="wallet-outline" color="#f59e0b">
          <View style={s.costRow}>
            <CostBar label="İşçilik" value={costBreakdown.labor} total={kpi.cost} color="#f59e0b" />
            <CostBar label="Malzeme" value={costBreakdown.material} total={kpi.cost} color="#ec4899" />
            <CostBar label="Diğer" value={costBreakdown.other} total={kpi.cost} color="#06b6d4" />
          </View>
          <Text style={[s.summaryText, { marginTop: spacing.sm }]}>En Pahalı 5 İş</Text>
          {topCostWO.length === 0 ? (
            <Text style={s.emptyText}>Veri yok.</Text>
          ) : (
            topCostWO.map((w) => (
              <View key={w.id} style={s.row}>
                <Text style={s.rowName} numberOfLines={1}>{w.client}</Text>
                <Text style={s.rowMeta} numberOfLines={1}>{w.engineer}</Text>
                <Text style={[s.rowValue, { color: '#f59e0b' }]}>{TL(w.cost)}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Harcama Defteri — expenses tablosu */}
        <Section title="Harcama Defteri" icon="receipt-outline" color="#f97316">
          <Text style={s.summaryText}>
            {expenseAgg.list.length} kayıt · Toplam <Text style={{ fontWeight: '700', color: '#f97316' }}>{TL(expenseAgg.total)}</Text>
          </Text>
          {expenseAgg.cats.length > 0 && (
            <View style={[s.costRow, { marginTop: spacing.sm }]}>
              {expenseAgg.cats.slice(0, 3).map((c) => (
                <CostBar key={c.label} label={c.label} value={c.value} total={expenseAgg.total} color="#f97316" />
              ))}
            </View>
          )}
          {expenseAgg.latest.length === 0 ? (
            <Text style={s.emptyText}>Bu dönem harcama yok.</Text>
          ) : (
            expenseAgg.latest.map((e) => (
              <View key={e.id} style={s.row}>
                <View style={[s.dot, { backgroundColor: '#f97316' }]} />
                <Text style={s.rowName} numberOfLines={1}>{e.type}</Text>
                <Text style={s.rowMeta} numberOfLines={1}>{e.date} · {e.description || '—'}</Text>
                <Text style={[s.rowValue, { color: '#f97316' }]}>{TL(e.amount)}</Text>
              </View>
            ))
          )}
        </Section>

        {/* İş emirleri */}
        <Section title="İş Emirleri — Durum Dağılımı" icon="briefcase-outline" color="#0ea5e9">
          {byStatus.length === 0 ? (
            <Text style={s.emptyText}>Veri yok.</Text>
          ) : (
            byStatus.map((b) => (
              <View key={b.label} style={s.row}>
                <View style={[s.dot, { backgroundColor: statusColor(b.label) }]} />
                <Text style={s.rowName}>{b.label}</Text>
                <Text style={[s.rowValue, { color: statusColor(b.label) }]}>{b.value}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Personel performans */}
        <Section title="Personel Performansı (Ciro)" icon="people-outline" color="#8b5cf6">
          {byEngineer.length === 0 ? (
            <Text style={s.emptyText}>Veri yok.</Text>
          ) : (
            byEngineer.slice(0, 8).map((b, i) => (
              <View key={b.label + i} style={s.row}>
                <Text style={s.rank}>#{i + 1}</Text>
                <Text style={s.rowName} numberOfLines={1}>{b.label}</Text>
                <Text style={[s.rowValue, { color: '#8b5cf6' }]}>{TL(b.value)}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Teklifler */}
        <Section title="Teklif Aktivitesi" icon="document-text-outline" color="#f59e0b">
          <Text style={s.summaryText}>
            {quotesAgg.list.length} teklif · {quotesAgg.accepted} kabul · {TL(quotesAgg.total)}
          </Text>
          {quotesAgg.byEng.length === 0 ? (
            <Text style={s.emptyText}>Bu dönem teklif yok.</Text>
          ) : (
            quotesAgg.byEng.map((q, i) => (
              <View key={q.name + i} style={s.row}>
                <Text style={s.rank}>#{i + 1}</Text>
                <Text style={s.rowName}>{q.name}</Text>
                <Text style={s.rowMeta}>{q.count} adet</Text>
                <Text style={[s.rowValue, { color: '#f59e0b' }]}>{TL(q.amount)}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Müşteri */}
        <Section title="En Aktif Müşteriler" icon="business-outline" color="#ec4899">
          {byCustomer.length === 0 ? (
            <Text style={s.emptyText}>Veri yok.</Text>
          ) : (
            byCustomer.slice(0, 8).map((b, i) => (
              <View key={b.label + i} style={s.row}>
                <Text style={s.rank}>#{i + 1}</Text>
                <Text style={s.rowName} numberOfLines={1}>{b.label}</Text>
                <Text style={[s.rowValue, { color: '#ec4899' }]}>{TL(b.value)}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Aktivite akışı */}
        <Section title={`Aktivite Akışı (${activityRows.length})`} icon="newspaper-outline" color="#06b6d4">
          {activityRows.length === 0 ? (
            <Text style={s.emptyText}>
              {online ? 'Bu dönem için aktivite kaydı yok.' : 'Çevrimiçi modda aktivite akışı görüntülenir.'}
            </Text>
          ) : (
            activityRows.slice(0, 15).map((a) => (
              <View key={a.id} style={s.activityRow}>
                <View style={[s.activityIcon, { backgroundColor: a.meta.color + '22', borderColor: a.meta.color }]}>
                  <Ionicons name={a.meta.icon as any} size={14} color={a.meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.activityText} numberOfLines={2}>
                    <Text style={{ fontWeight: '700', color: colors.text.primary }}>{a.userName}</Text>{' '}
                    <Text style={{ color: colors.text.muted }}>{a.meta.label}</Text>
                    {a.table_name ? <Text style={{ color: colors.text.faint }}> · {a.table_name}</Text> : null}
                    {a.ref_id ? <Text style={{ color: colors.text.faint }}> #{String(a.ref_id).slice(0, 8)}</Text> : null}
                  </Text>
                  <Text style={s.activityTime}>{fmtDateTime(a.created_at)}</Text>
                </View>
              </View>
            ))
          )}
          {activityRows.length > 15 && (
            <TouchableOpacity onPress={() => nav.navigate('AuditLog')} style={s.moreBtn}>
              <Text style={s.moreBtnText}>Tümünü Gör ({activityRows.length})</Text>
              <Ionicons name="chevron-forward" size={14} color={brand.blue} />
            </TouchableOpacity>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case 'Tamamlandı':
      return '#22c55e';
    case 'İptal':
      return '#ef4444';
    case 'Devam Ediyor':
    case 'Başladı':
      return '#0ea5e9';
    case 'Planlandı':
    case 'Atandı':
      return '#8b5cf6';
    case 'Beklemede':
    case 'Bekliyor':
      return '#f59e0b';
    default:
      return '#64748b';
  }
}

function KpiCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <View style={[s.kpi, { borderLeftColor: color }]}>
      <View style={s.kpiTop}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={s.kpiLabel}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>{value}</Text>
    </View>
  );
}

function QuickBtn({ label, icon, color, onPress }: { label: string; icon: any; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.quickBtn} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.quickIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={s.quickLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: any;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <View style={[s.sectionIcon, { backgroundColor: color + '22', borderColor: color }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  );
}

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <View style={s.costBar}>
      <View style={s.costBarHead}>
        <Text style={s.costBarLabel}>{label}</Text>
        <Text style={[s.costBarValue, { color }]}>{TL(value)}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    backgroundColor: '#1e40af',
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  periodOn: { backgroundColor: brand.green, borderColor: brand.green },
  periodText: { color: colors.text.muted, fontSize: 12, fontWeight: '700' },
  pdfBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  warnText: { color: '#92400e', fontSize: 11, flex: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  kpi: {
    width: '48.5%',
    padding: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    borderLeftWidth: 4,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  kpiValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: 3 },
  quickRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: spacing.xs },
  quickBtn: {
    flex: 1,
    minWidth: '23%',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 4,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: colors.text.primary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  section: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  sectionIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rank: { color: colors.text.muted, fontSize: 11, fontWeight: '800', width: 22 },
  rowName: { color: colors.text.primary, fontSize: 12, fontWeight: '700', flex: 1 },
  rowMeta: { color: colors.text.muted, fontSize: 11 },
  rowValue: { fontWeight: '800', fontSize: 12, minWidth: 64, textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyText: { color: colors.text.muted, fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
  summaryText: { color: colors.text.secondary, fontSize: 11, marginBottom: 4 },
  costRow: { gap: 8 },
  costBar: { gap: 4 },
  costBarHead: { flexDirection: 'row', justifyContent: 'space-between' },
  costBarLabel: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  costBarValue: { fontSize: 12, fontWeight: '800' },
  barTrack: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  activityIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activityText: { fontSize: 12, lineHeight: 16 },
  activityTime: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: spacing.xs,
  },
  moreBtnText: { color: brand.blue, fontSize: 12, fontWeight: '700' },
});
