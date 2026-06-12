// supabase/functions/ai-proxy/index.ts
// Çoklu sağlayıcı (OpenAI, Anthropic Claude, Google Gemini) için tek istek arayüzü.
//
// Body:
//   {
//     "provider": "auto" | "openai" | "claude" | "gemini",
//     "model"?: string,
//     "messages": [{role:'system'|'user'|'assistant', content:string}],
//     "temperature"?: number,
//     "max_tokens"?: number,
//     "stream"?: false  // streaming şu an kapalı (mobil basit tutuldu)
//   }
//
// Yanıt:
//   { provider, model, content, usage?: {input_tokens,output_tokens}, latency_ms }
//
// Env:
//   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
//   AI_DEFAULT_PROVIDER (opsiyonel: 'openai'|'claude'|'gemini')
//
// Deploy:
//   supabase functions deploy ai-proxy

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
type Provider = 'openai' | 'claude' | 'gemini';

interface ReqBody {
  provider?: Provider | 'auto';
  model?: string;
  messages: Msg[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface AiResult {
  provider: Provider;
  model: string;
  content: string;
  usage?: { input_tokens: number; output_tokens: number };
  latency_ms: number;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  claude: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-2.5-flash',
};

function pickAuto(): Provider {
  const pref = (Deno.env.get('AI_DEFAULT_PROVIDER') as Provider | undefined);
  if (pref && Deno.env.get(envKeyName(pref))) return pref;
  if (Deno.env.get('OPENAI_API_KEY')) return 'openai';
  if (Deno.env.get('ANTHROPIC_API_KEY')) return 'claude';
  if (Deno.env.get('GEMINI_API_KEY')) return 'gemini';
  throw new Error('Hiçbir AI sağlayıcı anahtarı tanımlı değil.');
}

function envKeyName(p: Provider): string {
  return p === 'openai' ? 'OPENAI_API_KEY' : p === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY';
}

async function callOpenAI(body: ReqBody, model: string): Promise<AiResult> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY tanımsız.');
  const t0 = Date.now();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: body.messages,
      temperature: body.temperature ?? 0.4,
      max_tokens: body.max_tokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const j: any = await res.json();
  return {
    provider: 'openai',
    model,
    content: j.choices?.[0]?.message?.content ?? '',
    usage: j.usage ? { input_tokens: j.usage.prompt_tokens, output_tokens: j.usage.completion_tokens } : undefined,
    latency_ms: Date.now() - t0,
  };
}

async function callClaude(body: ReqBody, model: string): Promise<AiResult> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY tanımsız.');
  const system = body.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const msgs = body.messages.filter(m => m.role !== 'system');
  const t0 = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: system || undefined,
      messages: msgs.map(m => ({ role: m.role, content: m.content })),
      temperature: body.temperature ?? 0.4,
      max_tokens: body.max_tokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const j: any = await res.json();
  const content = (j.content ?? []).map((c: any) => c.text ?? '').join('');
  return {
    provider: 'claude',
    model,
    content,
    usage: j.usage ? { input_tokens: j.usage.input_tokens, output_tokens: j.usage.output_tokens } : undefined,
    latency_ms: Date.now() - t0,
  };
}

async function callGemini(body: ReqBody, model: string): Promise<AiResult> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY tanımsız.');
  // Gemini sistem mesajını ayrı alır
  const system = body.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const contents = body.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  const t0 = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: {
          temperature: body.temperature ?? 0.4,
          maxOutputTokens: body.max_tokens ?? 1024,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const j: any = await res.json();
  const content = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  return {
    provider: 'gemini',
    model,
    content,
    usage: j.usageMetadata
      ? { input_tokens: j.usageMetadata.promptTokenCount ?? 0, output_tokens: j.usageMetadata.candidatesTokenCount ?? 0 }
      : undefined,
    latency_ms: Date.now() - t0,
  };
}

