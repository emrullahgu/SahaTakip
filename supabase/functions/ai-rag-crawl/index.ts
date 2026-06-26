// supabase/functions/ai-rag-crawl/index.ts
// Web sitesi içeriğini RAG'a "öğretir": verilen URL(ler)i (veya sitemap.xml'i) Jina Reader
// ile markdown'a çevirip ai-rag/ingest'e is_public=true ile yazar. Public web botu YALNIZ
// bu (is_public) korpustan yanıt verir → müşteri PII'li iç korpus public bota sızmaz.
//
// Çağrı (yalnız admin/manager — personel tetikler):
//   POST { urls: string[] }                 → verilen sayfaları tara
//   POST { sitemap: "https://site/sitemap.xml", limit?: number }  → sitemap'teki URL'leri tara
//
// Idempotent: aynı url tekrar taranırsa eski website belgesi silinip yeniden indekslenir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPA_URL, SERVICE_KEY);

const MAX_URLS = 50;           // tek çağrıda taranacak azami sayfa (maliyet/DoS sınırı)
const MAX_CONTENT = 40_000;    // belge başına azami karakter (embedding maliyeti)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

/** Jina Reader ile bir URL'yi markdown'a çevir. Anahtar gerektirmez (rate-limited). */
async function fetchReadable(url: string): Promise<string | null> {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'x-respond-with': 'markdown', accept: 'text/plain' },
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) return null;
    const txt = await r.text();
    return txt ? txt.slice(0, MAX_CONTENT) : null;
  } catch {
    return null;
  }
}

/** sitemap.xml'den <loc> URL'lerini çıkar. */
async function urlsFromSitemap(sitemap: string, limit: number): Promise<string[]> {
  try {
    const r = await fetch(sitemap, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1].trim());
    return locs.slice(0, Math.min(limit, MAX_URLS));
  } catch {
    return [];
  }
}

async function ingestWebsite(url: string, markdown: string): Promise<boolean> {
  // Idempotent: aynı url'nin eski website belgesini sil (kaskat chunk'lar da gider).
  await supabase.from('ai_documents').delete().eq('source', 'website').eq('source_id', url);
  const title = `Web – ${url.replace(/^https?:\/\//, '').slice(0, 80)}`;
  const r = await fetch(`${SUPA_URL}/functions/v1/ai-rag`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({
      action: 'ingest',
      documents: [{
        title,
        source: 'website',
        source_id: url,
        content: markdown,
        is_public: true, // web sitesi içeriği kamuya açık → public bot görebilir
        meta: { website: true, url, fetched_at: new Date().toISOString() },
      }],
    }),
  });
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST gerekli' }, 405);

  // Yalnız personel web sitesi taraması tetikleyebilir (embedding maliyeti + SSRF yüzeyi).
  const auth = await requireUser(req, { roles: ['admin', 'manager'], requireApproved: true });
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }

  let urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
  if (body?.sitemap) {
    const limit = Math.max(1, Math.min(Number(body.limit) || MAX_URLS, MAX_URLS));
    urls = [...urls, ...await urlsFromSitemap(String(body.sitemap), limit)];
  }
  // Yalnız http(s), tekilleştir, sınırla.
  urls = [...new Set(urls.filter(u => /^https?:\/\//i.test(u)))].slice(0, MAX_URLS);
  if (!urls.length) return json({ error: 'Taranacak geçerli http(s) URL yok (urls[] veya sitemap verin).' }, 400);

  let ok = 0, failed = 0;
  const results: any[] = [];
  for (const url of urls) {
    const md = await fetchReadable(url);
    if (!md || md.trim().length < 40) { failed++; results.push({ url, ok: false, error: 'içerik alınamadı/çok kısa' }); continue; }
    const ing = await ingestWebsite(url, md);
    if (ing) { ok++; results.push({ url, ok: true, chars: md.length }); }
    else { failed++; results.push({ url, ok: false, error: 'ingest başarısız' }); }
  }

  return json({ crawled: urls.length, ok, failed, results });
});
