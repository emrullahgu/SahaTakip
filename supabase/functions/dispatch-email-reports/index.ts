// ====================================================================
// Supabase Edge Function: dispatch-email-reports
// --------------------------------------------------------------------
// Vadesi gelen tüm email_schedules kayıtları için rapor maili üretir
// ve Resend API üzerinden gönderir.
//
// Çağrı (Supabase Scheduled Functions / Cron):
//   her 15 dk'da bir POST → bu fonksiyon.
//
// Env (Supabase secrets):
//   SUPABASE_URL                — proje URL (otomatik)
//   SUPABASE_SERVICE_ROLE_KEY   — service-role anahtarı (otomatik)
//   RESEND_API_KEY              — Resend API key (zorunlu)
//   RESEND_FROM                 — "SahaTakip <noreply@yourdomain>"
//
// Dağıtım:
//   supabase functions deploy dispatch-email-reports
//   supabase secrets set RESEND_API_KEY=re_xxx RESEND_FROM="..."
//   supabase functions schedule dispatch-email-reports "*/15 * * * *"
// ====================================================================

// @ts-ignore — Deno runtime
declare const Deno: { env: { get(k: string): string | undefined } };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailSchedule {
  id: string;
  name: string;
  kind: 'daily' | 'weekly' | 'monthly' | 'yearly';
  report_type: 'summary' | 'kpi' | 'workorders' | 'collections' | 'custom';
  recipients: string[];
  role_filter: string[] | null;
  subject_template: string | null;
  body_template: string | null;
  hour_utc: number;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
}

const KIND_LABEL: Record<EmailSchedule['kind'], string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  yearly: 'Yıllık',
};

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return sb<T>(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
}

async function resolveRecipients(s: EmailSchedule): Promise<string[]> {
  const list = new Set<string>(s.recipients ?? []);
  if (s.role_filter && s.role_filter.length > 0) {
    // role bazlı email listesi — auth.users join
    const data = await sb<{ email: string | null }[]>(
      `/rest/v1/profiles?role=in.(${s.role_filter.join(',')})&select=email:auth_user_email`,
    ).catch(() => [] as { email: string | null }[]);
    for (const row of data) {
      if (row?.email) list.add(row.email);
    }
  }
  return [...list].filter(Boolean);
}

async function buildReport(s: EmailSchedule): Promise<{ subject: string; html: string }> {
  // Dönem aralığı
  const now = new Date();
  let start = new Date(now);
  switch (s.kind) {
    case 'daily': start.setDate(now.getDate() - 1); break;
    case 'weekly': start.setDate(now.getDate() - 7); break;
    case 'monthly': start.setMonth(now.getMonth() - 1); break;
    case 'yearly': start.setFullYear(now.getFullYear() - 1); break;
  }
  const startISO = start.toISOString();

  // KPI fetch — defansif (hatalarda 0)
  const safe = async <T>(p: Promise<T>, fb: T): Promise<T> => p.catch(() => fb);
  const [wo, payments, customers] = await Promise.all([
    safe(sb<{ count: number }[]>(
      `/rest/v1/work_orders?created_at=gte.${startISO}&select=count`,
      { headers: { Prefer: 'count=exact' } },
    ), [] as { count: number }[]),
    safe(sb<{ amount: number }[]>(
      `/rest/v1/payments?received_at=gte.${startISO}&status=eq.received&select=amount`,
    ), [] as { amount: number }[]),
    safe(sb<{ count: number }[]>(
      `/rest/v1/customers?created_at=gte.${startISO}&select=count`,
      { headers: { Prefer: 'count=exact' } },
    ), [] as { count: number }[]),
  ]);
  const totalPayments = payments.reduce((a, b) => a + Number(b.amount ?? 0), 0);
  const woCount = (wo as unknown as { count?: number }[])[0]?.count ?? wo.length;
  const custCount = (customers as unknown as { count?: number }[])[0]?.count ?? customers.length;

  const label = KIND_LABEL[s.kind];
  const subject = (s.subject_template?.trim() || `SahaTakip ${label} Raporu`)
    .replaceAll('{{label}}', label)
    .replaceAll('{{date}}', now.toLocaleDateString('tr-TR'));

  const bodyTpl = s.body_template?.trim();
  const html = bodyTpl
    ? bodyTpl
        .replaceAll('{{label}}', label)
        .replaceAll('{{wo}}', String(woCount))
        .replaceAll('{{payments}}', totalPayments.toLocaleString('tr-TR'))
        .replaceAll('{{customers}}', String(custCount))
    : `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <h2 style="color:#16a34a;margin-bottom:4px">SahaTakip — ${label} Rapor</h2>
        <p style="color:#64748b;margin-top:0">Dönem: ${start.toLocaleDateString('tr-TR')} — ${now.toLocaleDateString('tr-TR')}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px;border:1px solid #e2e8f0">Yeni İş Emri</td>
              <td style="padding:8px;border:1px solid #e2e8f0;font-weight:700">${woCount}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0">Tahsilat (TRY)</td>
              <td style="padding:8px;border:1px solid #e2e8f0;font-weight:700">${totalPayments.toLocaleString('tr-TR')}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0">Yeni Müşteri</td>
              <td style="padding:8px;border:1px solid #e2e8f0;font-weight:700">${custCount}</td></tr>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          Bu otomatik bir mesajdır — SahaTakip planlı rapor sistemi.
        </p>
      </div>`;

  return { subject, html };
}

async function sendResend(to: string[], subject: string, html: string): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') || 'SahaTakip <onboarding@resend.dev>';
  if (!key) throw new Error('RESEND_API_KEY missing');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// @ts-ignore — Deno.serve
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const due = await rpc<EmailSchedule[]>('due_email_schedules');
    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const s of due) {
      try {
        const recipients = await resolveRecipients(s);
        if (recipients.length === 0) {
          await rpc('complete_email_dispatch', {
            p_schedule_id: s.id, p_recipients: [], p_subject: '', p_status: 'failed',
            p_error: 'no_recipients',
          });
          results.push({ id: s.id, status: 'failed', error: 'no_recipients' });
          continue;
        }
        const { subject, html } = await buildReport(s);
        await sendResend(recipients, subject, html);
        await rpc('complete_email_dispatch', {
          p_schedule_id: s.id, p_recipients: recipients, p_subject: subject, p_status: 'success',
        });
        results.push({ id: s.id, status: 'success' });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        await rpc('complete_email_dispatch', {
          p_schedule_id: s.id, p_recipients: [], p_subject: '', p_status: 'failed', p_error: err,
        }).catch(() => {});
        results.push({ id: s.id, status: 'failed', error: err });
      }
    }
    return json(200, { processed: results.length, results });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
