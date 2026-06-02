// supabase/functions/ai-rag-worker/index.ts
// Otomatik RAG worker — ai_ingest_queue'daki bekleyen kayıtları çekip
// ai_documents'a indeksler (eski kaydı silip yeniden insert eder).
//
// Çağrı:
//   POST  body: { batch_size?: number }   (varsayılan 25)
//   GET                                   (cron-friendly)
//
// Cron: Supabase scheduled invoke / pg_cron / dış scheduler.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPA_URL, SERVICE_KEY);

function fmtCustomer(p: any): { title: string; content: string } {
  const name = p.name ?? p.title ?? p.id;
  const lines = [
    `Müşteri: ${name}`,
    p.tax_no ? `Vergi No: ${p.tax_no}` : null,
    p.phone ? `Telefon: ${p.phone}` : null,
    p.email ? `E-posta: ${p.email}` : null,
    p.address ? `Adres: ${p.address}` : null,
    p.city ? `Şehir: ${p.city}` : null,
    p.segment ? `Segment: ${p.segment}` : null,
    p.notes ? `Notlar: ${p.notes}` : null,
  ].filter(Boolean);
  return { title: `Müşteri – ${name}`, content: lines.join('\n') };
}

function fmtWorkOrder(p: any): { title: string; content: string } {
  const ref = p.code ?? p.id;
  const lines = [
    `İş Emri: ${ref}`,
    p.client ? `Müşteri: ${p.client}` : null,
    p.service_name ?? p.serviceName ? `Hizmet: ${p.service_name ?? p.serviceName}` : null,
    p.status ? `Durum: ${p.status}` : null,
    p.priority ? `Öncelik: ${p.priority}` : null,
    p.assigned_to ?? p.assignedTo ? `Atanan: ${p.assigned_to ?? p.assignedTo}` : null,
    p.scheduled_date ?? p.scheduledDate ? `Planlanan: ${p.scheduled_date ?? p.scheduledDate}` : null,
    p.completed_at ? `Tamamlandı: ${p.completed_at}` : null,
    p.description ? `Açıklama: ${p.description}` : null,
    p.notes ? `Notlar: ${p.notes}` : null,
    p.amount ? `Tutar: ${p.amount}` : null,
  ].filter(Boolean);
  return { title: `İş Emri – ${ref}`, content: lines.join('\n') };
}

function fmtSalesVisit(p: any): { title: string; content: string } {
  const ref = p.id;
  const lines = [
    `Satış Ziyareti: ${ref}`,
    p.customer ?? p.client ? `Müşteri: ${p.customer ?? p.client}` : null,
    p.visit_date ?? p.date ? `Tarih: ${p.visit_date ?? p.date}` : null,
    p.outcome ? `Sonuç: ${p.outcome}` : null,
    p.next_action ? `Sonraki Aksiyon: ${p.next_action}` : null,
    p.notes ? `Notlar: ${p.notes}` : null,
    p.products?.length ? `Ürünler: ${(p.products as any[]).map((x: any) => x.name ?? x).join(', ')}` : null,
  ].filter(Boolean);
  return { title: `Satış Ziyareti – ${ref}`, content: lines.join('\n') };
}

function formatPayload(entity_type: string, payload: any): { title: string; content: string } | null {
  switch (entity_type) {
    case 'customer':    return fmtCustomer(payload);
    case 'work_order':  return fmtWorkOrder(payload);
    case 'sales_visit': return fmtSalesVisit(payload);
    default: return null;
  }
}

async function processItem(item: any): Promise<{ ok: boolean; error?: string }> {
  const { id, entity_type, entity_id, op, payload } = item;

  // 1) Eski belge(ler)i sil — kaskat chunk'ları da götürür.
  const { error: delErr } = await supabase
    .from('ai_documents')
    .delete()
    .eq('source', entity_type)
    .eq('source_id', entity_id);
  if (delErr) return { ok: false, error: `delete: ${delErr.message}` };

  if (op === 'delete') return { ok: true };

  // 2) Yeniden indeksle — ai-rag/ingest çağır.
  const fmt = formatPayload(entity_type, payload);
  if (!fmt || !fmt.content?.trim()) return { ok: true }; // boş içerik → atla

  const r = await fetch(`${SUPA_URL}/functions/v1/ai-rag`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({
      action: 'ingest',
      documents: [{
        title: fmt.title,
        source: entity_type,
        source_id: entity_id,
        content: fmt.content,
        meta: { auto: true, queue_id: id },
      }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return { ok: false, error: `ingest ${r.status}: ${t.slice(0, 300)}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let batchSize = 25;
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (typeof body?.batch_size === 'number') batchSize = Math.max(1, Math.min(100, body.batch_size));
    } catch { /* ignore */ }
  }

  try {
    // Bekleyen kayıtları çek (en eski önce, attempts < 5).
    const { data: items, error } = await supabase
      .from('ai_ingest_queue')
      .select('*')
      .is('processed_at', null)
      .lt('attempts', 5)
      .order('enqueued_at', { ascending: true })
      .limit(batchSize);
    if (error) throw error;

    let ok = 0, failed = 0;
    const errors: any[] = [];

    for (const item of items ?? []) {
      const res = await processItem(item);
      if (res.ok) {
        await supabase
          .from('ai_ingest_queue')
          .update({ processed_at: new Date().toISOString(), last_error: null })
          .eq('id', item.id);
        ok++;
      } else {
        await supabase
          .from('ai_ingest_queue')
          .update({ attempts: (item.attempts ?? 0) + 1, last_error: res.error })
          .eq('id', item.id);
        failed++;
        errors.push({ id: item.id, error: res.error });
      }
    }

    return new Response(JSON.stringify({
      processed: items?.length ?? 0,
      ok,
      failed,
      errors,
    }), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
