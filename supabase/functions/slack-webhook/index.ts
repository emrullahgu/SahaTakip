// supabase/functions/slack-webhook/index.ts
// Slack → SahaTakip AI Agent köprüsü + komut/@mention alıcısı.
// gchat-webhook'un Slack ikizi: gelen slash-command / @mention, mevcut `ai-tools`
// ajanına yönlendirilir (iş emri aç, teklif oluştur, sorgula...) ve cevap Slack'e döner.
//
// GÜVENLİK (denetim M7 kalıbı): Slack v0 imzası (X-Slack-Signature) HMAC-SHA256 ile
// ZORUNLU doğrulanır; SLACK_SIGNING_SECRET yoksa webhook KAPALIDIR (fail-closed).
// 5 dakikadan eski timestamp → replay reddi.
//
// SETUP (Slack CLI'a GEREK YOK — dashboard'dan manifest ile):
//   1. https://api.slack.com/apps → Create New App → From a manifest → bu fonksiyonun
//      yanındaki slack-app-manifest.json içeriğini yapıştır.
//   2. Install to Workspace → Bot User OAuth Token (xoxb-...) ve Signing Secret'i al.
//   3. supabase secrets set SLACK_BOT_TOKEN=xoxb-... SLACK_SIGNING_SECRET=...
//   4. supabase functions deploy slack-webhook --no-verify-jwt
//   5. Event Subscriptions / Slash Command request URL'i bu fonksiyon olduğundan
//      Slack url_verification challenge'ını otomatik geçer.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN
//      SLACK_AGENT_MAX_ITER (opsiyonel — default 5)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SIGNING_SECRET = Deno.env.get('SLACK_SIGNING_SECRET') ?? '';
const BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN') ?? '';
const MAX_ITER = Number(Deno.env.get('SLACK_AGENT_MAX_ITER') ?? '5');

// ─────────────────────────────────────────────────────────────
// İmza & yardımcılar
// ─────────────────────────────────────────────────────────────
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Slack v0 imzası: 'v0=' + HMAC_SHA256(secret, `v0:${ts}:${rawBody}`). Sabit-zamanlı. */
async function verifySlackSignature(rawBody: string, ts: string, sig: string, secret: string): Promise<boolean> {
  if (!ts || !sig.startsWith('v0=')) return false;
  // Replay koruması: 5 dakikadan eski istek reddedilir.
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`v0:${ts}:${rawBody}`));
  const hex = 'v0=' + Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, sig);
}

