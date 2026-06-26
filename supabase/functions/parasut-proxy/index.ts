// supabase/functions/parasut-proxy/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Paraşüt (Türk muhasebe SaaS) API v4 proxy — https://apidocs.parasut.com
//
// GÜVENLİK: client_id/client_secret/kullanıcı/şifre ASLA istemci bundle'ına
// girmez; YALNIZ bu edge fonksiyonunun ortam değişkenlerinde (Supabase secrets)
// yaşar. İstemci (src/services/parasut.ts) tüm platformlarda bu proxy üzerinden
// gider. Anon/kimliksiz çağrı reddedilir (requireUser).
//
// FATURA KESME (POST sales_invoices) ÇİFT KİLİTLİDİR ve VARSAYILAN KAPALIDIR:
//   1) Sunucu: PARASUT_INVOICING_ENABLED secret 'true' olmalı.
//   2) İstemci: Ayarlar > Paraşüt > "Fatura kesme aktif" toggle (parasut_settings).
// İkisi de açık olmadıkça create reddedilir → "sistem oturana kadar fatura yok".
//
// TASLAK TEKLİF (POST sales_offers) AYRI bir kilitle açılır (faturadan bağımsız):
//   PARASUT_OFFERS_ENABLED secret 'true' olmalı (fatura kilidi etkilenmez).
//   İş kuralı 2: yalnız taslak teklif kaydı; ASLA fatura. Offers açıkken bile invoicing kapalı.
//
// Body: { resource, op, id?, query?, payload? }
//   resource: 'sales_invoices' | 'sales_offers' | 'purchase_bills' | 'products' | 'contacts'
//   op:       'list' | 'show' | 'create'
//
// Deploy:  supabase functions deploy parasut-proxy
//   # taslak teklif yazmayı açmak için (fatura KAPALI kalır):
//   # supabase secrets set PARASUT_OFFERS_ENABLED=true
// Secrets (admin tek sefer kurar — repoya yazılmaz):
//   supabase secrets set PARASUT_CLIENT_ID=...
//   supabase secrets set PARASUT_CLIENT_SECRET=...
//   supabase secrets set PARASUT_USERNAME=...           (Paraşüt hesap e-postası)
//   supabase secrets set PARASUT_PASSWORD=...           (Paraşüt hesap şifresi)
//   supabase secrets set PARASUT_COMPANY_ID=...         (Paraşüt firma id)
//   # fatura kesmeyi açmak için (şimdilik KAPALI bırakın):
//   # supabase secrets set PARASUT_INVOICING_ENABLED=true
// ─────────────────────────────────────────────────────────────────────────────

import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OAUTH_URL = 'https://api.parasut.com/oauth/token';
const API_BASE = 'https://api.parasut.com/v4';

// Yalnız bu kaynaklara izin var (open-relay yüzeyini daralt).
const RESOURCES: Record<string, string> = {
  sales_invoices: 'sales_invoices',
  sales_offers: 'sales_offers',     // Paraşüt v4 teklif (estimate) kaynağı — TASLAK, fatura DEĞİL
  purchase_bills: 'purchase_bills',
  products: 'products',
  contacts: 'contacts',
};
// Yazma (POST) izinli kaynaklar. Her birinin AYRI kilidi var:
//   sales_invoices → PARASUT_INVOICING_ENABLED (fatura — ŞİMDİLİK KAPALI tutulur)
//   sales_offers   → PARASUT_OFFERS_ENABLED   (taslak teklif — faturadan bağımsız açılabilir)
const WRITABLE = new Set(['sales_invoices', 'sales_offers']);

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

function env(k: string): string {
  return Deno.env.get(k) ?? '';
}

// Modül-seviyesi token cache (Deno isolate yaşadıkça geçerli).
let _tok: { access: string; refresh: string; expMs: number } | null = null;

async function fetchToken(body: Record<string, string>): Promise<void> {
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body).toString(),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.access_token) {
    throw new Error(`Paraşüt OAuth ${res.status}: ${(j?.error_description || j?.error || '').toString().slice(0, 160)}`);
  }
  _tok = {
    access: j.access_token,
    refresh: j.refresh_token || _tok?.refresh || '',
    expMs: Date.now() + (Number(j.expires_in) || 7200) * 1000,
  };
}

