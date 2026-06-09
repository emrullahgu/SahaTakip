// supabase/functions/ai-sql/index.ts
// Text-to-SQL — Doğal dil sorudan READ-ONLY SQL üretir, güvenli çalıştırır, sonucu özetler.
//
// Body:  { question: string, max_rows?: number }
// Resp:  { question, sql, rows, row_count, summary, usage, latency_ms }
//
// Güvenlik:
//  - YALNIZCA SELECT'e izin verilir; INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER vs. reddedilir.
//  - Birden fazla statement (`;` ile ayrılmış) reddedilir.
//  - SQL bir RPC üzerinden çalıştırılır: public.exec_readonly_sql(sql)
//  - Yanıt en fazla 200 satırla sınırlandırılır.
//
// Env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;
const MODEL = 'gpt-4o-mini';

// AI'a verilecek şema özeti (sadece okumaya izin verilen tablolar/sütunlar).
const SCHEMA = `
TABLOLAR (PostgreSQL public şeması):

customers (musteriler)
  id uuid, short_name text, title text, tax_number text, email text, phone text,
  address text, city text, contact_person text, created_at timestamptz, created_by uuid

work_orders (is emirleri)
  id uuid, number text, customer_id uuid REFERENCES customers,
  title text, description text, date timestamptz, status text,
    -- status değerleri: 'Servis Açıldı', 'Devam Ediyor', 'Tamamlandı', 'Onay Bekliyor'
  engineer text, started_at timestamptz, finished_at timestamptz,
  created_at timestamptz, created_by uuid

work_order_materials
  id uuid, work_order_id uuid REFERENCES work_orders,
  name text, quantity numeric, unit text, unit_price numeric, total numeric

work_order_photos
  id uuid, work_order_id uuid, url text, caption text, taken_at timestamptz

quotes (teklifler)
  id uuid, number text, customer_id uuid, customer_name text,
  title text, date date, valid_until date, engineer text, status text,
    -- status: 'Taslak', 'Onay Bekliyor', 'Kabul Edildi', 'Reddedildi'
  subtotal numeric, vat_total numeric, grand_total numeric,
  created_at timestamptz, created_by uuid

quote_lines
  id uuid, quote_id uuid REFERENCES quotes, line_no int,
  poz_id text, poz_name text, unit text, quantity numeric,
  material_price numeric, install_price numeric, dismantle_price numeric,
  vat_pct numeric, discount_pct numeric

employees (personel)
  id uuid, full_name text, role text, daily_wage numeric, active boolean

attendance (puantaj)
  id uuid, employee_id uuid REFERENCES employees, date date, present boolean

sales_visits (satis ziyaretleri)
  id uuid, customer_id uuid, visit_date timestamptz, salesperson_id uuid,
  purpose text, summary text, outcome text,
    -- outcome: 'opportunity', 'won', 'lost', 'follow_up', 'no_interest'
  estimated_amount numeric, photos text[]

materials (malzemeler)
  id uuid, code text, name text, unit text, price numeric,
  min_stock numeric, category text, barcode text

ai_documents
  id uuid, title text, source text, content text, created_at timestamptz

channel_messages
  id uuid, channel text, direction text, to_addr text, from_addr text,
  subject text, body text, status text, created_at timestamptz

audit_logs
  id uuid, user_id uuid, action text, entity text, entity_id text,
  details jsonb, created_at timestamptz
`;

const SYSTEM_PROMPT = `Sen Türkçe doğal dil sorularını PostgreSQL SELECT sorgularına çeviren bir uzmansın.

ŞEMA:
${SCHEMA}

KURALLAR:
1. SADECE SELECT döndür. INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER yasak.
2. Birden fazla statement YOK. Tek bir SELECT.
3. Sonuna noktalı virgül koyma.
4. Tarih için: 'bu hafta' = >= date_trunc('week', now()), 'bu ay' = >= date_trunc('month', now()), 'son 30 gün' = >= now() - interval '30 days'.
5. status karşılaştırmalarında ŞEMADAKİ tam Türkçe değerleri kullan (ör. 'Tamamlandı').
6. Müşteri adı için customers tablosundaki short_name veya title sütununu kullan, ILIKE '%xxx%' ile.
7. JOIN gerekiyorsa USING veya ON ile yap.
8. Sonuç çoksa LIMIT 100 ekle.
9. Sayım/grup: COUNT(*), GROUP BY kullan.
10. SADECE SQL kodu döndür — açıklama, markdown fence, comment YOK. Tek satır olabilir, çok satır olabilir.`;

