// supabase/functions/gchat-webhook/index.ts
// Google Chat → SahaTakip AI Agent köprüsü.
//
// Google Chat'e bir Chat App (HTTP endpoint) tanımlandığında, kullanıcı bota
// (veya @mention ile) mesaj attığında bu endpoint çağrılır. Burada gelen
// mesaj `ai-tools` agent'ına yönlendirilir; agent gerekli tool'ları çağırır
// (iş emri açar, teklif oluşturur, vs.); sonuç tek satır özet olarak aynı
// thread'e cevap döner.
//
// SETUP:
//   1. Google Cloud Console → APIs → Google Chat API → Configuration
//   2. App type: HTTP endpoint
//   3. App URL: https://<project>.supabase.co/functions/v1/gchat-webhook
//   4. (Opsiyonel) Bearer token doğrulaması için GCHAT_BOT_TOKEN tanımla.
//   5. Add to space → bot @mention ile mesaj at.
//
// Deploy:  supabase functions deploy gchat-webhook --no-verify-jwt
// Env:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//          GCHAT_BOT_TOKEN              (opsiyonel — header doğrulaması)
//          GCHAT_AGENT_MAX_ITER         (opsiyonel — default 5)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SHARED_TOKEN = Deno.env.get('GCHAT_BOT_TOKEN') ?? '';
const MAX_ITER = Number(Deno.env.get('GCHAT_AGENT_MAX_ITER') ?? '5');

// ─────────────────────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────────────────────
function stripMention(text: string): string {
  // Google Chat: "@SahaTakip Bot teklif oluştur ..." → "teklif oluştur ..."
  return text
    .replace(/^@[\w\-_.]+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function gchatJson(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8' },
  });
}

function buildReply(text: string, thread?: { name?: string }): Record<string, unknown> {
  const payload: Record<string, unknown> = { text };
  // Aynı thread'e cevap ver (varsa)
  if (thread?.name) payload.thread = { name: thread.name };
  return payload;
}

async function logInbound(sender: string, text: string, spaceName: string, eventId?: string) {
  await supabase.from('channel_messages').insert({
    channel: 'gchat',
    direction: 'in',
    from_addr: sender,
    to_addr: spaceName,
    body: text,
    status: 'received',
    meta: { event_id: eventId },
  }).then(() => null, () => null);

  // Inbox tablosu varsa oraya da yaz (whatsapp-webhook ile aynı kalıp).
  await supabase.from('inbox_messages').upsert([{
    source: 'gchat',
    external_id: eventId ?? `${spaceName}:${Date.now()}`,
    sender,
    subject: `Google Chat: ${sender}`,
    body: text,
    received_at: new Date().toISOString(),
    metadata: { space: spaceName },
  }], { onConflict: 'source,external_id' }).then(() => null, () => null);
}

async function logOutbound(spaceName: string, text: string, ok: boolean, error?: string) {
  await supabase.from('channel_messages').insert({
    channel: 'gchat',
    direction: 'out',
    to_addr: spaceName,
    body: text,
    status: ok ? 'sent' : 'failed',
    error: error ?? null,
  }).then(() => null, () => null);
}

