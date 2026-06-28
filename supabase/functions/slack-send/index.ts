// supabase/functions/slack-send/index.ts
// Slack — Bot Token (chat.postMessage) ile bir kanala/DM'e mesaj gönderir.
// gchat-send'in birebir ikizi: requireUser gate + service-role client + channel_messages logu.
//
// Body:
//   { channel: "#kanal" | "C0123..." | "U0123...(DM)", text: string,
//     blocks?: any[], thread_ts?: string, related_type?: string, related_id?: string }
//
// Env:
//   SLACK_BOT_TOKEN   (xoxb-... — Slack App > OAuth & Permissions > Bot User OAuth Token)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: supabase functions deploy slack-send

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  // GÜVENLİK: şirket Slack çalışma alanına mesaj atar → kimliksiz/anon çağrı reddedilir.
  const auth = await requireUser(req, { roles: ['admin', 'manager', 'engineer'], requireApproved: true, allowServiceRole: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  // Fail-closed: bot token yoksa gönderim kapalı.
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ error: 'SLACK_BOT_TOKEN tanımsız (gönderim kapalı).' }), {
      status: 503, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const channel = String(body.channel ?? '').trim();
    if (!channel) throw new Error('channel zorunlu (#kanal, kanal ID veya DM için kullanıcı ID).');
    if (!body.text && !body.blocks) throw new Error('text veya blocks zorunlu.');

    const payload: Record<string, unknown> = { channel };
    if (body.text) payload.text = body.text;
    if (body.blocks) payload.blocks = body.blocks;
    if (body.thread_ts) payload.thread_ts = body.thread_ts;

    const r = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    // Slack HTTP 200 döner ama gerçek başarı gövdedeki { ok } alanındadır.
    const j = await r.json().catch(() => ({} as any));
    const ok = r.ok && j?.ok === true;

    await supabase.from('channel_messages').insert({
      channel: 'slack',
      direction: 'out',
      to_addr: channel,
      body: body.text ?? '(blocks)',
      status: ok ? 'sent' : 'failed',
      provider_id: ok ? (j?.ts ?? null) : null,
      error: ok ? null : (j?.error ?? `http ${r.status}`),
      related_type: body.related_type ?? null,
      related_id: body.related_id ?? null,
      meta: { channel: j?.channel ?? channel },
    });

    return new Response(JSON.stringify({ ok, ts: j?.ts ?? null, error: ok ? undefined : (j?.error ?? `http ${r.status}`) }), {
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