const FORBIDDEN = /\b(insert\s+into|update\s+\w|delete\s+from|drop\s+(table|view|index|schema|function|trigger|sequence|materialized)|truncate\s+\w|alter\s+(table|view|index|schema|function|sequence)|create\s+(table|view|index|schema|function|trigger|sequence|materialized|or\s+replace)|grant\s+\w|revoke\s+\w|merge\s+into|copy\s+\w|vacuum|call\s+\w|do\s+\$)/i;

function validateSql(sql: string): string {
  const trimmed = sql.trim().replace(/^```(?:sql)?\s*/i, '').replace(/\s*```$/, '').trim();
  // Trailing semicolon kabul; ortada yasak
  const noTrailing = trimmed.replace(/;+\s*$/, '');
  if (noTrailing.includes(';')) throw new Error('Birden fazla statement yasak.');
  if (!/^select\b/i.test(noTrailing) && !/^with\b/i.test(noTrailing)) {
    throw new Error('Sadece SELECT (veya CTE) destekleniyor.');
  }
  if (FORBIDDEN.test(noTrailing)) throw new Error('Yasaklı anahtar kelime tespit edildi.');
  return noTrailing;
}

async function callOpenAI(messages: any[], json = false): Promise<any> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      max_tokens: 800,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  // YETKİ (denetim M7): exec_readonly_sql SECURITY DEFINER ile RLS bypass edip TÜM
  // tabloları okuyabildiğinden, yalnız onaylı admin/manager bu fonksiyonu çağırabilir.
  const auth = await requireUser(req, { roles: ['admin', 'manager'], requireApproved: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const t0 = Date.now();
  try {
    const body = await req.json();
    const question: string = String(body.question ?? '').trim();
    if (!question) throw new Error('question boş.');
    const maxRows = Math.min(Math.max(Number(body.max_rows) || 100, 1), 200);

    // 1) AI'dan SQL üret
    const gen = await callOpenAI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question },
    ]);
    const rawSql = gen.choices?.[0]?.message?.content ?? '';
    const sql = validateSql(rawSql);

    // 2) RPC üzerinden read-only çalıştır
    const { data: rows, error } = await supabase.rpc('exec_readonly_sql', { p_sql: sql, p_limit: maxRows });
    if (error) {
      // SQL hatasını AI'a yansıt — kullanıcı dostu mesaj
      return new Response(JSON.stringify({
        question, sql, error: error.message, hint: 'Sorgu çalıştırılamadı; SQL yanlış olabilir.',
      }), { status: 400, headers: { ...CORS, 'content-type': 'application/json' } });
    }

    const rowCount = Array.isArray(rows) ? rows.length : 0;

    // 3) Türkçe özet
    let summary = '';
    if (rowCount > 0) {
      const sample = JSON.stringify(rows!.slice(0, 20));
      const sm = await callOpenAI([
        { role: 'system', content: 'Veriyi 1-3 cümlede Türkçe özetleyen bir analistsin. Sayıları net belirt.' },
        { role: 'user', content: `Soru: ${question}\nÖrnek sonuç (${rowCount} satır): ${sample}\n\nKısa özet yaz.` },
      ]);
      summary = sm.choices?.[0]?.message?.content ?? '';
    } else {
      summary = 'Eşleşen kayıt bulunamadı.';
    }

    return new Response(JSON.stringify({
      question, sql, rows, row_count: rowCount, summary,
      latency_ms: Date.now() - t0, model: MODEL,
    }), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e), latency_ms: Date.now() - t0 }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
