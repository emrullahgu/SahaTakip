// supabase/functions/apollo-proxy/index.ts
// Apollo.io API proxy — tarayıcıdan (RN-web) api.apollo.io'ya doğrudan istek
// CORS nedeniyle "Failed to fetch" verir. Bu fonksiyon isteği sunucu tarafında
// (CORS yok) iletir. Mobil uygulama Apollo'yu doğrudan çağırabilir; web bu
// proxy'yi kullanır.
//
// Body:
//   { "path": "/mixed_people/search", "method": "POST"|"GET", "body"?: {...}, "apiKey"?: "..." }
// API anahtarı: önce Deno.env APOLLO_API_KEY (sunucu sırrı), yoksa body.apiKey.
//
// Deploy:
//   supabase functions deploy apollo-proxy
//   (sunucu sırrı için: supabase secrets set APOLLO_API_KEY=...)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APOLLO_BASE = 'https://api.apollo.io/api/v1';

interface ReqBody {
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  apiKey?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Yalnız POST' }), { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  let parsed: ReqBody;
  try {
    parsed = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz JSON gövde' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const key = Deno.env.get('APOLLO_API_KEY') || parsed.apiKey;
  if (!key) {
    return new Response(JSON.stringify({ error: 'Apollo API anahtarı yok (APOLLO_API_KEY secret veya body.apiKey).' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
  if (!parsed.path || !parsed.path.startsWith('/')) {
    return new Response(JSON.stringify({ error: "Geçersiz 'path' (/ ile başlamalı)." }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const method = parsed.method === 'GET' ? 'GET' : 'POST';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const upstream = await fetch(`${APOLLO_BASE}${parsed.path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Api-Key': key },
      body: method === 'POST' && parsed.body !== undefined ? JSON.stringify(parsed.body) : undefined,
      signal: ctrl.signal,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Apollo proxy hatası: ${e instanceof Error ? e.message : String(e)}` }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
});
