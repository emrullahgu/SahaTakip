// ====================================================================
// quoteRevisions.ts — POZ-DEV-038
// Teklif revizyon geçmişi (lokal AsyncStorage, ileride Supabase'e taşınır).
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Quote, QuoteRevision } from '../types';

const KEY = '@SahaTakip:quote_revisions';

async function loadAll(): Promise<QuoteRevision[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QuoteRevision[]) : [];
  } catch {
    return [];
  }
}

async function saveAll(list: QuoteRevision[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function listRevisions(quoteId: string): Promise<QuoteRevision[]> {
  const all = await loadAll();
  return all
    .filter(r => r.quoteId === quoteId)
    .sort((a, b) => b.revision - a.revision);
}

export async function recordRevision(
  quote: Quote,
  reason?: string,
): Promise<QuoteRevision> {
  const all = await loadAll();
  const existing = all.filter(r => r.quoteId === quote.id);
  const nextRev = existing.length > 0 ? Math.max(...existing.map(r => r.revision)) + 1 : 1;
  const rev: QuoteRevision = {
    id: `qr-${Date.now()}`,
    quoteId: quote.id,
    revision: nextRev,
    snapshot: { ...quote, revision: nextRev },
    createdAt: new Date().toISOString(),
    reason,
  };
  all.push(rev);
  await saveAll(all);
  return rev;
}

export async function clearRevisions(quoteId: string): Promise<void> {
  const all = await loadAll();
  await saveAll(all.filter(r => r.quoteId !== quoteId));
}
