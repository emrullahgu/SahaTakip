// supabase/functions/ai-voice/index.ts
// Ses notu → Whisper transkripsiyon → AI özet + aksiyon önerisi.
//
// Body:
//   { audio_base64: string, mime?: string, filename?: string,
//     language?: 'tr'|'en'|'auto', context?: string,
//     summarize?: boolean (default true) }
// Resp:
//   { transcript, language, duration, summary?, action_items?, sentiment?, model }
//
// Env: OPENAI_API_KEY

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;
const WHISPER_MODEL = 'whisper-1';
const SUMMARY_MODEL = 'gpt-4o-mini';

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  try {
    const body = await req.json();
    if (!body.audio_base64) throw new Error('audio_base64 zorunlu.');
    const mime = String(body.mime ?? 'audio/m4a');
    const filename = String(body.filename ?? `voice.${mime.split('/')[1] ?? 'm4a'}`);
    const language = body.language && body.language !== 'auto' ? String(body.language) : undefined;
    const context = String(body.context ?? '');
    const wantSummary = body.summarize !== false;

    // 1) Whisper transkripsiyon
    const bytes = b64ToBytes(body.audio_base64);
    const blob = new Blob([bytes], { type: mime });
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('model', WHISPER_MODEL);
    fd.append('response_format', 'verbose_json');
    if (language) fd.append('language', language);
    if (context) fd.append('prompt', context);

    const wr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { authorization: `Bearer ${OPENAI_KEY}` },
      body: fd,
    });
    if (!wr.ok) throw new Error(`Whisper ${wr.status}: ${await wr.text()}`);
    const wj: any = await wr.json();
    const transcript: string = wj.text ?? '';
    const detectedLang: string = wj.language ?? language ?? 'tr';
    const duration: number = wj.duration ?? 0;

    if (!wantSummary || !transcript.trim()) {
      return new Response(JSON.stringify({
        transcript, language: detectedLang, duration, model: WHISPER_MODEL,
      }), { headers: { ...CORS, 'content-type': 'application/json' } });
    }

    // 2) Özet + aksiyon
    const sysPrompt = `Sen Türkçe saha operasyonu için ses notu özetleyicisin. Sahadan gelen ses kayıtlarını özetler, eylem maddeleri ve duygu durumu çıkarırsın. SADECE şu JSON şemasını döndür:
{
  "summary": "1-3 cümle Türkçe özet",
  "action_items": ["yapılacak iş 1", "yapılacak iş 2"],
  "sentiment": "olumlu|nötr|olumsuz",
  "key_entities": { "customers": [], "products": [], "dates": [], "amounts": [] }
}`;

    const userPrompt = `${context ? `Bağlam: ${context}\n\n` : ''}Transkript:\n"""${transcript}"""`;

    const cr = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    if (!cr.ok) throw new Error(`Özet ${cr.status}: ${await cr.text()}`);
    const cj: any = await cr.json();
    let parsed: any = {};
    try { parsed = JSON.parse(cj.choices?.[0]?.message?.content ?? '{}'); } catch { parsed = {}; }

    return new Response(JSON.stringify({
      transcript,
      language: detectedLang,
      duration,
      summary: parsed.summary ?? '',
      action_items: parsed.action_items ?? [],
      sentiment: parsed.sentiment ?? 'nötr',
      key_entities: parsed.key_entities ?? {},
      model: `${WHISPER_MODEL}+${SUMMARY_MODEL}`,
      usage: cj.usage,
    }), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