/** Supabase Edge background task (varsa) — yoksa beklemeden bırak. */
function runBackground(p: Promise<unknown>): void {
  const ER = (globalThis as any).EdgeRuntime;
  if (ER?.waitUntil) ER.waitUntil(p);
  else void p.catch(() => null);
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

async function logInbound(sender: string, text: string, channelId: string, eventId: string) {
  await supabase.from('channel_messages').insert({
    channel: 'slack', direction: 'in', from_addr: sender, to_addr: channelId,
    body: text, status: 'received', meta: { event_id: eventId },
  }).then(() => null, () => null);
  await supabase.from('inbox_messages').upsert([{
    source: 'slack', external_id: eventId, sender,
    subject: `Slack: ${sender}`, body: text, received_at: new Date().toISOString(),
    metadata: { channel: channelId },
  }], { onConflict: 'source,external_id' }).then(() => null, () => null);
}

async function logOutbound(channelId: string, text: string, ok: boolean, error?: string) {
  await supabase.from('channel_messages').insert({
    channel: 'slack', direction: 'out', to_addr: channelId,
    body: text, status: ok ? 'sent' : 'failed', error: error ?? null,
  }).then(() => null, () => null);
}

// ai-tools ajanını çağır (gchat-webhook ile aynı köprü).
async function runAgent(userText: string, ctx: { user: string; channel: string }): Promise<{ answer: string; actions: any[]; error?: string }> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-tools`;
  const intro = `[Kanal: Slack · Kullanıcı: ${ctx.user} · Kanal-ID: ${ctx.channel}]`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ messages: [{ role: 'system', content: intro }, { role: 'user', content: userText }], max_iterations: MAX_ITER }),
    });
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) return { answer: '', actions: [], error: j?.error ?? `ai-tools ${r.status}` };
    return { answer: String(j.answer ?? '').trim(), actions: Array.isArray(j.actions) ? j.actions : [] };
  } catch (e: any) {
    return { answer: '', actions: [], error: e?.message ?? String(e) };
  }
}

function summarizeActions(actions: any[]): string {
  if (!actions?.length) return '';
  const lines: string[] = [];
  for (const a of actions) {
    const r = a.result ?? {};
    if (r.error) { lines.push(`⚠️ ${a.tool}: ${r.error}`); continue; }
    switch (a.tool) {
      case 'create_work_order': if (r.work_order) lines.push(`✅ İş emri ${r.work_order.number} — ${r.work_order.title}`); break;
      case 'create_customer': if (r.customer) lines.push(`✅ Müşteri eklendi: ${r.customer.short_name}`); break;
      case 'create_sales_visit': if (r.visit) lines.push(`✅ Ziyaret kaydı: ${r.visit.purpose}`); break;
      case 'create_quote': if (r.quote) lines.push(`✅ Teklif ${r.quote.number} — ${r.quote.line_count} kalem · ${r.quote.grand_total?.toLocaleString?.('tr-TR')} ₺`); break;
      case 'send_notification': if (r.ok) lines.push(`✅ Bildirim gönderildi (${a.args?.channel})`); break;
      case 'query_data': if (r.row_count != null) lines.push(`📊 Sorgu: ${r.row_count} satır`); break;
    }
  }
  return lines.join('\n');
}

function buildReply(answer: string, actions: any[], error?: string): string {
  if (error) return `⚠️ Agent hata: ${error}`;
  const summary = summarizeActions(actions);
  return [answer || '✅ Tamamlandı.', summary].filter(Boolean).join('\n\n');
}

/** Slack response_url'e (slash-command) gecikmeli cevap POST eder. */
async function postToResponseUrl(responseUrl: string, text: string) {
  await fetch(responseUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ response_type: 'in_channel', text }),
  }).then(() => null, () => null);
}

/** chat.postMessage (event cevabı için bot token gerekir). */
async function postMessage(channel: string, text: string, thread_ts?: string): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN) return { ok: false, error: 'SLACK_BOT_TOKEN tanımsız' };
  const r = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', authorization: `Bearer ${BOT_TOKEN}` },
    body: JSON.stringify({ channel, text, ...(thread_ts ? { thread_ts } : {}) }),
  });
  const j = await r.json().catch(() => ({} as any));
  return { ok: r.ok && j?.ok === true, error: j?.error };
}

// "<@U123> komut" → "komut"
function stripMention(text: string): string {
  return text.replace(/<@[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'GET') return new Response('slack-webhook ok', { status: 200 });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Fail-closed: signing secret yoksa webhook kapalı.
  if (!SIGNING_SECRET) {
    console.warn('[slack-webhook] SLACK_SIGNING_SECRET tanımlı değil — reddedildi (fail-closed).');
    return new Response('webhook disabled: SLACK_SIGNING_SECRET not configured', { status: 503 });
  }

  const rawBody = await req.text();
  const ts = req.headers.get('x-slack-request-timestamp') ?? '';
  const sig = req.headers.get('x-slack-signature') ?? '';
  if (!(await verifySlackSignature(rawBody, ts, sig, SIGNING_SECRET))) {
    return new Response('forbidden', { status: 403 });
  }

  // Slack retry'lerini (yavaş/başarısız ack) yeniden işleme — çift gönderimi önle.
  if (req.headers.get('x-slack-retry-num')) return new Response('ok', { status: 200 });

  const ct = req.headers.get('content-type') ?? '';

  // ── 1) JSON gövde: url_verification + Events API (app_mention) ──
  if (ct.includes('application/json')) {
    let body: any;
    try { body = JSON.parse(rawBody); } catch { return new Response('bad request', { status: 400 }); }

    if (body.type === 'url_verification') {
      return json({ challenge: body.challenge });
    }

    if (body.type === 'event_callback') {
      const ev = body.event ?? {};
      // Bot'un kendi mesajlarını / bot mesajlarını yoksay (döngü önleme).
      if (ev.bot_id || ev.subtype === 'bot_message') return new Response('ok', { status: 200 });

      if (ev.type === 'app_mention' || ev.type === 'message') {
        const text = stripMention(String(ev.text ?? ''));
        const channel = String(ev.channel ?? '');
        const sender = String(ev.user ?? 'slack-user');
        const eventId = String(body.event_id ?? `${channel}:${ev.ts ?? Date.now()}`);
        if (text && channel) {
          // 200 hemen dön; ajan + cevap arka planda (Slack 3sn limiti).
          runBackground((async () => {
            await logInbound(sender, text, channel, eventId);
            const res = await runAgent(text, { user: sender, channel });
            const reply = buildReply(res.answer, res.actions, res.error);
            const sent = await postMessage(channel, reply, ev.thread_ts ?? ev.ts);
            await logOutbound(channel, reply, sent.ok, sent.error);
          })());
        }
      }
      return new Response('ok', { status: 200 });
    }

    return new Response('ok', { status: 200 });
  }

  // ── 2) Form gövde: Slash Command (/saha ...) ──
  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody);
    // Interactivity (buton) — şimdilik ack + log (ilk dilim: buton yok).
    if (params.get('payload')) {
      return json({ response_type: 'ephemeral', text: 'Alındı.' });
    }
    const command = params.get('command') ?? '';
    const text = (params.get('text') ?? '').trim();
    const responseUrl = params.get('response_url') ?? '';
    const channel = params.get('channel_id') ?? '';
    const userName = params.get('user_name') ?? 'slack-user';
    const eventId = `slash:${params.get('trigger_id') ?? Date.now()}`;

    if (!text) {
      return json({ response_type: 'ephemeral', text: `Komut boş. Örn: \`${command || '/saha'} yarın 10:00 Demir Yapı bakım iş emri aç\`` });
    }

    // Ajan işi 3sn'yi aşabilir → hemen ack, gerçek cevap response_url'e arka planda.
    runBackground((async () => {
      await logInbound(userName, text, channel, eventId);
      const res = await runAgent(text, { user: userName, channel });
      const reply = buildReply(res.answer, res.actions, res.error);
      if (responseUrl) await postToResponseUrl(responseUrl, reply);
      await logOutbound(channel, reply, !res.error, res.error);
    })());

    return json({ response_type: 'ephemeral', text: '⏳ İşliyorum…' });
  }

  return new Response('ok', { status: 200 });
});
