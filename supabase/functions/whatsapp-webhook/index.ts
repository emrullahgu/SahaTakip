// supabase/functions/whatsapp-webhook/index.ts
// WhatsApp Business Cloud API webhook.
//
// SETUP:
//   1. Meta Developer Console → WhatsApp Business → Configure webhook.
//   2. Webhook URL: <project>.supabase.co/functions/v1/whatsapp-webhook
//   3. Verify token = env WHATSAPP_VERIFY_TOKEN.
//   4. Subscribe to "messages" field.
//
// Deploy:  supabase functions deploy whatsapp-webhook --no-verify-jwt
// Env:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_VERIFY_TOKEN

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Güvenlik (denetim M7): sabit-gömülü varsayılan verify token KALDIRILDI; env
// tanımlı değilse handshake reddedilir. Mesaj POST'larında X-Hub-Signature-256
// (Meta HMAC) doğrulaması ZORUNLU — WHATSAPP_APP_SECRET ile.
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET') ?? '';

/** Meta X-Hub-Signature-256 (HMAC-SHA256) doğrulaması — sabit-zamanlı. */
async function verifyMetaSignature(rawBody: string, header: string, secret: string): Promise<boolean> {
  if (!header.startsWith('sha256=')) return false;
  const expected = header.slice('sha256='.length).trim();
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // GET → webhook verification handshake (verify token ZORUNLU env)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // ZORUNLU imza doğrulaması (fail-closed): APP_SECRET yoksa kapalı.
  if (!APP_SECRET) {
    console.warn('[whatsapp-webhook] WHATSAPP_APP_SECRET tanımlı değil — webhook reddedildi (fail-closed).');
    return new Response('webhook disabled: WHATSAPP_APP_SECRET not configured', { status: 503 });
  }
  const rawBody = await req.text();
  const sigHeader = req.headers.get('x-hub-signature-256') ?? '';
  if (!(await verifyMetaSignature(rawBody, sigHeader, APP_SECRET))) {
    return new Response('forbidden', { status: 403 });
  }

  try {
    const body = JSON.parse(rawBody);
    const rows: Array<Record<string, unknown>> = [];

    // Meta WhatsApp payload structure:
    // { entry: [{ changes: [{ value: { messages: [{ id, from, text:{body}, timestamp }] } }] }] }
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const contacts: Record<string, string> = {};
        for (const c of value.contacts ?? []) {
          contacts[c.wa_id] = c.profile?.name ?? c.wa_id;
        }
        for (const m of value.messages ?? []) {
          const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? '';
          rows.push({
            source: 'whatsapp',
            external_id: m.id,
            sender: contacts[m.from] ?? m.from,
            subject: `WhatsApp: ${contacts[m.from] ?? m.from}`,
            body: text,
            received_at: new Date(Number(m.timestamp) * 1000).toISOString(),
            metadata: { phone: m.from, type: m.type },
          });
        }
      }
    }

    if (rows.length > 0) {
      await supabase.from('inbox_messages').upsert(rows, { onConflict: 'source,external_id' });
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('whatsapp-webhook error', e);
    return new Response('error', { status: 500 });
  }
});
