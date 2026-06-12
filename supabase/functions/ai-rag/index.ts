// supabase/functions/ai-rag/index.ts
// NotebookLM-tarzı: belge ekle (embed) ve sorgula (similarity search + AI yanıt).
//
// Aksiyonlar:
//   POST { action: 'ingest', documents: [{ title, source?, source_id?, content, meta? }] }
//   POST { action: 'query',  question: string, top_k?: number, provider?: 'auto'|'openai'|'claude'|'gemini' }
//   POST { action: 'delete', document_id: string }
//   POST { action: 'list',   limit?: number }
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (embedding için zorunlu)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EMBED_MODEL = 'text-embedding-3-small'; // 1536d
const CHUNK_SIZE = 800;     // ~karakter
const CHUNK_OVERLAP = 120;

function chunkText(text: string): string[] {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= CHUNK_SIZE) return [t];
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    chunks.push(t.slice(i, i + CHUNK_SIZE));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY yok (embedding için zorunlu).');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`Embedding hata: ${res.status} ${await res.text()}`);
  const j: any = await res.json();
  return j.data.map((d: any) => d.embedding);
}

async function ingest(body: any) {
  const docs = body.documents as Array<{
    title: string; source?: string; source_id?: string; content: string; meta?: any;
  }>;
  if (!Array.isArray(docs) || !docs.length) throw new Error('documents boş.');

  const results = [];
  for (const d of docs) {
    const { data: doc, error: e1 } = await supabase
      .from('ai_documents')
      .insert({
        title: d.title,
        source: d.source ?? 'manual',
        source_id: d.source_id ?? null,
        content: d.content,
        meta: d.meta ?? {},
      })
      .select('id')
      .single();
    if (e1) throw e1;

    const pieces = chunkText(d.content);
    const embeddings = await embedBatch(pieces);
    const rows = pieces.map((c, i) => ({
      document_id: doc!.id,
      chunk_index: i,
      content: c,
      tokens: Math.ceil(c.length / 4),
      embedding: embeddings[i],
      meta: d.meta ?? {},
    }));
    const { error: e2 } = await supabase.from('ai_chunks').insert(rows);
    if (e2) throw e2;
    results.push({ id: doc!.id, chunks: rows.length });
  }
  return { ok: true, ingested: results };
}

async function query(body: any) {
  const question: string = body.question;
  if (!question) throw new Error('question boş.');
  const top_k = body.top_k ?? 6;
  const provider = body.provider ?? 'auto';

  // 1) Soru embed
  const [emb] = await embedBatch([question]);

  // 2) Benzerlik araması
  const { data: matches, error } = await supabase.rpc('match_ai_chunks', {
    query_embedding: emb,
    match_count: top_k,
  });
  if (error) throw error;

  // 3) Context oluştur
  const context = (matches ?? [])
    .map((m: any, i: number) => `[#${i + 1} — ${m.doc_title}]\n${m.content}`)
    .join('\n\n---\n\n');

  // 4) AI proxy ile yanıt
  const sys = `Sen SahaTakip'in NotebookLM-tarzı asistanısın. Sadece aşağıdaki BAĞLAM'a dayanarak Türkçe yanıt ver.
Bilmiyorsan "Kaynaklarda bulamadım" de. Cevabın sonunda kaynak numaralarını [#1], [#2] gibi köşeli parantezle göster.

BAĞLAM:
${context || '(boş — kaynak yok)'}`;

  const aiUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-proxy`;
  const aiRes = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      provider,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });
  const ai: any = await aiRes.json();
  if (!aiRes.ok) throw new Error(ai?.error ?? `ai-proxy ${aiRes.status}`);

  return {
    answer: ai.content,
    provider: ai.provider,
    model: ai.model,
    sources: (matches ?? []).map((m: any, i: number) => ({
      index: i + 1,
      document_id: m.document_id,
      title: m.doc_title,
      source: m.doc_source,
      similarity: m.similarity,
      excerpt: m.content.slice(0, 240),
    })),
  };
}

async function del(body: any) {
  const id = body.document_id;
  if (!id) throw new Error('document_id zorunlu.');
  const { error } = await supabase.from('ai_documents').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

async function list(body: any) {
  const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500);
  const { data, error } = await supabase
    .from('ai_documents')
    .select('id, title, source, source_id, created_at, meta')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // chunk sayıları
  const ids = (data ?? []).map(d => d.id);
  let counts: Record<string, number> = {};
  if (ids.length) {
    const { data: cdata } = await supabase
      .from('ai_chunks')
      .select('document_id')
      .in('document_id', ids);
    for (const r of cdata ?? []) counts[r.document_id] = (counts[r.document_id] ?? 0) + 1;
  }
  return {
    ok: true,
    documents: (data ?? []).map(d => ({ ...d, chunk_count: counts[d.id] ?? 0 })),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });
  const { logUsage, userIdFromAuth } = await import('../_shared/usageLog.ts');
  const t0 = Date.now();
  const userId = userIdFromAuth(req);
  let action = 'unknown';
  try {
    const body = await req.json();
    action = body.action ?? 'unknown';
    // ingest/delete DB'yi değiştirir (belge ekler/siler) → en az authenticated.
    // Önceden kimliksiz herhangi biri ai_documents/ai_chunks'a spam belge basabiliyordu.
    // query/list (yalnız-okuma) açık kalır. Rol-gate değil ki meşru akış kırılmasın.
    if (action === 'ingest' || action === 'delete') {
      const { requireUser } = await import('../_shared/auth.ts');
      const auth = await requireUser(req);
      if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...CORS, 'content-type': 'application/json' } });
    }
    let out: any;
    if (body.action === 'ingest') out = await ingest(body);
    else if (body.action === 'query') out = await query(body);
    else if (body.action === 'delete') out = await del(body);
    else if (body.action === 'list') out = await list(body);
    else throw new Error('action eksik (ingest|query|delete|list).');
    logUsage({
      function_name: 'ai-rag',
      model: out?.model ?? null,
      input_tokens: out?.usage?.input_tokens ?? 0,
      output_tokens: out?.usage?.output_tokens ?? 0,
      duration_ms: Date.now() - t0,
      status: 'ok',
      user_id: userId,
      meta: { action },
    });
    return new Response(JSON.stringify(out), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    logUsage({
      function_name: 'ai-rag',
      duration_ms: Date.now() - t0,
      status: 'error',
      error_message: String(e?.message ?? e).slice(0, 500),
      user_id: userId,
      meta: { action },
    });
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