async function getAccessToken(): Promise<string> {
  const clientId = env('PARASUT_CLIENT_ID');
  const clientSecret = env('PARASUT_CLIENT_SECRET');
  const username = env('PARASUT_USERNAME');
  const password = env('PARASUT_PASSWORD');
  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Paraşüt yapılandırılmadı (PARASUT_CLIENT_ID/SECRET/USERNAME/PASSWORD secret eksik).');
  }
  // Geçerli cache?
  if (_tok && Date.now() < _tok.expMs - 60_000) return _tok.access;
  // Refresh dene
  if (_tok?.refresh) {
    try {
      await fetchToken({ grant_type: 'refresh_token', client_id: clientId, client_secret: clientSecret, refresh_token: _tok.refresh });
      return _tok!.access;
    } catch {
      _tok = null; // refresh geçersiz → password'a düş
    }
  }
  // Password grant
  await fetchToken({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
  });
  return _tok!.access;
}

async function callParasut(method: string, endpoint: string, body?: unknown): Promise<Response> {
  const companyId = env('PARASUT_COMPANY_ID');
  if (!companyId) throw new Error('PARASUT_COMPANY_ID secret eksik.');
  let access = await getAccessToken();
  const url = `${API_BASE}/${companyId}/${endpoint}`;
  const doFetch = (tok: string) =>
    fetch(url, {
      method,
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  let res = await doFetch(access);
  if (res.status === 401) {
    // Token bayatlamış olabilir → cache temizle + tek retry
    _tok = null;
    access = await getAccessToken();
    res = await doFetch(access);
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Yalnız POST' }, 405);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: 'Geçersiz JSON' }, 400); }

  const resource = String(payload?.resource ?? '');
  const op = String(payload?.op ?? 'list');
  const endpointBase = RESOURCES[resource];
  if (!endpointBase) return json({ error: `Geçersiz resource: ${resource}` }, 400);

  const isWrite = op === 'create';

  // Kimlik: yazma admin/manager + çift kilit; okuma onaylı kullanıcı yeter.
  const auth = isWrite
    ? await requireUser(req, { roles: ['admin', 'manager'], requireApproved: true })
    : await requireUser(req, { requireApproved: true });
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  // YAZMA KİLİTLERİ (sunucu tarafı) — kaynağa ÖZGÜ, birbirinden bağımsız:
  if (isWrite) {
    if (!WRITABLE.has(resource)) return json({ error: `${resource} için yazma kapalı.` }, 403);
    // FATURA KESME ÇİFT KİLİDİ (ŞİMDİLİK KAPALI). İş kuralı 1: fatura yok.
    if (resource === 'sales_invoices' && env('PARASUT_INVOICING_ENABLED') !== 'true') {
      return json({ error: 'Fatura kesme KAPALI. Açmak için PARASUT_INVOICING_ENABLED=true secret gerekir (sistem oturana kadar kapalı tutuluyor).' }, 403);
    }
    // TASLAK TEKLİF kilidi (faturadan AYRI). İş kuralı 2: yalnız taslak offer, asla fatura.
    if (resource === 'sales_offers' && env('PARASUT_OFFERS_ENABLED') !== 'true') {
      return json({ error: 'Paraşüt taslak teklif yazma KAPALI. Açmak için PARASUT_OFFERS_ENABLED=true secret gerekir.' }, 403);
    }
  }

  try {
    let endpoint = endpointBase;
    let method = 'GET';
    let body: unknown;

    if (op === 'list') {
      const q = payload?.query && typeof payload.query === 'object'
        ? '?' + new URLSearchParams(payload.query as Record<string, string>).toString()
        : '';
      endpoint = endpointBase + q;
    } else if (op === 'show') {
      const id = String(payload?.id ?? '');
      if (!id) return json({ error: 'id gerekli (show)' }, 400);
      endpoint = `${endpointBase}/${encodeURIComponent(id)}`;
    } else if (op === 'create') {
      method = 'POST';
      body = payload?.payload ?? {};
    } else {
      return json({ error: `Geçersiz op: ${op}` }, 400);
    }

    const upstream = await callParasut(method, endpoint, body);
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...CORS, 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 502);
  }
});
