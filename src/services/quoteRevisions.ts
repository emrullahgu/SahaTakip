// ====================================================================
// quoteRevisions.ts — POZ-DEV-038
// Teklif revizyon geçmişi.
//   - Lokal AsyncStorage (her zaman) → offline destekli geçmiş.
//   - Online + Supabase yapılandırılmışsa `quote_revisions` tablosuna da yazar
//     ve listeleme öncesi uzak kayıtları çekip lokal cache ile birleştirir.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Quote, QuoteRevision } from '../types';
import { isOnlineMode } from './data/repository';
import { supabase } from './supabase';

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

function mergeRevisions(a: QuoteRevision[], b: QuoteRevision[]): QuoteRevision[] {
  const map = new Map<string, QuoteRevision>();
  for (const r of [...a, ...b]) {
    const key = `${r.quoteId}#${r.revision}`;
    // En yeni createdAt kazanır
    const existing = map.get(key);
    if (!existing || r.createdAt > existing.createdAt) map.set(key, r);
  }
  return Array.from(map.values());
}

async function fetchRemote(quoteId: string): Promise<QuoteRevision[]> {
  if (!isOnlineMode()) return [];
  try {
    const { data, error } = await supabase
      .from('quote_revisions')
      .select('id, quote_id, revision, snapshot, reason, created_at')
      .eq('quote_id', quoteId)
      .order('revision', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      quoteId: r.quote_id,
      revision: r.revision,
      snapshot: r.snapshot,
      reason: r.reason ?? undefined,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

async function pushRemote(rev: QuoteRevision): Promise<void> {
  if (!isOnlineMode()) return;
  try {
    // id alanı gönderilmez — Supabase tarafında uuid default üretir
    await supabase.from('quote_revisions').insert({
      quote_id: rev.quoteId,
      revision: rev.revision,
      snapshot: rev.snapshot,
      reason: rev.reason ?? null,
      created_at: rev.createdAt,
    });
  } catch (e) {
    console.warn('[quote_revisions.push]', e);
  }
}

export async function listRevisions(quoteId: string): Promise<QuoteRevision[]> {
  const local = await loadAll();
  const remote = await fetchRemote(quoteId);
  const merged = mergeRevisions(local, remote);
  // Uzakta yeni kayıt geldiyse lokali güncelle
  if (remote.length > 0) {
    const otherQuotes = local.filter(r => r.quoteId !== quoteId);
    await saveAll([...otherQuotes, ...merged.filter(r => r.quoteId === quoteId)]);
  }
  return merged
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
  // Online ise uzaktaki tabloya da yaz — başarısız olsa bile lokal güvende
  pushRemote(rev).catch(() => {});
  return rev;
}

export async function clearRevisions(quoteId: string): Promise<void> {
  const all = await loadAll();
  await saveAll(all.filter(r => r.quoteId !== quoteId));
  if (isOnlineMode()) {
    try {
      await supabase.from('quote_revisions').delete().eq('quote_id', quoteId);
    } catch (e) {
      console.warn('[quote_revisions.clear]', e);
    }
  }
}
