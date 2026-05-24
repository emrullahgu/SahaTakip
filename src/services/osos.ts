// POZ-DEV-246: OSOS okuma ve haftalık raporlama servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OsosReading, WeeklyReport } from '../types';

const READ_KEY = 'osos_readings_v1';
const REPORT_KEY = 'weekly_reports_v1';

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
  await AsyncStorage.setItem(READ_KEY, JSON.stringify([...created, ...all]));
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