async function runAgent(userText: string, context: { user: string; space: string }): Promise<{
  answer: string;
  actions: any[];
  error?: string;
}> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-tools`;
  // Agent'a kim olduğunu söyle ki cevabı kişiselleştirsin.
  const intro = `[Kanal: Google Chat · Kullanıcı: ${context.user} · Space: ${context.space}]`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: intro },
          { role: 'user', content: userText },
        ],
        max_iterations: MAX_ITER,
      }),
    });
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) {
      return { answer: '', actions: [], error: j?.error ?? `ai-tools ${r.status}` };
    }
    return {
      answer: String(j.answer ?? '').trim(),
      actions: Array.isArray(j.actions) ? j.actions : [],
    };
  } catch (e: any) {
    return { answer: '', actions: [], error: e?.message ?? String(e) };
  }
}

function summarizeActions(actions: any[]): string {
  if (!actions?.length) return '';
  const lines: string[] = [];
  for (const a of actions) {
    const r = a.result ?? {};
    if (r.error) {
      lines.push(`⚠️ ${a.tool}: ${r.error}`);
      continue;
    }
    switch (a.tool) {
      case 'create_work_order':
        if (r.work_order)
          lines.push(`✅ İş emri ${r.work_order.number} — ${r.work_order.title}`);
        break;
      case 'create_customer':
        if (r.customer) lines.push(`✅ Müşteri eklendi: ${r.customer.short_name}`);
        break;
      case 'create_sales_visit':
        if (r.visit) lines.push(`✅ Ziyaret kaydı: ${r.visit.purpose}`);
        break;
      case 'create_quote':
        if (r.quote)
          lines.push(`✅ Teklif ${r.quote.number} — ${r.quote.line_count} kalem · ${r.quote.grand_total?.toLocaleString?.('tr-TR')} ₺`);
        break;
      case 'send_notification':
        if (r.ok) lines.push(`✅ Bildirim gönderildi (${a.args?.channel})`);
        break;
      case 'query_data':
        if (r.row_count != null) lines.push(`📊 Sorgu: ${r.row_count} satır`);
        break;
    }
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'GET') {
    // Sağlık kontrolü
    return new Response('gchat-webhook ok', { status: 200 });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Opsiyonel paylaşılan-secret doğrulaması
  if (SHARED_TOKEN) {
    const auth = req.headers.get('authorization') ?? '';
    const got = auth.replace(/^Bearer\s+/i, '').trim();
    if (got !== SHARED_TOKEN) {
      return new Response('forbidden', { status: 403 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return gchatJson(buildReply('⚠️ Geçersiz istek.'));
  }

  // DEBUG: gelen olayın yapısını gör
  console.log('[gchat-webhook] incoming', JSON.stringify({
    type: body?.type,
    eventType: body?.eventType,
    hasMessage: !!body?.message,
    hasChat: !!body?.chat,
    keys: Object.keys(body ?? {}),
    messageKeys: body?.message ? Object.keys(body.message) : [],
    text: body?.message?.text ?? body?.message?.argumentText ?? body?.chat?.messagePayload?.message?.text,
  }));

  const eventType: string = body.type ?? body.eventType ?? body?.chat?.type ?? '';
  // Google Chat'in yeni "chat" zarfı: { chat: { messagePayload: { message, space, user } } }
  const chatPayload = body?.chat?.messagePayload ?? body?.chat?.addedToSpacePayload ?? body?.chat?.removedFromSpacePayload;
  const space = body.space ?? body.message?.space ?? chatPayload?.space ?? {};
  const spaceName: string = space.displayName ?? space.name ?? 'default';
  const user = body.user ?? body.message?.sender ?? chatPayload?.user ?? chatPayload?.message?.sender ?? {};
  const senderName: string = user.displayName ?? user.name ?? 'kullanici';
  const eventId: string | undefined = body.eventId ?? body.eventTime ?? body?.chat?.eventTime;
  const messageObj = body.message ?? chatPayload?.message;

  // 1) Bot bir space'e eklendiyse selamla
  if (eventType === 'ADDED_TO_SPACE' || body?.chat?.type === 'ADDED_TO_SPACE') {
    return gchatJson(buildReply(
      `Selam ${senderName} 👋 Ben SahaTakip Asistanı. ` +
      `Bana doğal dilde komut verebilirsin:\n` +
      `• "X müşterisine yarın 14:00 klima bakımı iş emri aç"\n` +
      `• "Demir Yapı için 3+1 daire elektrik tesisatı teklifi oluştur"\n` +
      `• "Bu hafta tamamlanan iş emirleri kaç tane?"\n` +
      `• "Sayaç M-1001 son okuması nedir?"`
    ));
  }

  if (eventType === 'REMOVED_FROM_SPACE' || body?.chat?.type === 'REMOVED_FROM_SPACE') {
    return new Response('ok', { status: 200 });
  }

  // 2) Normal mesaj
  if (eventType === 'MESSAGE' || messageObj) {
    const raw = String(messageObj?.argumentText ?? messageObj?.text ?? '').trim();
    const text = stripMention(raw);
    const thread = messageObj?.thread;

    if (!text) {
      return gchatJson(buildReply('Komut boş görünüyor. Örn: "yarın 10:00 Demir Yapı için bakım iş emri aç".', thread));
    }

    // Inbound log
    await logInbound(senderName, text, spaceName, eventId);

    // Agent çağır
    const { answer, actions, error } = await runAgent(text, { user: senderName, space: spaceName });

    if (error) {
      await logOutbound(spaceName, '', false, error);
      return gchatJson(buildReply(`⚠️ Agent hata: ${error}`, thread));
    }

    const actionSummary = summarizeActions(actions);
    const reply = [answer || '✅ Tamamlandı.', actionSummary].filter(Boolean).join('\n\n');

    await logOutbound(spaceName, reply, true);

    return gchatJson(buildReply(reply, thread));
  }

  // Bilinmeyen event — sessiz ack
  return new Response('ok', { status: 200 });
});