async function dispatch(body: ReqBody): Promise<AiResult> {
  const provider: Provider = !body.provider || body.provider === 'auto' ? pickAuto() : body.provider;
  const model = body.model || DEFAULT_MODELS[provider];
  if (provider === 'openai') return callOpenAI(body, model);
  if (provider === 'claude') return callClaude(body, model);
  if (provider === 'gemini') return callGemini(body, model);
  throw new Error(`Bilinmeyen provider: ${provider}`);
}

import { logUsage, userIdFromAuth } from '../_shared/usageLog.ts';
import { requireUser } from '../_shared/auth.ts';

/**
 * OpenAI Chat Completions stream'ini olduğu gibi (SSE) proxy'ler.
 * İstemci satır satır `data: {...}\n\n` chunk'ları okur, son `data: [DONE]` ile biter.
 * Tüm içerik biriktirilip usage log'a yazılır.
 */
async function streamOpenAI(body: ReqBody, model: string, userId: string | null): Promise<Response> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY tanımsız.');
  const t0 = Date.now();
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: body.messages,
      temperature: body.temperature ?? 0.4,
      max_tokens: body.max_tokens ?? 1024,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!upstream.ok || !upstream.body) {
    throw new Error(`OpenAI ${upstream.status}: ${await upstream.text()}`);
  }

  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE event'leri \n\n ile ayrılır
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const ev of events) {
            const line = ev.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') fullContent += delta;
              if (json.usage) {
                inputTokens = json.usage.prompt_tokens ?? 0;
                outputTokens = json.usage.completion_tokens ?? 0;
              }
              // İstemciye yeniden ilet
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            } catch {
              // Parse hatasında ham satırı geç
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
      } finally {
        controller.close();
        logUsage({
          function_name: 'ai-proxy',
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          duration_ms: Date.now() - t0,
          status: 'ok',
          user_id: userId,
          meta: { provider: 'openai', stream: true, chars: fullContent.length },
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });
  // Kimlik: anonim çağrı reddedilir — önceden kimliksiz herkes LLM API'larına
  // (faturalı) sınırsız istek atıp maliyet şişirebiliyordu.
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...CORS, 'content-type': 'application/json' } });
  const t0 = Date.now();
  const userId = userIdFromAuth(req);
  try {
    const body: ReqBody = await req.json();
    if (!body.messages?.length) throw new Error('messages boş olamaz');

    // Streaming sadece OpenAI üzerinden destekleniyor (en yaygın).
    if (body.stream) {
      const model = body.model || DEFAULT_MODELS.openai;
      return await streamOpenAI(body, model, userId);
    }

    // Otomatik fallback: provider'ı tek tek dene
    const order: (Provider | 'auto')[] = body.provider && body.provider !== 'auto'
      ? [body.provider]
      : ['openai', 'claude', 'gemini'];

    let lastErr: any = null;
    for (const p of order) {
      try {
        const result: any = await dispatch({ ...body, provider: p as Provider });
        logUsage({
          function_name: 'ai-proxy',
          model: result?.model ?? null,
          input_tokens: result?.usage?.input_tokens ?? 0,
          output_tokens: result?.usage?.output_tokens ?? 0,
          duration_ms: Date.now() - t0,
          status: 'ok',
          user_id: userId,
          meta: { provider: result?.provider ?? p },
        });
        return new Response(JSON.stringify(result), {
          headers: { ...CORS, 'content-type': 'application/json' },
        });
      } catch (e) {
        lastErr = e;
        // sağlayıcı anahtarı yoksa veya hata varsa diğerine geç
        continue;
      }
    }
    throw lastErr ?? new Error('Tüm sağlayıcılar başarısız.');
  } catch (e: any) {
    logUsage({
      function_name: 'ai-proxy',
      duration_ms: Date.now() - t0,
      status: 'error',
      error_message: String(e?.message ?? e).slice(0, 500),
      user_id: userId,
    });
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
