// ====================================================================
// recentPozes.ts — POZ-DEV-042
// Son kullanılan POZ kayıtlarını (id+name+price snapshot) saklar.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuoteLine } from '../types';

const KEY = '@SahaTakip:recent_pozes';
const MAX = 15;

export interface RecentPoz {
  pozId: string;
  pozName: string;
  unit: string;
  materialPrice: number;
  installPrice: number;
  dismantlePrice: number;
  lastUsed: string; // ISO
  count: number;
}

export async function listRecentPozes(): Promise<RecentPoz[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentPoz[];
    return parsed
      .sort((a, b) => (b.count - a.count) || (b.lastUsed.localeCompare(a.lastUsed)))
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export async function recordPozUsage(line: QuoteLine): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list: RecentPoz[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.pozId === line.pozId);
    const now = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        pozName: line.pozName,
        unit: line.unit,
        materialPrice: line.materialPrice,
        installPrice: line.installPrice,
        dismantlePrice: line.dismantlePrice,
        lastUsed: now,
        count: list[idx].count + 1,
      };
    } else {
      list.push({
        pozId: line.pozId,
        pozName: line.pozName,
        unit: line.unit,
        materialPrice: line.materialPrice,
        installPrice: line.installPrice,
        dismantlePrice: line.dismantlePrice,
        lastUsed: now,
        count: 1,
      });
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(-100)));
  } catch (e) {
    console.warn('[recentPozes]', e);
  }
}

export async function recordQuoteLines(lines: QuoteLine[]): Promise<void> {
  for (const l of lines) await recordPozUsage(l);
}
