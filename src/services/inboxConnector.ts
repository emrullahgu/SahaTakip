// inboxConnector.ts — Supabase inbox_messages tablosunu Bilgi Tabanı'na (KB) çeker.
// Gmail/WhatsApp Edge Function webhook'ları bu tabloyu doldurur; uygulama buradan okur
// ve Saha Copilot'un "atladığım var mı?" taraması için KbDoc olarak kaydeder.

import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { upsertDoc, listDocs, type KbDoc } from './aiKnowledgeBase';

export interface InboxRow {
  id: string;
  source: 'gmail' | 'whatsapp' | 'sms' | 'telegram' | 'other';
  external_id: string | null;
  sender: string | null;
  subject: string | null;
  body: string | null;
  received_at: string;
  processed: boolean;
}

const KB_ID_PREFIX = 'inbox:';

function rowToKb(r: InboxRow): KbDoc {
  const id = `${KB_ID_PREFIX}${r.source}:${r.external_id || r.id}`;
  return {
    id,
    title: r.subject || `${r.source} — ${r.sender || 'bilinmeyen'}`,
    content: `Kaynak: ${r.source}\nKimden: ${r.sender || '-'}\nTarih: ${new Date(r.received_at).toLocaleString('tr-TR')}\n\n${r.body || '(içerik yok)'}`,
    tags: ['inbox', r.source],
    source: r.source === 'gmail' ? 'email' : r.source === 'whatsapp' ? 'whatsapp' : 'other',
    createdAt: r.received_at,
    updatedAt: r.received_at,
  };
}

export interface SyncResult {
  fetched: number;
  imported: number;
  skipped: number;
  error?: string;
}

export async function syncInboxFromCloud(opts?: { limit?: number; sinceDays?: number }): Promise<SyncResult> {
  if (!SUPABASE_CONFIGURED) {
    return { fetched: 0, imported: 0, skipped: 0, error: 'Supabase yapılandırılmamış' };
  }
  const limit = opts?.limit ?? 100;
  const sinceDays = opts?.sinceDays ?? 30;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('id, source, external_id, sender, subject, body, received_at, processed')
      .gte('received_at', since)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) return { fetched: 0, imported: 0, skipped: 0, error: error.message };

    const rows = (data || []) as InboxRow[];
    const existing = await listDocs();
    const existingIds = new Set(existing.map((d) => d.id));

    let imported = 0;
    let skipped = 0;
    for (const r of rows) {
      const doc = rowToKb(r);
      if (existingIds.has(doc.id)) {
        skipped++;
        continue;
      }
      await upsertDoc(doc);
      imported++;
    }

    return { fetched: rows.length, imported, skipped };
  } catch (e: any) {
    return { fetched: 0, imported: 0, skipped: 0, error: e?.message || String(e) };
  }
}

export async function markInboxProcessed(externalIds: string[]): Promise<void> {
  if (!SUPABASE_CONFIGURED || externalIds.length === 0) return;
  try {
    await supabase
      .from('inbox_messages')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .in('external_id', externalIds);
  } catch {
    // ignore
  }
}
