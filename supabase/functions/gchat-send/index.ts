// supabase/functions/gchat-send/index.ts
// Google Chat — Incoming Webhook üzerinden mesaj gönderir.
//
// Body:
//   { space: "default" | "<name>", text?: string, cardsV2?: any[], related_type?, related_id? }
//
// Env:
//   GCHAT_WEBHOOK_DEFAULT  (Google Chat 'space' > Webhooks > tam URL)
//   GCHAT_WEBHOOK_<NAME>   (opsiyonel ek webhooks; örn. GCHAT_WEBHOOK_OPERASYON)
//
// Deploy: supabase functions deploy gchat-send

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });
  try {
    const body = await req.json();
    const spaceKey = String(body.space ?? 'default').toUpperCase();
    const envKey = spaceKey === 'DEFAULT' ? 'GCHAT_WEBHOOK_DEFAULT' : `GCHAT_WEBHOOK_${spaceKey}`;
    const url = Deno.env.get(envKey);
    if (!url) throw new Error(`${envKey} tanımsız.`);

    const payload: any = {};
    if (body.text) payload.text = body.text;
    if (body.cardsV2) payload.cardsV2 = body.cardsV2;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    const ok = r.ok;

    await supabase.from('channel_messages').insert({
      channel: 'gchat',
      direction: 'out',
      to_addr: spaceKey,
      body: body.text ?? '(card)',
      status: ok ? 'sent' : 'failed',
      error: ok ? null : text,
      related_type: body.related_type ?? null,
      related_id: body.related_id ?? null,
      meta: { payload },
    });

    return new Response(JSON.stringify({ ok, status: r.status, body: text }), {
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
