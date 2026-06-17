// supabase/functions/ai-route/index.ts
// AI Rota Optimizasyonu — Önceliği, zaman penceresini, hizmet süresini ve trafiği
// göz önüne alarak günün ziyaretlerini sıralar.
//
// Body:
//   {
//     stops: [{ id, label, lat, lng, priority?: 'low'|'medium'|'high'|'urgent',
//                time_window?: { start: 'HH:mm', end: 'HH:mm' },
//                service_minutes?: number, customer?: string }],
//     start?: { lat, lng, label?: string },
//     departure_time?: 'HH:mm',  // varsayılan 08:00
//     constraints?: string        // serbest metin (ör. "öğle 12:30-13:30 mola")
//   }
// Resp:
//   { order: [{ stop_id, eta, leave_at, distance_km_from_prev, notes }],
//     total_km, total_minutes, reasoning, model }
//
// Env: OPENAI_API_KEY

import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;
const MODEL = 'gpt-4o-mini';

// Haversine — km
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  // GÜVENLİK: kimliksiz/anon çağrı reddedilir — paralı OpenAI çağrısı maliyet
  // suistimaline açıktı (ai-vision/ai-sql/ai-proxy ile aynı kalıp).
  const auth = await requireUser(req, { requireApproved: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...CORS, 'content-type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const stops: any[] = Array.isArray(body.stops) ? body.stops : [];
    if (stops.length < 2) throw new Error('En az 2 durak gerekli.');
    const start = body.start ?? { lat: stops[0].lat, lng: stops[0].lng, label: stops[0].label };
    const departure = String(body.departure_time ?? '08:00');
    const constraints: string = String(body.constraints ?? '');

    // ön-hesap: durak-durak mesafe matrisi (km)
    const all = [start, ...stops];
    const N = all.length;
    const matrix: number[][] = [];
    for (let i = 0; i < N; i++) {
      const row: number[] = [];
      for (let j = 0; j < N; j++) row.push(i === j ? 0 : Number(distKm(all[i] as any, all[j] as any).toFixed(2)));
      matrix.push(row);
    }

    const prompt = `Sen Türkiye'de saha operasyonu için günlük ziyaret rotası optimize eden bir uzmansın.

GİRDİ:
- Başlangıç (depo/ofis): ${JSON.stringify(start)}
- Hareket saati: ${departure}
- Kısıtlar: ${constraints || '—'}
- Duraklar (ID, etiket, koordinat, öncelik, zaman penceresi, hizmet süresi):
${stops.map((s, i) => `  [${i + 1}] id=${s.id} | ${s.label ?? s.customer ?? ''} | (${s.lat}, ${s.lng}) | öncelik=${s.priority ?? 'medium'} | zaman=${s.time_window ? `${s.time_window.start}-${s.time_window.end}` : 'esnek'} | süre=${s.service_minutes ?? 30}dk`).join('\n')}

Mesafe matrisi (km, 0=başlangıç):
${matrix.map((r, i) => `${i}: [${r.join(', ')}]`).join('\n')}

KURALLAR:
- 'urgent' öncelikli duraklar mümkünse sabah erken
- Zaman penceresi olanlar penceresine sığsın
- Toplam km ve toplam süreyi minimize et
- Trafiği hesaba kat: Türkiye şehir içi ortalama 25 km/saat varsay
- Her durakta 'service_minutes' kadar duraksama yap (yoksa 30 dk)
- Öğlen 12:30-13:30 mola (kısıtlarda aksini söylemediyse)

ÇIKTI: SADECE şu JSON şemasıyla yanıt ver:
{
  "order": [
    {
      "stop_id": "...",
      "eta": "HH:mm",
      "leave_at": "HH:mm",
      "distance_km_from_prev": 0,
      "notes": "kısa açıklama"
    }
  ],
  "total_km": 0,
  "total_minutes": 0,
  "reasoning": "Neden bu sıralama tercih edildi (1-2 cümle, Türkçe)."
}`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    const j: any = await r.json();
    const raw = j.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { parse_error: true, raw }; }

    // Sanity: sıraladığı tüm stop_id'ler gerçekten var mı?
    if (Array.isArray(parsed.order)) {
      const validIds = new Set(stops.map(s => String(s.id)));
      parsed.order = parsed.order.filter((o: any) => validIds.has(String(o.stop_id)));
    }

    return new Response(JSON.stringify({
      ...parsed,
      model: MODEL,
      usage: j.usage,
    }), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
