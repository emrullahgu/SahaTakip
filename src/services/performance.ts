// performance.ts — POZ-DEV-323 Performans ölçümleme & sürüm/env bilgileri
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { PerformanceSample, ReleaseNote, EnvironmentInfo, BuildEnvironment } from '../types';

const PERF_KEY = 'performance_samples_v1';
const RELEASES_KEY = 'release_notes_v1';
const MAX_SAMPLES = 500;

function uid(): string {
  return 'perf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export async function listPerfSamples(): Promise<PerformanceSample[]> {
  try {
    const raw = await AsyncStorage.getItem(PERF_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function recordPerf(screen: string, durationMs: number, userId?: string): Promise<void> {
  const list = await listPerfSamples();
  const sample: PerformanceSample = {
    id: uid(),
    screen,
    durationMs,
    recordedAt: new Date().toISOString(),
    userId,
  };
  const updated = [sample, ...list].slice(0, MAX_SAMPLES);
  await AsyncStorage.setItem(PERF_KEY, JSON.stringify(updated));
}

export async function clearPerf(): Promise<void> {
  await AsyncStorage.removeItem(PERF_KEY);
}

export function summarizePerf(samples: PerformanceSample[]) {
  const byScreen: Record<string, { count: number; total: number; max: number; min: number }> = {};
  for (const s of samples) {
    if (!byScreen[s.screen]) byScreen[s.screen] = { count: 0, total: 0, max: 0, min: Infinity };
    const x = byScreen[s.screen];
    x.count++;
    x.total += s.durationMs;
    if (s.durationMs > x.max) x.max = s.durationMs;
    if (s.durationMs < x.min) x.min = s.durationMs;
  }
  return Object.entries(byScreen).map(([screen, v]) => ({
    screen,
    count: v.count,
    avg: Math.round(v.total / v.count),
    max: v.max,
    min: v.min === Infinity ? 0 : v.min,
  })).sort((a, b) => b.avg - a.avg);
}

// ── Release Notes ──────────────────────────────────────
export async function listReleaseNotes(): Promise<ReleaseNote[]> {
  try {
    const raw = await AsyncStorage.getItem(RELEASES_KEY);
    if (!raw) {
      // seed with bootstrap entries
      const seed: ReleaseNote[] = [
        {
          id: 'rel_1_0_0',
          version: '1.0.0',
          releasedAt: new Date().toISOString(),
          channel: 'stable',
          highlights: [
            'Çekirdek modüller: Müşteri, İş Emri, Teklif, Stok, Araç, Bordro',
            'Faz 33 tamam: Auth akışları, Görev işbirliği, Takvim, Profil, Analitik',
            'SahaTakip chatbot asistanı entegre',
          ],
          fixes: ['Müşteri formu hataları düzeltildi', 'Bordro detay listeleme stabilleştirildi'],
        },
      ];
      await AsyncStorage.setItem(RELEASES_KEY, JSON.stringify(seed));
      return seed;
    }
    const arr: ReleaseNote[] = JSON.parse(raw);
    return arr.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
  } catch {
    return [];
  }
}

export async function saveReleaseNote(note: ReleaseNote): Promise<void> {
  const list = await listReleaseNotes();
  const idx = list.findIndex(r => r.id === note.id);
  if (idx >= 0) list[idx] = note;
  else list.unshift(note);
  await AsyncStorage.setItem(RELEASES_KEY, JSON.stringify(list));
}

// ── Environment ────────────────────────────────────────
export function getEnvironmentInfo(): EnvironmentInfo {
  const envName = (process.env.EXPO_PUBLIC_ENV || 'development').toLowerCase() as BuildEnvironment;
  const env: BuildEnvironment = (['production', 'staging', 'development'] as BuildEnvironment[]).includes(envName)
    ? envName
    : 'development';
  return {
    env,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.sahatakip.local',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    buildNumber: process.env.EXPO_PUBLIC_BUILD_NUMBER || '1',
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  };
}

export function platformLabel(): string {
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';
  return 'Web';
}
