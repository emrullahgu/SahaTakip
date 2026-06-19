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

import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APOLLO_BASE = 'https://api.apollo.io/api/v1';

// Basit in-memory rate-limit (kullanıcı başına, sabit pencere). NOT: Edge isolate'leri
// yatay ölçeklenir ve soğur → bu sayaç instance-local ve uçucudur; kesin kota değil,
// burst/suistimal sönümleyicidir. Kesin kota gerekirse Postgres tabanlı sayaç gerekir.
const RL_WINDOW_MS = 60_000;   // 1 dk
const RL_MAX = 20;             // kullanıcı başına / dk
const rlHits = new Map<string, { count: number; reset: number }>();

function rateLimit(userId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const e = rlHits.get(userId);
  if (!e || now >= e.reset) {
    rlHits.set(userId, { count: 1, reset: now + RL_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (e.count >= RL_MAX) {
    return { ok: false, retryAfter: Math.ceil((e.reset - now) / 1000) };
  }
  e.count++;
  return { ok: true, retryAfter: 0 };
}

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

  // GÜVENLİK: kimliksiz/anon çağrı reddedilir — aksi halde paralı Apollo API'sine
  // açık röle (maliyet suistimali). Diğer AI proxy'leriyle (ai-proxy/ai-vision/ai-sql)
  // aynı in-function requireUser kalıbı; gateway verify_jwt'ye güvenilmez.
  const auth = await requireUser(req, { requireApproved: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  // RATE-LIMIT: kimliği doğrulanmış kullanıcı başına dk başına RL_MAX istek
  // (best-effort; requireUser anon çağrıyı zaten yukarıda reddetti → userId mevcut).
  const rl = rateLimit(auth.userId ?? 'unknown');
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Çok fazla istek — lütfen biraz bekleyin.' }), {
      status: 429,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) },
    });
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
