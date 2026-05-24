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

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? 'saha-takip-verify';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // GET → webhook verification handshake
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = await req.json();
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
