// supabase/functions/ai-tools/index.ts
// AI Function-Calling Agent — OpenAI tools API üzerinden gerçek DB aksiyonları.
//
// Body:  { messages: [{role,content}], max_iterations?: 5 }
// Resp:  { answer: string, actions: [{tool, args, result}], usage, model }
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

// ─────────────────────────────────────────────────────────────
// Tool tanımları (JSON schema)
// ─────────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'find_customer',
      description: 'Müşteri ara: ad, ünvan, telefon veya vergi no içinde geçen kayıtları döner. Bir başka tool için customer_id bulmak için ÖNCE bunu çağır.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Müşteri arama metni (ad veya ünvan parçası).' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_employee',
      description: 'Personel/mühendis ara — isimle.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description: 'Yeni müşteri ekle.',
      parameters: {
        type: 'object',
        properties: {
          short_name: { type: 'string', description: 'Kısa ad — ZORUNLU.' },
          title: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          tax_number: { type: 'string' },
          contact_person: { type: 'string' },
        },
        required: ['short_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_work_order',
      description: 'Yeni iş emri (servis kaydı) oluştur. customer_id mutlaka önce find_customer ile bulunmalı.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: 'UUID — find_customer çıktısından alın.' },
          title: { type: 'string', description: 'Kısa başlık (ör: "Klima bakımı").' },
          description: { type: 'string' },
          date: { type: 'string', description: 'ISO 8601 tarih+saat (YYYY-MM-DDTHH:mm). Bugünden geleceğe.' },
          engineer: { type: 'string', description: 'Atanan mühendis adı.' },
          status: { type: 'string', enum: ['Servis Açıldı', 'Devam Ediyor', 'Tamamlandı', 'Onay Bekliyor'] },
        },
        required: ['customer_id', 'title', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_work_orders',
      description: 'İş emirlerini listele/filtrele.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          customer_id: { type: 'string' },
          from: { type: 'string', description: 'YYYY-MM-DD' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'number', default: 20 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_sales_visit',
      description: 'Satış ziyareti kaydı oluştur.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          visit_date: { type: 'string', description: 'ISO 8601' },
          purpose: { type: 'string' },
          summary: { type: 'string' },
          outcome: { type: 'string', enum: ['opportunity', 'won', 'lost', 'follow_up', 'no_interest'] },
          estimated_amount: { type: 'number' },
        },
        required: ['customer_id', 'visit_date', 'purpose'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_notification',
      description: 'Google Chat (varsayılan space) veya e-posta ile bildirim gönder.',
      parameters: {
        type: 'object',
        properties: {
          channel: { type: 'string', enum: ['gchat', 'gmail'] },
          to: { type: 'string', description: 'Gmail için alıcı; gchat için boş bırakılabilir.' },
          subject: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['channel', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_data',
      description: 'Veritabanına doğal dil sorgusu (Text-to-SQL). Kompleks raporlar, sayım, istatistik için kullan. Örn: "Hangi müşteride en çok arıza var?", "Bu ay tamamlanan iş emirleri".',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Doğal dil veri sorusu (Türkçe).' },
        },
        required: ['question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_quote',
      description: 'Yeni teklif (quote) oluştur. Kullanıcı "3+1 ev elektrik tesisatı için teklif" gibi isteyince, sen kalemleri (POZ\'ları) Türkiye piyasasına uygun makul fiyatlarla üret. Müşteri varsa önce find_customer ile customer_id bul.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: 'find_customer çıktısından UUID. Bilinmiyorsa boş bırak.' },
          customer_name: { type: 'string', description: 'Müşteri adı (zorunlu).' },
          title: { type: 'string', description: 'Teklif başlığı. Örn: "3+1 daire elektrik tesisatı".' },
          engineer: { type: 'string' },
          valid_days: { type: 'number', description: 'Geçerlilik (gün). Default 30.' },
          notes: { type: 'string' },
          lines: {
            type: 'array',
            description: 'Teklif kalemleri. En az 1 kalem zorunlu.',
            items: {
              type: 'object',
              properties: {
                poz_name: { type: 'string', description: 'Kalem adı (ör: "NYA 2.5mm Kablo", "Anahtar + Priz Seti").' },
                unit: { type: 'string', description: 'Birim. Adet/m/m²/Set. Default Adet.' },
                quantity: { type: 'number' },
                unit_price: { type: 'number', description: 'Birim malzeme fiyatı (TL).' },
                install_price: { type: 'number', description: 'İşçilik birim fiyatı (opsiyonel, default 0).' },
                vat_pct: { type: 'number', description: 'KDV%. Default 20.' },
                notes: { type: 'string' },
              },
              required: ['poz_name', 'quantity', 'unit_price'],
            },
          },
        },
        required: ['customer_name', 'title', 'lines'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_documents',
      description: 'NotebookLM (RAG) bilgi tabanındaki belgeleri listele. "Hangi notebook\'lar var" gibi sorularda veya search_knowledge öncesinde kullan.',
      parameters: { type: 'object', properties: { limit: { type: 'number', default: 50 } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'NotebookLM bilgi tabanında semantik arama (RAG). Belge içeriği hakkında kaynak referanslı yanıt üretir. document_title verilirse o belgeyi önceliklendirir.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          document_title: { type: 'string', description: 'Belirli bir belgeye odaklan.' },
          top_k: { type: 'number', default: 5 },
        },
        required: ['question'],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────
// Tool implementations
// ─────────────────────────────────────────────────────────────
async function execTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'find_customer': {
      const q = String(args.query ?? '').trim();
      // GÜVENLİK: q PostgREST .or() GRAMERİNE ham giriyor (değer değil). ',' '(' ')'
      // '.' operatör/ayraç token'ları + '*'/'%' wildcard → filter-grammar injection
      // (service_role ile RLS bypass). Whitelist: yalnız Unicode harf/rakam/boşluk
      // bırak (Türkçe adlar + telefon/vergi-no rakamları korunur), gerisi boşluğa.
      const safeQ = q.replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
      if (!safeQ) return { matches: [] };
      const { data, error } = await supabase
        .from('customers')
        .select('id, short_name, title, phone, email, city')
        .or(`short_name.ilike.%${safeQ}%,title.ilike.%${safeQ}%,phone.ilike.%${safeQ}%,tax_number.ilike.%${safeQ}%`)
        .limit(10);
      if (error) return { error: error.message };
      return { matches: data ?? [] };
    }
    case 'find_employee': {
      const q = String(args.query ?? '').trim();
      if (!q) return { matches: [] };
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, role, active')
        .ilike('full_name', `%${q}%`)
        .limit(10);
      if (error) return { error: error.message };
      return { matches: data ?? [] };
    }
    case 'create_customer': {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          short_name: args.short_name,
          title: args.title ?? args.short_name,
          phone: args.phone ?? null,
          email: args.email ?? null,
          address: args.address ?? null,
          city: args.city ?? null,
          tax_number: args.tax_number ?? null,
          contact_person: args.contact_person ?? null,
        })
        .select('id, short_name, title')
        .single();
      if (error) return { error: error.message };
      return { ok: true, customer: data };
    }
    case 'create_work_order': {
      // Otomatik numara üret
      const number = `IS-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          number,
          customer_id: args.customer_id,
          title: args.title,
          description: args.description ?? null,
          date: args.date,
          engineer: args.engineer ?? null,
          status: args.status ?? 'Servis Açıldı',
        })
        .select('id, number, title, date, status')
        .single();
      if (error) return { error: error.message };
      return { ok: true, work_order: data };
    }
    case 'list_work_orders': {
      let q = supabase
        .from('work_orders')
        .select('id, number, title, date, status, customer_id, engineer')
        .order('date', { ascending: false })
        .limit(args.limit ?? 20);
      if (args.status) q = q.eq('status', args.status);
      if (args.customer_id) q = q.eq('customer_id', args.customer_id);
      if (args.from) q = q.gte('date', args.from);
      if (args.to) q = q.lte('date', args.to);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, work_orders: data ?? [] };
    }
    case 'create_sales_visit': {
      const { data, error } = await supabase
        .from('sales_visits')
        .insert({
          customer_id: args.customer_id,
          visit_date: args.visit_date,
          purpose: args.purpose,
          summary: args.summary ?? null,
          outcome: args.outcome ?? 'follow_up',
          estimated_amount: args.estimated_amount ?? null,
        })
        .select('id, visit_date, purpose, outcome')
        .single();
      if (error) return { error: error.message };
      return { ok: true, visit: data };
    }
    case 'send_notification': {
      const fnName = args.channel === 'gmail' ? 'gmail-send' : 'gchat-send';
      const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${fnName}`;
      const payload = args.channel === 'gmail'
        ? { to: args.to, subject: args.subject ?? 'SahaTakip Bildirimi', text: args.message }
        : { text: args.message };
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, channel: args.channel, response: j };
    }
    case 'query_data': {
      const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-sql`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ question: args.question, max_rows: 50 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: j?.error ?? `ai-sql ${r.status}` };
      return {
        sql: j.sql,
        row_count: j.row_count,
        rows: Array.isArray(j.rows) ? j.rows.slice(0, 30) : [],
        summary: j.summary,
      };
    }
    case 'create_quote': {
      const lines = Array.isArray(args.lines) ? args.lines : [];
      if (!lines.length) return { error: 'En az 1 kalem gerekli.' };

      let subtotal = 0;
      let vatTotal = 0;
      const linesNorm = lines.map((l: any, idx: number) => {
        const qty = Number(l.quantity ?? 1);
        const matPrice = Number(l.unit_price ?? 0);
        const instPrice = Number(l.install_price ?? 0);
        const overhead = 10;
        const profit = 15;
        const vatPct = Number(l.vat_pct ?? 20);
        const unitTotal = (matPrice + instPrice) * (1 + overhead / 100 + profit / 100);
        const lineSub = qty * unitTotal;
        const lineVat = lineSub * (vatPct / 100);
        subtotal += lineSub;
        vatTotal += lineVat;
        return {
          line_no: idx + 1,
          poz_id: l.poz_id ?? `AI-${Date.now().toString(36)}-${idx + 1}`,
          poz_name: l.poz_name,
          unit: l.unit ?? 'Adet',
          quantity: qty,
          material_price: matPrice,
          install_price: instPrice,
          dismantle_price: 0,
          with_dismantle: false,
          overhead_pct: overhead,
          profit_pct: profit,
          vat_pct: vatPct,
          discount_pct: 0,
          notes: l.notes ?? null,
        };
      });
      const grandTotal = subtotal + vatTotal;
      const validDays = Number(args.valid_days ?? 30);
      const validUntil = new Date(Date.now() + validDays * 86400000).toISOString().slice(0, 10);
      const number = `TKL-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

      const { data: quote, error: e1 } = await supabase
        .from('quotes')
        .insert({
          number,
          customer_id: args.customer_id ?? null,
          customer_name: args.customer_name,
          title: args.title,
          valid_until: validUntil,
          engineer: args.engineer ?? 'AI Asistan',
          notes: args.notes ?? null,
          subtotal: Math.round(subtotal * 100) / 100,
          vat_total: Math.round(vatTotal * 100) / 100,
          grand_total: Math.round(grandTotal * 100) / 100,
          status: 'Taslak',
        })
        .select('id, number, title, grand_total')
        .single();
      if (e1) return { error: `quote: ${e1.message}` };

      const linesRows = linesNorm.map((l: any) => ({ ...l, quote_id: quote!.id }));
      const { error: e2 } = await supabase.from('quote_lines').insert(linesRows);
      if (e2) return { error: `quote_lines: ${e2.message}`, quote };

      return {
        ok: true,
        quote: {
          id: quote!.id,
          number: quote!.number,
          title: quote!.title,
          line_count: linesNorm.length,
          subtotal: Math.round(subtotal),
          vat_total: Math.round(vatTotal),
          grand_total: Math.round(grandTotal),
          valid_until: validUntil,
        },
      };
    }
    case 'list_documents': {
      const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-rag`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ action: 'list', limit: args.limit ?? 50 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: j?.error ?? `ai-rag list ${r.status}` };
      const docs = (j.documents ?? []).map((d: any) => ({
        title: d.title, source: d.source, chunks: d.chunk_count, id: d.id,
      }));
      return { count: docs.length, documents: docs };
    }
    case 'search_knowledge': {
      const q = String(args.question ?? '').trim();
      if (!q) return { error: 'question boş.' };
      const docTitle = args.document_title ? String(args.document_title) : '';
      const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-rag`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          action: 'query',
          question: docTitle ? `[${docTitle} belgesi için] ${q}` : q,
          top_k: args.top_k ?? 5,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: j?.error ?? `ai-rag query ${r.status}` };
      return {
        answer: j.answer ?? j.content ?? '',
        sources: (j.sources ?? []).map((s: any) => ({
          title: s.title, similarity: s.similarity, excerpt: s.excerpt?.slice(0, 200),
        })),
      };
    }
    default:
      return { error: `Bilinmeyen tool: ${name}` };
  }
}

// ─────────────────────────────────────────────────────────────
// Agent loop
// ─────────────────────────────────────────────────────────────
async function callOpenAI(messages: any[]): Promise<any> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.2,
      // Yanıt uzunluğu tavanı → öngörülebilir maliyet (10 iterasyonluk ajan
      // döngüsünde sınırsız çıktı maliyet patlamasına yol açabilirdi).
      max_tokens: 1500,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return await r.json();
}

