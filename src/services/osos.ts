// POZ-DEV-246: OSOS okuma ve haftalık raporlama servisi
// POZ-DEV-250: Günlük takip + alarm + otomatik rapor dağıtımı
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OsosReading,
  WeeklyReport,
  OsosAlarm,
  OsosAlarmRule,
  OsosAlarmKind,
  OsosAlarmSeverity,
  OsosAutoReportConfig,
  OsosDailySummary,
} from '../types';
import { broadcast } from './channels';

const READ_KEY = 'osos_readings_v1';
const REPORT_KEY = 'weekly_reports_v1';
const ALARM_KEY = 'osos_alarms_v1';
const RULE_KEY = 'osos_alarm_rules_v1';
const AUTO_KEY = 'osos_auto_report_v1';
const DAILY_KEY = 'osos_daily_summary_v1';

export async function listReadings(): Promise<OsosReading[]> {
  const raw = await AsyncStorage.getItem(READ_KEY);
  const all = raw ? (JSON.parse(raw) as OsosReading[]) : [];
  return all.sort((a, b) => b.readingAt.localeCompare(a.readingAt));
}
export async function addReading(r: Omit<OsosReading, 'id' | 'createdAt'>): Promise<OsosReading> {
  const all = await listReadings();
  const created: OsosReading = {
    ...r,
    id: `osos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(READ_KEY, JSON.stringify(all));
  // POZ-DEV-250: yeni okuma geldiğinde alarmları otomatik değerlendir
  try { await evaluateReading(created, all); } catch { /* sessizce yut: UI akışı kesilmesin */ }
  return created;
}
export async function bulkImportReadings(rows: Omit<OsosReading, 'id' | 'createdAt'>[]): Promise<number> {
  const all = await listReadings();
  const ts = Date.now();
  const created = rows.map<OsosReading>((r, i) => ({
    ...r,
    id: `osos_${ts}_${i}_${Math.random().toString(36).slice(2, 4)}`,
    createdAt: new Date().toISOString(),
  }));
  const merged = [...created, ...all];
  await AsyncStorage.setItem(READ_KEY, JSON.stringify(merged));
  // POZ-DEV-250: toplu import sonrası yalnızca yeni eklenenleri değerlendir
  try {
    for (const c of created) await evaluateReading(c, merged);
  } catch { /* yut */ }
  return created.length;
}
export async function deleteReading(id: string): Promise<void> {
  const all = await listReadings();
  await AsyncStorage.setItem(READ_KEY, JSON.stringify(all.filter(x => x.id !== id)));
}

export async function listWeeklyReports(): Promise<WeeklyReport[]> {
  const raw = await AsyncStorage.getItem(REPORT_KEY);
  const all = raw ? (JSON.parse(raw) as WeeklyReport[]) : [];
  return all.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}
export async function getWeeklyReport(id: string): Promise<WeeklyReport | undefined> {
  return (await listWeeklyReports()).find(r => r.id === id);
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay() || 7; // Mon=1..Sun=7
  if (day !== 1) x.setDate(x.getDate() - (day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function generateWeeklyReport(weekStartIso: string, customerId?: string): Promise<WeeklyReport> {
  const start = new Date(weekStartIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const readings = await listReadings();
  const inRange = readings.filter(r => {
    if (customerId && r.customerId !== customerId) return false;
    const t = new Date(r.readingAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  const totalImport = inRange.reduce((s, r) => s + (r.activeImportKwh || 0), 0);
  const totalExport = inRange.reduce((s, r) => s + (r.activeExportKwh || 0), 0);
  const peakDemand = inRange.reduce((m, r) => Math.max(m, r.demandKw || 0), 0);
  const all = await listWeeklyReports();
  const created: WeeklyReport = {
    id: `wr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    customerId,
    totalImportKwh: Math.round(totalImport * 100) / 100,
    totalExportKwh: Math.round(totalExport * 100) / 100,
    peakDemandKw: Math.round(peakDemand * 100) / 100,
    createdAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(REPORT_KEY, JSON.stringify(all));
  return created;
}

export function currentWeekStart(): string {
  return startOfWeek(new Date()).toISOString();
}

// ────────────────────────────────────────────────────────────────────────────
// POZ-DEV-250 — Alarm motoru, günlük özet ve otomatik rapor dağıtımı
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_RULES: OsosAlarmRule[] = [
  { id: 'rule_default_no_reading', enabled: true, kind: 'no_reading',        windowHours: 24, severity: 'warning',  note: 'Son 24 saatte hiç okuma yok', createdAt: new Date(0).toISOString() },
  { id: 'rule_default_demand',     enabled: true, kind: 'demand_exceeded',   threshold: 100,  severity: 'critical', note: 'Demand > 100 kW',              createdAt: new Date(0).toISOString() },
  { id: 'rule_default_spike',      enabled: true, kind: 'consumption_spike', threshold: 50,   severity: 'warning',  note: 'Önceki okumaya göre >%50 artış', createdAt: new Date(0).toISOString() },
  { id: 'rule_default_drop',       enabled: true, kind: 'consumption_drop',  threshold: 50,   severity: 'info',     note: 'Önceki okumaya göre >%50 düşüş', createdAt: new Date(0).toISOString() },
  { id: 'rule_default_reverse',    enabled: false, kind: 'reverse_flow',     threshold: 0,    severity: 'info',     note: 'Beklenmedik enerji verişi',     createdAt: new Date(0).toISOString() },
];

export async function listAlarmRules(): Promise<OsosAlarmRule[]> {
  const raw = await AsyncStorage.getItem(RULE_KEY);
  if (!raw) {
    await AsyncStorage.setItem(RULE_KEY, JSON.stringify(DEFAULT_RULES));
    return [...DEFAULT_RULES];
  }
  try { return JSON.parse(raw) as OsosAlarmRule[]; } catch { return [...DEFAULT_RULES]; }
}
export async function saveAlarmRules(rules: OsosAlarmRule[]): Promise<void> {
  await AsyncStorage.setItem(RULE_KEY, JSON.stringify(rules));
}
export async function upsertAlarmRule(rule: Omit<OsosAlarmRule, 'id' | 'createdAt'> & { id?: string }): Promise<OsosAlarmRule> {
  const rules = await listAlarmRules();
  const now = new Date().toISOString();
  if (rule.id) {
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = { ...rules[idx], ...rule, id: rule.id, updatedAt: now } as OsosAlarmRule;
      await saveAlarmRules(rules);
      return rules[idx];
    }
  }
  const created: OsosAlarmRule = {
    ...rule,
    id: rule.id ?? `rule_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    createdAt: now,
  };
  rules.unshift(created);
  await saveAlarmRules(rules);
  return created;
}
export async function deleteAlarmRule(id: string): Promise<void> {
  const rules = await listAlarmRules();
  await saveAlarmRules(rules.filter(r => r.id !== id));
}

export async function listAlarms(opts?: { unacknowledgedOnly?: boolean; sinceIso?: string }): Promise<OsosAlarm[]> {
  const raw = await AsyncStorage.getItem(ALARM_KEY);
  let all = raw ? (JSON.parse(raw) as OsosAlarm[]) : [];
  if (opts?.unacknowledgedOnly) all = all.filter(a => !a.acknowledgedAt);
  if (opts?.sinceIso) all = all.filter(a => a.detectedAt >= opts.sinceIso!);
  return all.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}
async function saveAlarms(all: OsosAlarm[]): Promise<void> {
  await AsyncStorage.setItem(ALARM_KEY, JSON.stringify(all));
}
export async function acknowledgeAlarm(id: string, user?: string): Promise<void> {
  const all = await listAlarms();
  const idx = all.findIndex(a => a.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], acknowledgedAt: new Date().toISOString(), acknowledgedBy: user };
  await saveAlarms(all);
}
export async function acknowledgeAllAlarms(user?: string): Promise<number> {
  const all = await listAlarms();
  const now = new Date().toISOString();
  let n = 0;
  const next = all.map(a => {
    if (a.acknowledgedAt) return a;
    n += 1;
    return { ...a, acknowledgedAt: now, acknowledgedBy: user };
  });
  await saveAlarms(next);
  return n;
}

function alarmExists(all: OsosAlarm[], ruleId: string, meterNo: string, readingId?: string): boolean {
  if (readingId) return all.some(a => a.ruleId === ruleId && a.readingId === readingId);
  // tekrar üretmemek için aynı kural+sayaç için son 12 saatte alarm varsa atla
  const cutoff = Date.now() - 12 * 3600 * 1000;
  return all.some(a => a.ruleId === ruleId && a.meterNo === meterNo && new Date(a.detectedAt).getTime() >= cutoff);
}

function mkAlarm(rule: OsosAlarmRule, meterNo: string, message: string, extra: Partial<OsosAlarm>): OsosAlarm {
  return {
    id: `alm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ruleId: rule.id,
    meterNo,
    kind: rule.kind,
    severity: rule.severity,
    message,
    threshold: rule.threshold,
    detectedAt: new Date().toISOString(),
    ...extra,
  };
}

