// crashReporter.ts — POZ-DEV-321 Lokal crash reporting + global handler
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { CrashReport, CrashSeverity } from '../types';

const KEY = 'crash_reports_v1';
const MAX_REPORTS = 200;

function uid(): string {
  return 'crash_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export async function listCrashes(): Promise<CrashReport[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr: CrashReport[] = JSON.parse(raw);
    return arr.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  } catch {
    return [];
  }
}

export async function recordCrash(input: {
  severity: CrashSeverity;
  message: string;
  stack?: string;
  screen?: string;
  userId?: string;
  appVersion?: string;
  handled?: boolean;
}): Promise<CrashReport> {
  const list = await listCrashes();
  const report: CrashReport = {
    id: uid(),
    occurredAt: new Date().toISOString(),
    severity: input.severity,
    message: input.message,
    stack: input.stack,
    screen: input.screen,
    userId: input.userId,
    appVersion: input.appVersion,
    platform: Platform.OS as 'ios' | 'android' | 'web',
    handled: input.handled ?? true,
  };
  const updated = [report, ...list].slice(0, MAX_REPORTS);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  return report;
}

export async function clearCrashes(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getCrash(id: string): Promise<CrashReport | undefined> {
  const list = await listCrashes();
  return list.find(c => c.id === id);
}

export const CRASH_SEVERITY_COLOR: Record<CrashSeverity, string> = {
  info: '#0ea5e9',
  warning: '#f59e0b',
  error: '#ef4444',
  fatal: '#7f1d1d',
};

export const CRASH_SEVERITY_LABEL: Record<CrashSeverity, string> = {
  info: 'Bilgi',
  warning: 'Uyarı',
  error: 'Hata',
  fatal: 'Kritik',
};

// Global JS error handler — install once at app start.
let _installed = false;
export function installGlobalErrorHandler() {
  if (_installed) return;
  _installed = true;
  const g: any = (global as any).ErrorUtils;
  if (g && typeof g.setGlobalHandler === 'function') {
    const prev = g.getGlobalHandler?.();
    g.setGlobalHandler((err: Error, isFatal?: boolean) => {
      recordCrash({
        severity: isFatal ? 'fatal' : 'error',
        message: err?.message || 'Unknown error',
        stack: err?.stack,
        handled: !isFatal,
      }).catch(() => {});
      if (prev) prev(err, isFatal);
    });
  }
}
