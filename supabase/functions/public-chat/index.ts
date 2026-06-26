// supabase/functions/public-chat/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC WEB BOTU — kimliği DOĞRULANMAMIŞ ziyaretçi için izole karşılama asistanı.
//
// GÜVENLİK MODELİ (mevcut korumalı AI fonksiyonlarından TAMAMEN ayrı):
//  - verify_jwt = FALSE (anon erişim) — config.toml'de işaretli. Diğer AI fonksiyonları
//    requireUser ile korumalı KALIR; bu fonksiyon onları ASLA çağırmaz.
//  - TOOL YOK, DB YAZMA YOK (yalnız web_requests'e talep ekler). İç CRM/PII'ye erişmez.
//  - YALNIZ is_public RAG korpusu (match_ai_chunks_public) → müşteri PII sızmaz.
//  - Captcha (Cloudflare Turnstile) — TURNSTILE_SECRET varsa ZORUNLU; yoksa rate-limit'e güvenir.
//  - Kalıcı IP rate-limit (public_rate_hit RPC) + günlük global istek tavanı (abuse/fatura).
//  - Ayrı LLM anahtarı (PUBLIC_OPENAI_API_KEY) → iç kullanım kotasıyla karışmaz.
//
// Fiyat politikası (kullanıcı tercihi): bağlamda fiyat varsa "TAHMİN, bağlayıcı değil"
// notuyla söyler; yoksa UYDURMAZ, talep toplamaya yönlendirir.
//
// Body:
//   { action:'chat', message, history?, turnstileToken? }      → RAG yanıtı
//   { action:'capture', request:{ name?, contact?, message }, turnstileToken? } → talep kaydı
//
// Deploy: supabase functions deploy public-chat --no-verify-jwt
// Secrets (opsiyonel ama önerilir):
//   PUBLIC_OPENAI_API_KEY (yoksa OPENAI_API_KEY) · TURNSTILE_SECRET · PUBLIC_CHAT_DAILY_MAX
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*', // public widget; abuse koruması captcha + rate-limit
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPA_URL, SERVICE_KEY);

// Embedding korpusla AYNI model olmalı (OpenAI text-embedding-3-small ile indekslendi).
const EMBED_KEY = Deno.env.get('OPENAI_API_KEY') || '';
// Sohbet için AYRI public anahtar (yoksa OPENAI_API_KEY'e düşer).
const CHAT_KEY = Deno.env.get('PUBLIC_OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '';
const CHAT_MODEL = Deno.env.get('PUBLIC_CHAT_MODEL') || 'gpt-4o-mini';

const IP_PER_MIN = Number(Deno.env.get('PUBLIC_CHAT_IP_PER_MIN') || '15');
const DAILY_MAX = Number(Deno.env.get('PUBLIC_CHAT_DAILY_MAX') || '3000');
const MAX_MSG = 1500;       // tek mesaj azami karakter
const MAX_HISTORY = 6;      // taşınan azami geçmiş tur

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return (xff.split(',')[0] || '').trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function rateOk(bucket: string, limit: number, windowSec: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('public_rate_hit', {
      p_bucket: bucket, p_limit: limit, p_window_seconds: windowSec,
    });
    if (error) return true; // rate-limit altyapısı yoksa botu kilitleme (fail-open, izlenebilir)
    return data !== false;
  } catch { return true; }
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET') || '';
  if (!secret) return true; // captcha yapılandırılmadıysa rate-limit'e güven (uyarı: prod'da kur)
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
    });
    const j = await r.json().catch(() => ({}));
    return j?.success === true;
  } catch { return false; }
}

