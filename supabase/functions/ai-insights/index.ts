// supabase/functions/ai-insights/index.ts
// Haftalık AI Insights — son 7 günün KPI'larını toplar, AI ile analiz eder,
// Gmail + Google Chat'e dağıtır.
//
// Body (opsiyonel):
//   {
//     days?: number,                  // default 7
//     to_email?: string|string[],     // default INSIGHTS_EMAIL_TO env
//     send_email?: boolean,           // default true
//     send_gchat?: boolean,           // default true
//     dry_run?: boolean               // default false — sadece üret, gönderme
//   }
// Resp:
//   { report, kpis, email_sent, gchat_sent, model }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;
const MODEL = 'gpt-4o-mini';
const supabase = createClient(SUPA_URL, SERVICE_KEY);

async function safeCount(table: string, since?: string, dateCol = 'created_at', filter?: (q: any) => any): Promise<number> {
  let q: any = supabase.from(table).select('id', { count: 'exact', head: true });
  if (since) q = q.gte(dateCol, since);
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

async function topGroup(table: string, col: string, since: string, dateCol = 'created_at', limit = 5): Promise<Array<{ key: string; count: number }>> {
  // Supabase JS group-by yok — manuel: tüm satırları çek, in-memory grupla.
  const { data, error } = await supabase
    .from(table)
    .select(`${col}, id`)
    .gte(dateCol, since)
    .limit(2000);
  if (error || !data) return [];
  const m = new Map<string, number>();
  for (const row of data) {
    const k = String((row as any)[col] ?? '—');
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function collectKpis(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const prevSince = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000).toISOString();

  const [
    wo_new, wo_done, wo_prev_done,
    cust_new, cust_total,
    visits_new, quotes_new,
    wo_urgent_open, top_clients, top_services, top_statuses,
  ] = await Promise.all([
    safeCount('work_orders', since),
    safeCount('work_orders', since, 'completed_at'),
    safeCount('work_orders', prevSince, 'completed_at', (q: any) => q.lt('completed_at', since)),
    safeCount('customers', since),
    safeCount('customers'),
    safeCount('sales_visits', since, 'visit_date'),
    safeCount('quotes', since),
    safeCount('work_orders', undefined, undefined, (q: any) => q.eq('priority', 'Acil').neq('status', 'Tamamlandı')),
    topGroup('work_orders', 'client', since),
    topGroup('work_orders', 'service_name', since),
    topGroup('work_orders', 'status', since),
  ]);

  const trend = wo_prev_done === 0 ? 100 : Math.round(((wo_done - wo_prev_done) / wo_prev_done) * 100);

  return {
    period_days: days,
    since,
    work_orders_new: wo_new,
    work_orders_completed: wo_done,
    work_orders_completed_prev: wo_prev_done,
    completion_trend_pct: trend,
    customers_new: cust_new,
    customers_total: cust_total,
    sales_visits_new: visits_new,
    quotes_new: quotes_new,
    urgent_open: wo_urgent_open,
    top_clients,
    top_services,
    top_statuses,
  };
}

async function aiSummarize(kpis: any): Promise<{ subject: string; markdown: string; gchat_text: string }> {
  const sys = `Sen Türkçe saha operasyonu yöneticisine haftalık AI özet hazırlayan bir analitik asistansın. Verilen KPI verilerinden içgörü çıkar, trend yorumla, risk ve fırsatları belirt. SADECE şu JSON şemasıyla yanıt ver:
{
  "subject": "E-posta konu satırı (60 karakteri geçme)",
  "markdown": "E-posta gövdesi — Markdown formatında 4-6 başlık: Genel Bakış, Trendler, Riskler, Fırsatlar, Öneriler. Sayısal değerlere referans ver.",
  "gchat_text": "Google Chat için kısa metin (max 1500 karakter, emoji kullan, başlıklı)."
}`;

  const user = `Son ${kpis.period_days} günün KPI verileri:

\`\`\`json
${JSON.stringify(kpis, null, 2)}
\`\`\`

Tarih: ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3500,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  const raw = j.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    // Eğer markdown alanı tekrar JSON içeriyorsa (model çift sarmış), iç JSON'u aç
    if (typeof parsed.markdown === 'string' && parsed.markdown.trim().startsWith('{')) {
      try {
        const inner = JSON.parse(parsed.markdown);
        if (inner.markdown) return { ...parsed, ...inner };
      } catch { /* ignore */ }
    }
    return parsed;
  } catch {
    // JSON parse fail → kesik/bozuk yanıt. Regex ile alanları çıkarmaya çalış.
    const subjectMatch = raw.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const markdownMatch = raw.match(/"markdown"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const gchatMatch = raw.match(/"gchat_text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const unescape = (s: string) => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return {
      subject: subjectMatch ? unescape(subjectMatch[1]) : 'Haftalık AI Insights',
      markdown: markdownMatch ? unescape(markdownMatch[1]) : 'Rapor üretildi ancak biçimlendirme hatası oluştu.',
      gchat_text: gchatMatch ? unescape(gchatMatch[1]).slice(0, 1400) : 'Haftalık özet hazır.',
    };
  }
}

function markdownToHtml(md: string): string {
  // Basit dönüştürücü — # başlık, **kalın**, satır sonları
  return md
    .replace(/^### (.*$)/gim, '<h3 style="color:#1f2937;margin-top:20px">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color:#111827;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-top:24px">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color:#111827">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul style="padding-left:20px">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin:10px 0;color:#374151;line-height:1.6">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)/, '<p style="margin:10px 0;color:#374151;line-height:1.6">$1</p>');
}

function kpiHtmlSummary(k: any): string {
  const arrow = k.completion_trend_pct >= 0 ? '▲' : '▼';
  const color = k.completion_trend_pct >= 0 ? '#22c55e' : '#ef4444';
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;width:25%">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Yeni İş Emri</div>
          <div style="font-size:24px;font-weight:800;color:#111827">${k.work_orders_new}</div>
        </td>
        <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;width:25%">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Tamamlanan</div>
          <div style="font-size:24px;font-weight:800;color:#111827">${k.work_orders_completed} <span style="font-size:12px;color:${color}">${arrow}${Math.abs(k.completion_trend_pct)}%</span></div>
        </td>
        <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;width:25%">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Yeni Müşteri</div>
          <div style="font-size:24px;font-weight:800;color:#111827">${k.customers_new}</div>
        </td>
        <td style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;text-align:center;width:25%">
          <div style="font-size:11px;color:#991b1b;text-transform:uppercase">Açık Acil</div>
          <div style="font-size:24px;font-weight:800;color:#991b1b">${k.urgent_open}</div>
        </td>
      </tr>
    </table>`;
}

async function sendEmail(to: string | string[], subject: string, html: string, text: string) {
  const r = await fetch(`${SUPA_URL}/functions/v1/gmail-send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
      text,
    }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, response: j };
}

async function sendGChat(text: string) {
  const r = await fetch(`${SUPA_URL}/functions/v1/gchat-send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ text }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, response: j };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // GÜVENLİK: paralı OpenAI + e-posta/Chat gönderir. Önceden kimliksiz çağrılabiliyor ve
  // body.to_email saldırgan-kontrollü olduğundan KEYFİ e-posta broadcast yapılabiliyordu.
  // İzin: ya cron/internal (service_role bearer) ya da admin/manager (onaylı). to_email
  // override yalnız service veya admin'e; diğerleri env varsayılanına sabitlenir.
  const bearer = (req.headers.get('Authorization') || req.headers.get('authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  const isService = !!SERVICE_KEY && bearer === SERVICE_KEY;
  let isAdmin = false;
  if (!isService) {
    const auth = await requireUser(req, { roles: ['admin', 'manager'], requireApproved: true });
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    isAdmin = auth.role === 'admin';
  }

  let opts: any = {};
  if (req.method === 'POST') {
    try { opts = await req.json(); } catch { /* boş gövde ok */ }
  }

  try {
    const days = Number(opts.days ?? 7);
    const sendEmailFlag = opts.send_email !== false;
    const sendChatFlag = opts.send_gchat !== false;
    const dryRun = opts.dry_run === true;
    const envDefaultTo = Deno.env.get('INSIGHTS_EMAIL_TO') ?? Deno.env.get('GMAIL_SMTP_USER');
    // to_email override yalnız güvenilir çağırana (cron/admin); aksi halde env'e sabit.
    const toEmail = (isService || isAdmin) ? (opts.to_email ?? envDefaultTo) : envDefaultTo;

    const kpis = await collectKpis(days);
    const ai = await aiSummarize(kpis);

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#fff">
        <div style="border-bottom:3px solid #22c55e;padding-bottom:12px;margin-bottom:8px">
          <h1 style="margin:0;color:#111827;font-size:22px">📊 Haftalık AI Insights</h1>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px">${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · Son ${days} gün</p>
        </div>
        ${kpiHtmlSummary(kpis)}
        ${markdownToHtml(ai.markdown ?? '')}
        <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px">
          SahaTakip · AI tarafından üretildi (${MODEL}) · ${new Date().toLocaleString('tr-TR')}
        </div>
      </div>`;

    const text = `${ai.subject}\n\n${ai.markdown}\n\n— SahaTakip AI Insights`;

    let email_sent: any = null;
    let gchat_sent: any = null;

    if (!dryRun) {
      if (sendEmailFlag && toEmail) {
        email_sent = await sendEmail(toEmail, `📊 ${ai.subject}`, html, text);
      }
      if (sendChatFlag) {
        gchat_sent = await sendGChat(`*📊 Haftalık AI Insights*\n\n${ai.gchat_text}`);
      }
    }

    return new Response(JSON.stringify({
      report: { subject: ai.subject, markdown: ai.markdown, gchat_text: ai.gchat_text, html },
      kpis,
      email_sent,
      gchat_sent,
      dry_run: dryRun,
      model: MODEL,
    }), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