/** Yeni okuma için aktif kuralları değerlendirir; gerekiyorsa alarm yazar. */
export async function evaluateReading(reading: OsosReading, allReadings?: OsosReading[]): Promise<OsosAlarm[]> {
  const rules = (await listAlarmRules()).filter(r => r.enabled);
  if (!rules.length) return [];
  const readings = allReadings ?? await listReadings();
  const existing = await listAlarms();
  const produced: OsosAlarm[] = [];

  // Aynı sayacın KRONOLOJİK olarak bir önceki okuması (readingAt'i bu okumadan
  // küçük olanların en yenisi). Toplu import'ta tüm okumalar aynı anda eklendiği
  // için "en son okuma"yı almak yanlış referansa yol açar; bu yüzden zaman
  // filtresiyle gerçek öncülü seçiyoruz.
  const prev = readings
    .filter(r => r.meterNo === reading.meterNo && r.id !== reading.id && r.readingAt < reading.readingAt)
    .sort((a, b) => b.readingAt.localeCompare(a.readingAt))[0];

  for (const rule of rules) {
    if (rule.meterNo && rule.meterNo !== reading.meterNo) continue;
    if (alarmExists(existing, rule.id, reading.meterNo, reading.id)) continue;

    if (rule.kind === 'demand_exceeded') {
      const v = reading.demandKw ?? 0;
      if (rule.threshold != null && v > rule.threshold) {
        produced.push(mkAlarm(rule, reading.meterNo,
          `Demand ${v.toFixed(1)} kW eşik ${rule.threshold} kW aşıldı`,
          { value: v, readingId: reading.id, customerId: reading.customerId }));
      }
    } else if (rule.kind === 'reverse_flow') {
      if ((reading.activeExportKwh ?? 0) > (rule.threshold ?? 0)) {
        produced.push(mkAlarm(rule, reading.meterNo,
          `Beklenmedik veriş: ${reading.activeExportKwh.toFixed(2)} kWh`,
          { value: reading.activeExportKwh, readingId: reading.id, customerId: reading.customerId }));
      }
    } else if (rule.kind === 'consumption_spike' || rule.kind === 'consumption_drop') {
      if (prev && prev.activeImportKwh > 0 && rule.threshold != null) {
        const deltaPct = ((reading.activeImportKwh - prev.activeImportKwh) / prev.activeImportKwh) * 100;
        if (rule.kind === 'consumption_spike' && deltaPct > rule.threshold) {
          produced.push(mkAlarm(rule, reading.meterNo,
            `Tüketim sıçraması %${deltaPct.toFixed(0)} (eşik %${rule.threshold})`,
            { value: deltaPct, readingId: reading.id, customerId: reading.customerId }));
        }
        if (rule.kind === 'consumption_drop' && deltaPct < -Math.abs(rule.threshold)) {
          produced.push(mkAlarm(rule, reading.meterNo,
            `Tüketim düşüşü %${Math.abs(deltaPct).toFixed(0)} (eşik %${rule.threshold})`,
            { value: deltaPct, readingId: reading.id, customerId: reading.customerId }));
        }
      }
    }
    // no_reading / meter_offline buradan çalıştırılmaz — runDailyAutomation içinde tüm sayaçlar için taranır
  }

  if (produced.length) {
    await saveAlarms([...produced, ...existing]);
  }
  return produced;
}