const SYSTEM_PROMPT = `Sen SahaTakip'in Türkçe konuşan saha operasyon asistanısın.

Görevin: Kullanıcının doğal dilde ifade ettiği saha operasyonu komutlarını verilen tool'larla yerine getirmek.

KURALLAR:
1. Bir kayıt (iş emri, satış ziyareti) oluşturmadan ÖNCE find_customer ile customer_id'yi bul.
2. Eğer find_customer birden fazla eşleşme bulursa kullanıcıya hangisi olduğunu sor (tool çağırma, sadece yanıtla).
3. Tarih için kullanıcı "yarın", "Cuma" gibi yazsa bile bu çalıştığında bugünün tarihinin ${new Date().toISOString().slice(0, 10)} olduğunu varsay ve ISO 8601 formatına çevir.
4. Eksik bilgi varsa kullanıcıya kısa, net soru sor (tool çağırma).
5. İşlem başarılıysa ne yaptığını TEK CÜMLEDE özetle (ör: "İş emri IS-2026-12345 oluşturuldu, 04 Haz 14:00").
6. Hata varsa nedenini açıkça söyle.

TEKLİF OLUŞTURMA:
- "X için teklif oluştur" denirse create_quote tool'unu kullan.
- Kalemleri (POZ'ları) SEN, Türkiye piyasasına uygun makul fiyatlarla üret.
- Örn: "3+1 ev elektrik tesisatı" için tipik kalemler: NYA 1.5mm kablo (m), NYA 2.5mm kablo (m), Anahtar+priz seti (adet), Sıva altı buat (adet), Sigorta kutusu/pano (adet), Otomatik sigortalar (adet), LED tavan armatürü (adet), Topraklama tesisatı (set), İşçilik (set).
- 3+1 daire için: ~400m 1.5mm kablo, ~250m 2.5mm kablo, 35-45 anahtar/priz, 30+ buat, 1 pano, 8-12 sigorta, 8-10 armatür.
- Birim malzeme fiyatları 2026 piyasası: 1.5mm kablo ~12-18 TL/m, 2.5mm ~20-28 TL/m, anahtar+priz ~150-300 TL, buat ~25 TL, pano ~800-2000 TL, sigorta ~80-150 TL, LED armatür ~250-600 TL.
- Müşteri belirtilmemişse "Adsız Müşteri" kullan veya kısa sor; çoğu zaman create_quote'u SADECE customer_name ile yapabilirsin.
- Oluşturduktan sonra teklif numarası ve toplam tutarı (KDV dahil) söyle.

NOTEBOOKLM BİLGİ TABANI:
- "Hangi notebook'lar var" / "belgelerim neler" → list_documents.
- "X hakkında ne biliyorsun" / "şu belgede ne yazıyor" → search_knowledge.
- Belge başlığı verilirse search_knowledge'a document_title parametresini geç.
- Cevabını bilgi tabanından alırsan kaynak başlığını belirt.

VERİ SORGUSU:
- "Hangi müşteride en çok arıza var", istatistik, raporlama → query_data.

ŞU AN: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} (Türkiye saati).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  // YETKİ (denetim M7): service_role ile RLS bypass edip GERÇEK DB yazan bu ajan
  // yalnız onaylı admin/manager/engineer tarafından çağrılabilir. Anon key / kimliksiz
  // veya 'field'/'viewer' rolü reddedilir (client-side hasPermission bypass'ı kapanır).
  const auth = await requireUser(req, { roles: ['admin', 'manager', 'engineer'], requireApproved: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const userMessages = body.messages as Array<{ role: string; content: string }>;
    if (!Array.isArray(userMessages) || !userMessages.length) {
      throw new Error('messages boş.');
    }
    const maxIter = Math.min(Number(body.max_iterations) || 5, 10);

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...userMessages,
    ];

    const actions: Array<{ tool: string; args: any; result: any }> = [];
    let final: any = null;
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0 };

    for (let i = 0; i < maxIter; i++) {
      const resp = await callOpenAI(messages);
      const choice = resp.choices?.[0];
      if (resp.usage) {
        totalUsage.prompt_tokens += resp.usage.prompt_tokens ?? 0;
        totalUsage.completion_tokens += resp.usage.completion_tokens ?? 0;
      }
      const msg = choice?.message;
      if (!msg) throw new Error('OpenAI boş yanıt.');

      // Asistanın mesajını ekle
      messages.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || !toolCalls.length) {
        // Bitti
        final = msg;
        break;
      }

      // Tool'ları çalıştır
      for (const tc of toolCalls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* ignore */ }
        const result = await execTool(tc.function.name, args);
        actions.push({ tool: tc.function.name, args, result });
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!final) {
      // Tool döngüsü iter limitine takıldı; son bir özet iste
      messages.push({ role: 'user', content: '(Sistem: maks adıma ulaşıldı, lütfen şu ana kadar yapılanları özetle.)' });
      const resp = await callOpenAI(messages);
      final = resp.choices?.[0]?.message;
    }

    return new Response(JSON.stringify({
      answer: final?.content ?? '(boş)',
      actions,
      usage: totalUsage,
      model: MODEL,
    }), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
