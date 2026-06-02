// supabase/functions/_shared/usageLog.ts
// AI çağrı istatistiklerini ai_usage_log tablosuna kaydetmek için yardımcı.
// Tüm AI edge fonksiyonlarından çağrılır. Hata fırlatmaz — log yazımı arka planda sessizce ilerler.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Yaklaşık fiyat tablosu (USD / 1K token) — referans, kesin fatura değil
const PRICE: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini':        { in: 0.00015, out: 0.0006 },
  'gpt-4o':             { in: 0.0025,  out: 0.01   },
  'gpt-4.1-mini':       { in: 0.0004,  out: 0.0016 },
  'gpt-4.1':            { in: 0.002,   out: 0.008  },
  'claude-3-5-sonnet':  { in: 0.003,   out: 0.015  },
  'claude-3-5-haiku':   { in: 0.0008,  out: 0.004  },
  'gemini-1.5-pro':     { in: 0.00125, out: 0.005  },
  'gemini-1.5-flash':   { in: 0.000075,out: 0.0003 },
  'gemini-2.5-flash':   { in: 0.000075,out: 0.0003 },
  'gemini-2.5-pro':     { in: 0.00125, out: 0.005  },
  'text-embedding-3-small': { in: 0.00002, out: 0 },
  'text-embedding-3-large': { in: 0.00013, out: 0 },
};

export interface UsageLogEntry {
  function_name: string;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  duration_ms?: number | null;
  status?: 'ok' | 'error';
  error_message?: string | null;
  user_id?: string | null;
  meta?: Record<string, any> | null;
}

function estimateCost(model: string | null | undefined, inT: number, outT: number): number {
  if (!model) return 0;
  // Tam eşleşme yoksa en uzun önekle eşleştir
  const key = Object.keys(PRICE).find((k) => model.startsWith(k));
  if (!key) return 0;
  const p = PRICE[key];
  return Number(((inT / 1000) * p.in + (outT / 1000) * p.out).toFixed(6));
}

/** Arka planda usage logu yaz — hata yutulur (telemetri uygulamayı bozmamalı). */
export function logUsage(entry: UsageLogEntry): void {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;

    const inT = entry.input_tokens ?? 0;
    const outT = entry.output_tokens ?? 0;
    const cost = estimateCost(entry.model, inT, outT);

    const client = createClient(url, key, { auth: { persistSession: false } });
    // Fire-and-forget
    client.from('ai_usage_log').insert({
      function_name: entry.function_name,
      model: entry.model ?? null,
      input_tokens: inT,
      output_tokens: outT,
      cost_usd: cost,
      duration_ms: entry.duration_ms ?? null,
      status: entry.status ?? 'ok',
      error_message: entry.error_message ?? null,
      user_id: entry.user_id ?? null,
      meta: entry.meta ?? null,
    }).then(() => {/* ok */}).catch(() => {/* ignore */});
  } catch {
    /* ignore */
  }
}

/** Authorization header'dan user id'yi (JWT sub) çıkar. */
export function userIdFromAuth(req: Request): string | null {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!auth) return null;
    const token = auth.replace(/^Bearer\s+/i, '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub ?? null;
  } catch { return null; }
}