/** Tüm sayaçlar için zaman temelli kuralları (no_reading) çalıştırır. */
async function evaluateTemporalRules(): Promise<OsosAlarm[]> {
  const rules = (await listAlarmRules()).filter(r => r.enabled && (r.kind === 'no_reading' || r.kind === 'meter_offline'));
  if (!rules.length) return [];
  const readings = await listReadings();
  const existing = await listAlarms();
  const produced: OsosAlarm[] = [];

  const byMeter = new Map<string, OsosReading[]>();
  for (const r of readings) {
    const arr = byMeter.get(r.meterNo) ?? [];
    arr.push(r);
    byMeter.set(r.meterNo, arr);
  }

  for (const rule of rules) {
    const windowMs = (rule.windowHours ?? 24) * 3600 * 1000;
    const cutoff = Date.now() - windowMs;
    const meters = rule.meterNo ? [rule.meterNo] : Array.from(byMeter.keys());
    for (const meter of meters) {
      const arr = byMeter.get(meter) ?? [];
      const last = arr.sort((a, b) => b.readingAt.localeCompare(a.readingAt))[0];
      const lastTs = last ? new Date(last.readingAt).getTime() : 0;
      if (lastTs >= cutoff) continue;
      if (alarmExists(existing, rule.id, meter)) continue;
      const hours = rule.windowHours ?? 24;
      produced.push(mkAlarm(rule, meter,
        last ? `Son ${hours} saatte okuma yok (son: ${new Date(last.readingAt).toLocaleString('tr-TR')})`
             : `Bu sayaçtan hiç okuma yok`,
        { customerId: last?.customerId }));
    }
  }

  if (produced.length) await saveAlarms([...produced, ...existing]);
  return produced;
}

