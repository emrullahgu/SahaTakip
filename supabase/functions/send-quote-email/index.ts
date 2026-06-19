// ====================================================================
// Supabase Edge Function: send-quote-email — POZ-DEV-037
// --------------------------------------------------------------------
// Resend API (https://resend.com) üzerinden teklif e-postası gönderir.
// Çağrı: supabase.functions.invoke('send-quote-email', { body: { ... } })
//
// Body şeması:
//   {
//     to: string;            // alıcı e-posta
//     subject: string;
//     html: string;          // gövde HTML (mail içeriği)
//     quote?: any;           // opsiyonel teklif objesi (loglama)
//     pdfUri?: string;       // opsiyonel: ek PDF URL (Storage'tan)
//     replyTo?: string;
//   }
//
// Env (Edge Function secret'ları olarak set edilmelidir):
//   RESEND_API_KEY        — Resend API anahtarı (zorunlu)
//   RESEND_FROM           — From adresi, örn: "SahaTakip <noreply@sahatakip.app>"
//                           (Resend'de doğrulanmış domain olmalı)
//
// Dağıtım:
//   supabase functions deploy send-quote-email
//   supabase secrets set RESEND_API_KEY=re_xxxx RESEND_FROM="SahaTakip <noreply@sahatakip.app>"
// ====================================================================

import { requireUser } from '../_shared/auth.ts';

// @ts-ignore — Deno global, Supabase Edge runtime'da mevcut
declare const Deno: { env: { get(key: string): string | undefined } };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendQuoteEmailBody {
  to: string;
  subject: string;
  html: string;
  quote?: { id?: string; number?: string };
  pdfUri?: string;
  replyTo?: string;
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// @ts-ignore — Deno.serve global
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  // Kimlik: anonim çağrı reddedilir — önceden kimliksiz herkes herhangi bir adrese
  // (rakip/müşteri) sahte HTML e-posta atabiliyordu. Authenticated-only (rol-gate
  // değil) ki teklif gönderen tüm meşru roller çalışmaya devam etsin.
  const auth = await requireUser(req);
  if (!auth.ok) return json(auth.status, { error: auth.error });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM =
    Deno.env.get('RESEND_FROM') ?? 'SahaTakip <noreply@sahatakip.app>';

  if (!RESEND_API_KEY) {
    return json(500, { error: 'resend_api_key_missing' });
  }

  let body: SendQuoteEmailBody;
  try {
    body = (await req.json()) as SendQuoteEmailBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  if (!body.to || !body.subject || !body.html) {
    return json(400, { error: 'missing_fields', need: ['to', 'subject', 'html'] });
  }

  const attachments: Array<{ filename: string; path?: string }> = [];
  if (body.pdfUri && /^https?:\/\//i.test(body.pdfUri)) {
    // Müşteriye giden ek adı: client "KOBİNERJİ-KONU-NO.pdf" gönderir (fileName);
    // yoksa eski davranışa düş. Yol-geçersiz karakterleri temizle.
    const safe = String(body.fileName ?? `${body.quote?.number ?? 'teklif'}.pdf`)
      .replace(/[\/\\:*?"<>|\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    attachments.push({
      filename: /\.pdf$/i.test(safe) ? safe : `${safe}.pdf`,
      path: body.pdfUri,
    });
  }

  try {
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [body.to],
        subject: body.subject,
        html: body.html,
        reply_to: body.replyTo,
        attachments: attachments.length ? attachments : undefined,
      }),
    });

    const data = await resendResp.json().catch(() => ({}));
    if (!resendResp.ok) {
      return json(resendResp.status, { error: 'resend_failed', detail: data });
    }
    return json(200, {
      ok: true,
      provider: 'resend',
      id: (data as { id?: string }).id,
      quoteId: body.quote?.id ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(500, { error: 'send_failed', message });
  }
});
