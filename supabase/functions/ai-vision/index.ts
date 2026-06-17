// supabase/functions/ai-vision/index.ts
// GPT-4o Vision — fotoğraftan yapılandırılmış veri çıkarır.
//
// Body: { image: <data URL veya https URL>, mode?: 'invoice'|'business_card'|'product_label'|'meter'|'plate'|'free', hint?: string }
// Resp: { mode, data, raw, usage, latency_ms }
//
// Env: OPENAI_API_KEY

import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;
const MODEL = 'gpt-4o-mini'; // vision destekli, ucuz

type Mode = 'invoice' | 'business_card' | 'product_label' | 'meter' | 'plate' | 'free';

const PROMPTS: Record<Mode, { system: string; schema: string }> = {
  invoice: {
    system: 'Sen bir Türk fatura okuma asistanısın. Resimden fatura bilgilerini çıkar.',
    schema: `{
  "type": "invoice",
  "invoice_no": "string|null",
  "date": "YYYY-MM-DD|null",
  "vendor_name": "string|null",
  "vendor_tax_no": "string|null",
  "buyer_name": "string|null",
  "buyer_tax_no": "string|null",
  "subtotal": "number|null",
  "vat_total": "number|null",
  "grand_total": "number|null",
  "currency": "TRY|USD|EUR|null",
  "lines": [
    { "description": "string", "quantity": "number|null", "unit_price": "number|null", "total": "number|null" }
  ]
}`,
  },
  business_card: {
    system: 'Sen bir kartvizit OCR asistanısın. Resimden iletişim bilgilerini çıkar.',
    schema: `{
  "type": "business_card",
  "full_name": "string|null",
  "title": "string|null",
  "company": "string|null",
  "phone": "string|null",
  "mobile": "string|null",
  "email": "string|null",
  "website": "string|null",
  "address": "string|null"
}`,
  },
  product_label: {
    system: 'Sen bir ürün etiketi OCR asistanısın. Resimden ürün bilgilerini çıkar.',
    schema: `{
  "type": "product_label",
  "name": "string|null",
  "code": "string|null",
  "barcode": "string|null",
  "brand": "string|null",
  "model": "string|null",
  "spec": "string|null",
  "unit": "string|null"
}`,
  },
  meter: {
    system: 'Sen bir sayaç okuma asistanısın. Elektrik/su/gaz sayacı resminden değer ve seri no çıkar.',
    schema: `{
  "type": "meter",
  "value": "number|null",
  "unit": "kWh|m3|null",
  "serial_no": "string|null",
  "tarif": "string|null"
}`,
  },
  plate: {
    system: 'Sen bir araç plaka okuma asistanısın.',
    schema: `{
  "type": "plate",
  "plate": "string|null",
  "country": "TR|null"
}`,
  },
  free: {
    system: 'Resmi serbest biçimde analiz et. Türkçe yanıt ver.',
    schema: `{
  "type": "free",
  "description": "string",
  "key_values": { "alan": "değer" }
}`,
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  // GÜVENLİK: paralı OpenAI Vision çağırır → kimliksiz/anon çağrı maliyet suistimaline
  // açıktı. Onaylı kullanıcı şart (rol fark etmez; saha kullanıcısı da foto okutur).
  const auth = await requireUser(req, { requireApproved: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  try {
    const t0 = Date.now();
    const body = await req.json();
    const image: string = body.image;
    const mode = (body.mode ?? 'free') as Mode;
    const hint: string = body.hint ?? '';

    if (!image) throw new Error('image (data URL veya https URL) gerekli.');
    if (!PROMPTS[mode]) throw new Error(`Bilinmeyen mode: ${mode}`);

    const p = PROMPTS[mode];
    const userText = `Aşağıdaki resimden bilgileri çıkar ve TAM olarak şu JSON şemasına uyarak yanıt ver:

${p.schema}

Kurallar:
- Bilinmeyen alan için null kullan.
- Para birimleri için sadece sayı (1234.56), TL/₺/$ gibi sembol koyma.
- Tarih ISO formatında (YYYY-MM-DD).
- SADECE JSON döndür, başka metin yazma.
${hint ? '\nEk ipucu: ' + hint : ''}`;

    const messages = [
      { role: 'system', content: p.system },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: image } },
        ],
      },
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 1500,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    const j: any = await r.json();
    const raw = j.choices?.[0]?.message?.content ?? '{}';

    let data: any = {};
    try { data = JSON.parse(raw); } catch { data = { type: mode, parse_error: true, raw }; }

    return new Response(JSON.stringify({
      mode,
      data,
      raw,
      usage: j.usage,
      latency_ms: Date.now() - t0,
      model: MODEL,
    }), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
