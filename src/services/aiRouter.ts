// src/services/aiRouter.ts
// Edge function 'ai-proxy' ve 'ai-rag' için ince mobil istemci.
// Tüm anahtarlar Supabase tarafında — mobilde sadece JWT (anon) kullanılır.

import { supabase, SUPABASE_CONFIGURED } from './supabase';

export type AiProviderId = 'auto' | 'openai' | 'claude' | 'gemini';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResult {
  provider: 'openai' | 'claude' | 'gemini';
  model: string;
  content: string;
  usage?: { input_tokens: number; output_tokens: number };
  latency_ms: number;
}

export interface RagSource {
  index: number;
  document_id: string;
  title: string;
  source: string;
  similarity: number;
  excerpt: string;
}

export interface RagResult {
  answer: string;
  provider: string;
  model: string;
  sources: RagSource[];
}

function ensureReady(): void {
  if (!SUPABASE_CONFIGURED) {
    throw new Error('Supabase yapılandırılmamış — AI çağrıları kullanılamıyor.');
  }
}

/**
 * AI çağrısını timeout + retry ile sar. 5xx ve network hatalarında tekrar dener;
 * 4xx (validation/auth) hatalarında anında throw eder.
 */
async function withRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  opts: { name: string; timeoutMs?: number; maxAttempts?: number } = { name: 'ai' },
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const maxAttempts = opts.maxAttempts ?? 3;
  let lastErr: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<{ data: null; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error(`${opts.name} zaman aşımı (${timeoutMs / 1000}s).`)), timeoutMs),
        ),
      ]);
      if (result.error) {
        const status = result.error?.context?.status ?? result.error?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw result.error;
        }
        lastErr = result.error;
      } else {
        if (!result.data) throw new Error(`${opts.name}: boş yanıt.`);
        return result.data;
      }
    } catch (e: any) {
      lastErr = e;
      if (e?.context?.status && e.context.status >= 400 && e.context.status < 500 && e.context.status !== 429) {
        throw e;
      }
    }
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1))); // 500ms, 1s, 2s
    }
  }
  throw lastErr ?? new Error(`${opts.name}: tüm denemeler başarısız.`);
}

/** Çoklu sağlayıcı chat. */
export async function aiChat(opts: {
  messages: AiMessage[];
  provider?: AiProviderId;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<AiResult> {
  ensureReady();
  return withRetry<AiResult>(
    () => supabase.functions.invoke<AiResult>('ai-proxy', {
      body: {
        provider: opts.provider ?? 'auto',
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature,
        max_tokens: opts.max_tokens,
      },
    }),
    { name: 'ai-proxy', timeoutMs: 60_000 },
  );
}

/**
 * Streaming chat (sadece OpenAI). onToken her yeni delta için çağrılır.
 * Tam yanıt resolve olur. AbortController.signal ile iptal edilebilir.
 */
export async function aiChatStream(opts: {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  onToken: (delta: string, fullSoFar: string) => void;
  signal?: AbortSignal;
}): Promise<{ content: string; model: string }> {
  ensureReady();
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes?.session?.access_token || key;

  const res = await fetch(`${base}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      apikey: key,
    },
    body: JSON.stringify({
      provider: 'openai',
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      stream: true,
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ai-proxy stream ${res.status}: ${errText || 'akış açılamadı'}`);
  }

  const reader = (res.body as any).getReader?.();
  if (!reader) throw new Error('Bu ortamda stream desteklenmiyor (fetch.body.getReader yok).');

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let model = opts.model ?? 'gpt-4o-mini';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        if (json.model) model = json.model;
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length) {
          full += delta;
          opts.onToken(delta, full);
        }
      } catch { /* parse hatası — atla */ }
    }
  }
  return { content: full, model };
}

/** NotebookLM-tarzı sorgu: kaynak chunks + AI yanıtı. */
export async function aiRagQuery(opts: {
  question: string;
  top_k?: number;
  provider?: AiProviderId;
}): Promise<RagResult> {
  ensureReady();
  return withRetry<RagResult>(
    () => supabase.functions.invoke<RagResult>('ai-rag', {
      body: {
        action: 'query',
        question: opts.question,
        top_k: opts.top_k ?? 6,
        provider: opts.provider ?? 'auto',
      },
    }),
    { name: 'ai-rag query', timeoutMs: 60_000 },
  );
}

