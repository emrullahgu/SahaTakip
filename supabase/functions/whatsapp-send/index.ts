// supabase/functions/whatsapp-send/index.ts
// WhatsApp Business Cloud API üzerinden mesaj gönderir.
//
// Body:
//   { to: "+905..." | "905...", message?: string, template?: { name, language?, components? }, related_type?, related_id? }
//
// Env:
//   WHATSAPP_PHONE_NUMBER_ID  (Meta'dan)
//   WHATSAPP_ACCESS_TOKEN     (Meta system user token)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (log için)

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

  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  if (!phoneId || !token) {
    return new Response(JSON.stringify({ error: 'WhatsApp env değişkenleri eksik.' }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const to = String(body.to || '').replace(/\D/g, '');
    if (!to) throw new Error('to (telefon) gerekli.');

    const payload: any = { messaging_product: 'whatsapp', to };
    if (body.template) {
      payload.type = 'template';
      payload.template = {
        name: body.template.name,
        language: { code: body.template.language ?? 'tr' },
        components: body.template.components ?? [],
      };
    } else {
      payload.type = 'text';
      payload.text = { body: body.message ?? '' };
    }

    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const json: any = await res.json();
    const ok = res.ok;

    await supabase.from('channel_messages').insert({
      channel: 'whatsapp',
      direction: 'out',
      to_addr: to,
      body: body.message ?? JSON.stringify(body.template ?? {}),
      status: ok ? 'sent' : 'failed',
      provider_id: json?.messages?.[0]?.id ?? null,
      error: ok ? null : JSON.stringify(json),
      related_type: body.related_type ?? null,
      related_id: body.related_id ?? null,
      meta: { request: payload },
    });

    return new Response(JSON.stringify({ ok, result: json }), {
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