// ───── Günlük özet ─────
function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export async function listDailySummaries(): Promise<OsosDailySummary[]> {
  const raw = await AsyncStorage.getItem(DAILY_KEY);
  const all = raw ? (JSON.parse(raw) as OsosDailySummary[]) : [];
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function generateDailySummary(dateIso?: string): Promise<OsosDailySummary> {
  const d = dateIso ? new Date(dateIso) : new Date();
  const key = dayKey(d);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);

  const readings = await listReadings();
  const today = readings.filter(r => {
    const t = new Date(r.readingAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  const totalImport = today.reduce((s, r) => s + (r.activeImportKwh || 0), 0);
  const totalExport = today.reduce((s, r) => s + (r.activeExportKwh || 0), 0);
  const peak = today.reduce((m, r) => Math.max(m, r.demandKw || 0), 0);
  const meters = new Set(today.map(r => r.meterNo));
  const alarms = await listAlarms({ sinceIso: start.toISOString() });
  const critical = alarms.filter(a => a.severity === 'critical').length;

  const summary: OsosDailySummary = {
    id: `day_${key}`,
    date: key,
    totalReadings: today.length,
    totalImportKwh: Math.round(totalImport * 100) / 100,
    totalExportKwh: Math.round(totalExport * 100) / 100,
    peakDemandKw: Math.round(peak * 100) / 100,
    alarmCount: alarms.length,
    criticalCount: critical,
    meterCount: meters.size,
    createdAt: new Date().toISOString(),
  };

  const all = await listDailySummaries();
  const idx = all.findIndex(s => s.id === summary.id);
  if (idx >= 0) all[idx] = summary; else all.unshift(summary);
  await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(all));
  return summary;
}

// ───── Otomatik rapor dağıtımı ─────
const DEFAULT_AUTO: OsosAutoReportConfig = {
  enabled: false,
  hourOfDay: 8,
  emails: [],
  whatsapps: [],
  gchatSpaces: ['default'],
  includeAlarms: true,
  includeDailySummary: true,
};

export async function getAutoReportConfig(): Promise<OsosAutoReportConfig> {
  const raw = await AsyncStorage.getItem(AUTO_KEY);
  if (!raw) return { ...DEFAULT_AUTO };
  try { return { ...DEFAULT_AUTO, ...JSON.parse(raw) } as OsosAutoReportConfig; }
  catch { return { ...DEFAULT_AUTO }; }
}
export async function saveAutoReportConfig(cfg: OsosAutoReportConfig): Promise<void> {
  await AsyncStorage.setItem(AUTO_KEY, JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }));
}