/** Belge ekle / embed. */
export async function aiRagIngest(documents: Array<{
  title: string;
  source?: string;
  source_id?: string;
  content: string;
  meta?: Record<string, any>;
}>): Promise<{ ok: boolean; ingested: Array<{ id: string; chunks: number }> }> {
  ensureReady();
  const { data, error } = await supabase.functions.invoke('ai-rag', {
    body: { action: 'ingest', documents },
  });
  if (error) throw error;
  return data as any;
}

/** Bir belgeyi RAG'dan sil. */
export async function aiRagDelete(document_id: string): Promise<void> {
  ensureReady();
  const { error } = await supabase.functions.invoke('ai-rag', {
    body: { action: 'delete', document_id },
  });
  if (error) throw error;
}

export interface RagDocument {
  id: string;
  title: string;
  source: string;
  source_id: string | null;
  created_at: string;
  meta: Record<string, any>;
  chunk_count: number;
}

/** RAG'daki belgeleri listele. */
export async function aiRagList(limit = 100): Promise<RagDocument[]> {
  ensureReady();
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; documents: RagDocument[] }>('ai-rag', {
    body: { action: 'list', limit },
  });
  if (error) throw error;
  return data?.documents ?? [];
}

export interface AgentAction {
  tool: string;
  args: Record<string, any>;
  result: any;
}

export interface AgentResult {
  answer: string;
  actions: AgentAction[];
  usage?: { prompt_tokens: number; completion_tokens: number };
  model: string;
}

/** Function-calling AI Agent — DB'de gerçek aksiyon yapar (iş emri oluştur, müşteri ekle vs.). */
export async function aiAgent(opts: {
  messages: AiMessage[];
  max_iterations?: number;
}): Promise<AgentResult> {
  ensureReady();
  return withRetry<AgentResult>(
    () => supabase.functions.invoke<AgentResult>('ai-tools', {
      body: { messages: opts.messages, max_iterations: opts.max_iterations ?? 5 },
    }),
    { name: 'ai-tools', timeoutMs: 90_000, maxAttempts: 2 },
  );
}

export type VisionMode = 'invoice' | 'business_card' | 'product_label' | 'meter' | 'plate' | 'free';

export interface VisionResult {
  mode: VisionMode;
  data: any;
  raw: string;
  usage?: any;
  latency_ms: number;
  model: string;
}

/** GPT-4o Vision ile fotoğraftan yapılandırılmış veri çıkar. image: data URL ya da https URL. */
export async function aiVision(opts: {
  image: string;
  mode?: VisionMode;
  hint?: string;
}): Promise<VisionResult> {
  ensureReady();
  if (!opts.image) throw new Error('Görsel gerekli.');
  return withRetry<VisionResult>(
    () => supabase.functions.invoke<VisionResult>('ai-vision', {
      body: { image: opts.image, mode: opts.mode ?? 'free', hint: opts.hint },
    }),
    { name: 'ai-vision', timeoutMs: 60_000 },
  );
}

export interface SqlResult {
  question: string;
  sql: string;
  rows: any[];
  row_count: number;
  summary: string;
  latency_ms: number;
  model: string;
}

/** Doğal dil → SQL → sonuç + Türkçe özet. */
export async function aiSql(opts: {
  question: string;
  max_rows?: number;
}): Promise<SqlResult> {
  ensureReady();
  const { data, error } = await supabase.functions.invoke<SqlResult>('ai-sql', {
    body: { question: opts.question, max_rows: opts.max_rows ?? 100 },
  });
  if (error) throw error;
  if (!data) throw new Error('ai-sql boş yanıt.');
  return data;
}

export interface RouteStopInput {
  id: string;
  label?: string;
  lat: number;
  lng: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  time_window?: { start: string; end: string };
  service_minutes?: number;
  customer?: string;
}

export interface AiRouteResult {
  order: Array<{
    stop_id: string;
    eta: string;
    leave_at: string;
    distance_km_from_prev: number;
    notes?: string;
  }>;
  total_km: number;
  total_minutes: number;
  reasoning: string;
  model: string;
}

