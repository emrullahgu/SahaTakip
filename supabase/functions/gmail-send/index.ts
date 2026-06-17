// supabase/functions/gmail-send/index.ts
// Gmail gönderim — 3 yöntem destekler (öncelik: SMTP → OAuth refresh → Service Account):
//
// Body:
//   { to: string, subject: string, html?: string, text?: string, cc?: string[], bcc?: string[], related_type?, related_id? }
//
// Env (yöntemlerden BİRİ yeterli):
//   --- Yöntem 0: Gmail SMTP + App Password (en kolay) ---
//   GMAIL_SMTP_USER       (ör. info@kobinerji.com)
//   GMAIL_SMTP_PASSWORD   (16 haneli app password)
//   --- Yöntem A: OAuth refresh token ---
//   GMAIL_OAUTH_CLIENT_ID
//   GMAIL_OAUTH_CLIENT_SECRET
//   GMAIL_OAUTH_REFRESH_TOKEN
//   GMAIL_FROM_ADDRESS
//   --- Yöntem B: Service Account + Workspace domain-wide delegation ---
//   GMAIL_SA_EMAIL
//   GMAIL_SA_PRIVATE_KEY
//   GMAIL_IMPERSONATE
//
// Deploy: supabase functions deploy gmail-send
// GÜVENLİK: Fonksiyon kendi içinde requireUser ile kimlik doğrular (admin/manager/engineer
// + onaylı VEYA internal service_role). Artık kimliksiz/anon çağrı mail atamaz.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create as jwtCreate, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ─── SMTP yolu ─────────────────────────────────────────────────────────────
async function sendSmtp(opts: {
  from: string; to: string; subject: string; html?: string; text?: string; cc?: string[]; bcc?: string[];
}): Promise<{ ok: boolean; id: string | null }> {
  const user = Deno.env.get('GMAIL_SMTP_USER')!;
  const pass = Deno.env.get('GMAIL_SMTP_PASSWORD')!.replace(/\s+/g, '');

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({
      from: opts.from,
      to: opts.to,
      cc: opts.cc,
      bcc: opts.bcc,
      subject: opts.subject,
      content: opts.text ?? (opts.html ? opts.html.replace(/<[^>]+>/g, '') : ''),
      html: opts.html,
    });
    return { ok: true, id: `smtp-${Date.now()}` };
  } finally {
    await client.close();
  }
}

// ─── OAuth/SA yolu (Gmail API) ─────────────────────────────────────────────
async function getAccessToken(): Promise<{ token: string; from: string }> {
  const rt = Deno.env.get('GMAIL_OAUTH_REFRESH_TOKEN');
  const cid = Deno.env.get('GMAIL_OAUTH_CLIENT_ID');
  const cs = Deno.env.get('GMAIL_OAUTH_CLIENT_SECRET');
  const fromA = Deno.env.get('GMAIL_FROM_ADDRESS');
  if (rt && cid && cs && fromA) {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cid, client_secret: cs, refresh_token: rt, grant_type: 'refresh_token',
      }),
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error(`Token (refresh) hatası: ${JSON.stringify(j)}`);
    return { token: j.access_token, from: fromA };
  }

  const saEmail = Deno.env.get('GMAIL_SA_EMAIL');
  const saKey = Deno.env.get('GMAIL_SA_PRIVATE_KEY');
  const sub = Deno.env.get('GMAIL_IMPERSONATE');
  if (saEmail && saKey && sub) {
    const pem = saKey.replace(/\\n/g, '\n').replace(/-----.*?-----/g, '').replace(/\s+/g, '');
    const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
    );
    const jwt = await jwtCreate(
      { alg: 'RS256', typ: 'JWT' },
      {
        iss: saEmail,
        sub,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        aud: 'https://oauth2.googleapis.com/token',
        iat: getNumericDate(0),
        exp: getNumericDate(3600),
      },
      key,
    );
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error(`Token (SA) hatası: ${JSON.stringify(j)}`);
    return { token: j.access_token, from: sub };
  }

  throw new Error('Gmail env yok (SMTP, refresh token veya service account).');
}

function buildRaw(opts: {
  from: string; to: string; subject: string; html?: string; text?: string; cc?: string[]; bcc?: string[];
}): string {
  const headers: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    opts.cc?.length ? `Cc: ${opts.cc.join(', ')}` : '',
    opts.bcc?.length ? `Bcc: ${opts.bcc.join(', ')}` : '',
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`,
    'MIME-Version: 1.0',
    opts.html ? 'Content-Type: text/html; charset="UTF-8"' : 'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
  ].filter(Boolean);
  const body = opts.html ?? opts.text ?? '';
  const bodyB64 = btoa(unescape(encodeURIComponent(body)));
  const mime = headers.join('\r\n') + '\r\n' + bodyB64;
  return btoa(unescape(encodeURIComponent(mime))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  // GÜVENLİK: şirket adına e-posta gönderir → kimliksiz/anon çağrı reddedilir.
  // Önceden HİÇ auth yoktu; anon key tutan herkes mail atabiliyordu (denetim).
  const auth = await requireUser(req, { roles: ['admin', 'manager', 'engineer'], requireApproved: true, allowServiceRole: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    if (!body.to || !body.subject) throw new Error('to ve subject zorunlu.');

    let ok = false;
    let providerId: string | null = null;
    let from = '';
    let errorJson: string | null = null;
    let method = '';

    const smtpUser = Deno.env.get('GMAIL_SMTP_USER');
    const smtpPass = Deno.env.get('GMAIL_SMTP_PASSWORD');
    if (smtpUser && smtpPass) {
      method = 'smtp';
      from = smtpUser;
      try {
        const r = await sendSmtp({ ...body, from });
        ok = r.ok;
        providerId = r.id;
      } catch (e: any) {
        errorJson = String(e?.message ?? e);
      }
    } else {
      method = 'gmail-api';
      const tok = await getAccessToken();
      from = tok.from;
      const raw = buildRaw({ ...body, from });
      const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tok.token}` },
        body: JSON.stringify({ raw }),
      });
      const j: any = await r.json();
      ok = r.ok;
      providerId = j?.id ?? null;
      if (!ok) errorJson = JSON.stringify(j);
    }

    await supabase.from('channel_messages').insert({
      channel: 'gmail',
      direction: 'out',
      to_addr: body.to,
      from_addr: from,
      subject: body.subject,
      body: body.html ?? body.text ?? '',
      status: ok ? 'sent' : 'failed',
      provider_id: providerId,
      error: errorJson,
      related_type: body.related_type ?? null,
      related_id: body.related_id ?? null,
      meta: { method },
    });

    return new Response(JSON.stringify({ ok, method, provider_id: providerId, error: errorJson }), {
      status: ok ? 200 : 502,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