function fmt(n: number, unit: string): string {
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${unit}`;
}

export function buildDailyReportText(summary: OsosDailySummary, alarms: OsosAlarm[], includeAlarms: boolean): string {
  const lines: string[] = [];
  lines.push(`📊 OSOS Günlük Rapor — ${summary.date}`);
  lines.push(`• Aktif sayaç: ${summary.meterCount}`);
  lines.push(`• Okuma sayısı: ${summary.totalReadings}`);
  lines.push(`• Toplam çekiş: ${fmt(summary.totalImportKwh, 'kWh')}`);
  lines.push(`• Toplam veriş: ${fmt(summary.totalExportKwh, 'kWh')}`);
  lines.push(`• Tepe demand: ${fmt(summary.peakDemandKw, 'kW')}`);
  lines.push(`• Alarm: ${summary.alarmCount} (kritik: ${summary.criticalCount})`);
  if (includeAlarms && alarms.length) {
    lines.push('');
    lines.push('🚨 Açık alarmlar:');
    for (const a of alarms.slice(0, 10)) {
      const sev = a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟠' : '🔵';
      lines.push(`${sev} ${a.meterNo}: ${a.message}`);
    }
    if (alarms.length > 10) lines.push(`… ve ${alarms.length - 10} tane daha`);
  }
  return lines.join('\n');
}

export interface DailyRunResult {
  ranAt: string;
  summary: OsosDailySummary;
  newAlarms: number;
  openAlarms: number;
  delivered: { ok: boolean; details: any[] } | null;
  skippedReason?: string;
}

/** Bugünün otomasyonunu çalıştırır: temporal alarm tarama + günlük özet + (opsiyonel) dağıtım. */
export async function runDailyAutomation(opts?: { force?: boolean }): Promise<DailyRunResult> {
  const cfg = await getAutoReportConfig();
  const now = new Date();
  const today = dayKey(now);

  // Idempotency: aynı gün ikinci kez çalıştırılmasın (force hariç)
  if (!opts?.force && cfg.lastRunAt && dayKey(cfg.lastRunAt) === today) {
    const summary = (await listDailySummaries()).find(s => s.date === today)
      ?? await generateDailySummary();
    return {
      ranAt: cfg.lastRunAt,
      summary,
      newAlarms: 0,
      openAlarms: (await listAlarms({ unacknowledgedOnly: true })).length,
      delivered: null,
      skippedReason: 'Bugün zaten çalıştırıldı',
    };
  }

  const temporal = await evaluateTemporalRules();
  const summary = await generateDailySummary();
  const openAlarms = await listAlarms({ unacknowledgedOnly: true });

  let delivered: DailyRunResult['delivered'] = null;
  if (cfg.enabled && (cfg.emails.length || cfg.whatsapps.length || cfg.gchatSpaces.length)) {
    const text = buildDailyReportText(summary, openAlarms, cfg.includeAlarms);
    const subject = `OSOS Günlük Rapor — ${summary.date}`;
    try {
      delivered = await broadcast({
        text,
        whatsapp: cfg.whatsapps,
        emails: cfg.emails.map(to => ({ to, subject })),
        gchatSpaces: cfg.gchatSpaces,
      });
      // notifiedAt damgası
      if (delivered.ok) {
        const stamped = (await listAlarms()).map(a =>
          openAlarms.some(o => o.id === a.id) ? { ...a, notifiedAt: new Date().toISOString() } : a
        );
        await saveAlarms(stamped);
      }
    } catch (e: any) {
      delivered = { ok: false, details: [{ error: e?.message ?? String(e) }] };
    }
  }

  await saveAutoReportConfig({ ...cfg, lastRunAt: new Date().toISOString() });
  return {
    ranAt: new Date().toISOString(),
    summary,
    newAlarms: temporal.length,
    openAlarms: openAlarms.length,
    delivered,
  };
}

/** Uygulama açılış/odak hook'u: planlanan saat geldiyse ve bugün çalışmadıysa otomatik tetikler. */
export async function maybeRunAutoToday(): Promise<DailyRunResult | null> {
  const cfg = await getAutoReportConfig();
  if (!cfg.enabled) return null;
  const now = new Date();
  if (now.getHours() < (cfg.hourOfDay ?? 8)) return null;
  if (cfg.lastRunAt && dayKey(cfg.lastRunAt) === dayKey(now)) return null;
  return runDailyAutomation();
}

export type { OsosAlarm, OsosAlarmRule, OsosAlarmKind, OsosAlarmSeverity, OsosAutoReportConfig, OsosDailySummary };