/** AI ile rota optimizasyonu (öncelik, zaman penceresi, trafik dahil). */
export async function aiOptimizeRoute(opts: {
  stops: RouteStopInput[];
  start?: { lat: number; lng: number; label?: string };
  departure_time?: string;
  constraints?: string;
}): Promise<AiRouteResult> {
  ensureReady();
  const { data, error } = await supabase.functions.invoke<AiRouteResult>('ai-route', {
    body: opts,
  });
  if (error) throw error;
  if (!data) throw new Error('ai-route boş yanıt.');
  return data;
}

export interface RagWorkerStatus {
  pending: number;
  failed: number;
  processed_24h: number;
}

export interface RagWorkerRunResult {
  processed: number;
  ok: number;
  failed: number;
  errors?: Array<{ id: number; error: string }>;
}

/** Kuyruk durumunu getir (pending / failed / processed_24h). */
export async function aiRagQueueStatus(): Promise<RagWorkerStatus> {
  ensureReady();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [pending, failed, processed] = await Promise.all([
    supabase.from('ai_ingest_queue').select('id', { count: 'exact', head: true }).is('processed_at', null).lt('attempts', 5),
    supabase.from('ai_ingest_queue').select('id', { count: 'exact', head: true }).gte('attempts', 5).is('processed_at', null),
    supabase.from('ai_ingest_queue').select('id', { count: 'exact', head: true }).gte('processed_at', since),
  ]);

  return {
    pending: pending.count ?? 0,
    failed: failed.count ?? 0,
    processed_24h: processed.count ?? 0,
  };
}

/** Worker'ı manuel tetikle — bekleyen kayıtları işler. */
export async function aiRagWorkerRun(batchSize = 25): Promise<RagWorkerRunResult> {
  ensureReady();
  const { data, error } = await supabase.functions.invoke<RagWorkerRunResult>('ai-rag-worker', {
    body: { batch_size: batchSize },
  });
  if (error) throw error;
  if (!data) throw new Error('ai-rag-worker boş yanıt.');
  return data;
}

export interface VoiceResult {
  transcript: string;
  language: string;
  duration: number;
  summary?: string;
  action_items?: string[];
  sentiment?: 'olumlu' | 'nötr' | 'olumsuz';
  key_entities?: {
    customers?: string[];
    products?: string[];
    dates?: string[];
    amounts?: string[];
  };
  model: string;
}

/** Ses dosyası → Whisper → özet + aksiyon. */
export async function aiVoice(opts: {
  audio_base64: string;
  mime?: string;
  filename?: string;
  language?: 'tr' | 'en' | 'auto';
  context?: string;
  summarize?: boolean;
}): Promise<VoiceResult> {
  ensureReady();
  const { data, error } = await supabase.functions.invoke<VoiceResult>('ai-voice', {
    body: opts,
  });
  if (error) throw error;
  if (!data) throw new Error('ai-voice boş yanıt.');
  return data;
}

export interface InsightsKpis {
  period_days: number;
  work_orders_new: number;
  work_orders_completed: number;
  work_orders_completed_prev: number;
  completion_trend_pct: number;
  customers_new: number;
  customers_total: number;
  sales_visits_new: number;
  quotes_new: number;
  urgent_open: number;
  top_clients: Array<{ key: string; count: number }>;
  top_services: Array<{ key: string; count: number }>;
  top_statuses: Array<{ key: string; count: number }>;
}

export interface InsightsResult {
  report: { subject: string; markdown: string; gchat_text: string; html: string };
  kpis: InsightsKpis;
  email_sent?: { ok: boolean; response: any } | null;
  gchat_sent?: { ok: boolean; response: any } | null;
  dry_run: boolean;
  model: string;
}

/** Haftalık AI Insights raporu üret (+ opsiyonel gönder). */
export async function aiInsights(opts?: {
  days?: number;
  to_email?: string | string[];
  send_email?: boolean;
  send_gchat?: boolean;
  dry_run?: boolean;
}): Promise<InsightsResult> {
  ensureReady();
  const { data, error } = await supabase.functions.invoke<InsightsResult>('ai-insights', {
    body: opts ?? {},
  });
  if (error) throw error;
  if (!data) throw new Error('ai-insights boş yanıt.');
  return data;
}