async function embed(text: string): Promise<number[] | null> {
  if (!EMBED_KEY) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { authorization: `Bearer ${EMBED_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 4000) }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

async function publicContext(question: string): Promise<{ context: string; sources: string[] }> {
  const emb = await embed(question);
  if (!emb) return { context: '', sources: [] };
  const { data: matches, error } = await supabase.rpc('match_ai_chunks_public', {
    query_embedding: emb, match_count: 6,
  });
  if (error || !matches?.length) return { context: '', sources: [] };
  const context = matches.map((m: any, i: number) => `[#${i + 1} — ${m.doc_title}]\n${m.content}`).join('\n\n---\n\n');
  const sources = [...new Set(matches.map((m: any) => m.doc_title).filter(Boolean))];
  return { context, sources };
}

const SYSTEM_PROMPT = (context: string) => `Sen KOBİNERJİ'nin web sitesi karşılama asistanısın. Ziyaretçilere yardımcı ol ve taleplerini topla. Türkçe, kısa ve sıcak yanıt ver.

KESİN KURALLAR:
- YALNIZ aşağıdaki KAMUYA AÇIK BİLGİ'ye dayan. Bilgi yoksa uydurma — "bunu ekibimize ileteyim, en doğru bilgiyle dönelim" de.
- FİYAT: Bağlamda açık bir fiyat/aralık VARSA söyleyebilirsin ama MUTLAKA şu notu ekle: "Bu bir TAHMİNDİR, bağlayıcı değildir; kesin teklif için ekibimiz size özel hazırlar." Bağlamda fiyat YOKSA fiyat UYDURMA — "size özel teklif hazırlayalım, iletişim bilginizi bırakırsanız ekibimiz döner" de.
- Ürün, teknik detay, stok, vergi, resmi belge UYDURMA. Emin değilsen söyleme.
- İç sistem/müşteri verisi isteme, paylaşma. Kişisel veriyi ısrarla isteme.
- Ziyaretçi teklif/işlem istiyorsa veya iletişim bırakmak isterse, talep formuna yönlendir ("Adınızı ve telefon/e-postanızı bırakın, talebinizi ekibimize ileteyim").

KAMUYA AÇIK BİLGİ:
${context || '(şu an yüklü kamuya açık içerik yok — ziyaretçiyi talep bırakmaya yönlendir.)'}`;

async function chatLLM(messages: any[]): Promise<{ ok: boolean; content?: string; error?: string }> {
  if (!CHAT_KEY) return { ok: false, error: 'Asistan henüz yapılandırılmadı.' };
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${CHAT_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: CHAT_MODEL, messages, temperature: 0.3, max_tokens: 600 }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || `LLM ${r.status}` };
    return { ok: true, content: j?.choices?.[0]?.message?.content ?? '' };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST gerekli' }, 405);

  const ip = clientIp(req);
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: 'Geçersiz JSON' }, 400); }

  // Global günlük tavan (fatura/abuse koruması) — IP'den bağımsız.
  if (!await rateOk(`pc:day:${new Date().toISOString().slice(0, 10)}`, DAILY_MAX, 86400)) {
    return json({ error: 'Bugünkü sohbet kapasitesi doldu, lütfen yarın tekrar deneyin veya talep bırakın.' }, 429);
  }
  // IP başına dakikalık tavan.
  if (!await rateOk(`pc:ip:${ip}`, IP_PER_MIN, 60)) {
    return json({ error: 'Çok fazla istek. Lütfen birkaç saniye sonra tekrar deneyin.' }, 429);
  }
  // Captcha (yapılandırıldıysa zorunlu).
  if (!await verifyTurnstile(body?.turnstileToken, ip)) {
    return json({ error: 'Doğrulama gerekli (captcha).', captchaRequired: true }, 403);
  }

  const action = String(body?.action ?? 'chat');

  // ── TALEP KAYDI ────────────────────────────────────────────
  if (action === 'capture') {
    const reqBody = body?.request ?? {};
    const message = String(reqBody?.message ?? '').trim().slice(0, 4000);
    if (!message) return json({ error: 'Talep mesajı boş.' }, 400);
    const { error } = await supabase.from('web_requests').insert({
      name: reqBody?.name ? String(reqBody.name).slice(0, 200) : null,
      contact: reqBody?.contact ? String(reqBody.contact).slice(0, 200) : null,
      message,
      summary: reqBody?.summary ? String(reqBody.summary).slice(0, 1000) : null,
      source: 'web',
      meta: { ip },
    });
    if (error) return json({ error: 'Talep kaydedilemedi.' }, 500);
    return json({ ok: true, message: 'Talebiniz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecek. Teşekkürler!' });
  }

  // ── SOHBET (RAG, tool YOK) ─────────────────────────────────
  const message = String(body?.message ?? '').trim().slice(0, MAX_MSG);
  if (!message) return json({ error: 'Mesaj boş.' }, 400);

  const { context, sources } = await publicContext(message);

  const history = Array.isArray(body?.history)
    ? body.history.slice(-MAX_HISTORY)
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_MSG) }))
    : [];

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT(context) },
    ...history,
    { role: 'user', content: message },
  ];

  const res = await chatLLM(messages);
  if (!res.ok) return json({ error: res.error || 'Asistan yanıt veremedi.' }, 502);

  return json({ ok: true, answer: res.content, sources });
});
