// aiTelemetry — çekirdek AI çağrıları için GERÇEK gözlemlenebilirlik.
// chatWithFallback / chatWithToolsFallback / chatVision her çağrıda gerçek
// sağlayıcı, model, gecikme (ms) ve başarı durumunu buraya yazar; AI Kullanım
// Logları ekranı (ai_usage_v1) bunu gösterir. Telemetri ASLA ana akışı bozmaz
// (tüm hatalar yutulur, fire-and-forget kullanılır).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AiUsageLog, AiFeature, AiAssistantProvider } from '../types';

const KEY = 'ai_usage_v1';
const MAX = 200;

/** Çekirdek AI sağlayıcı kodunu (claude/openai/gemini/groq) log şemasına çevirir. */
function mapProvider(p?: string): AiAssistantProvider {
  switch (p) {
    case 'claude': case 'anthropic': return 'anthropic';
    case 'openai': return 'openai';
    case 'gemini': return 'gemini';
    default: return 'local';
  }
}

export interface AiCallTelemetry {
  feature: AiFeature;
  provider?: string;       // ham sağlayıcı kodu
  model?: string;
  promptChars?: number;    // ~token tahmini için
  replyChars?: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

/** Bir AI çağrısını kaydeder. Fire-and-forget: hata fırlatmaz, akışı bekletmez. */
export async function recordAiCall(e: AiCallTelemetry): Promise<void> {
  try {
    let list: AiUsageLog[] = [];
    try { const raw = await AsyncStorage.getItem(KEY); list = raw ? JSON.parse(raw) : []; } catch { list = []; }
    const pTok = Math.max(0, Math.round((e.promptChars ?? 0) / 4));
    const cTok = Math.max(0, Math.round((e.replyChars ?? 0) / 4));
    list.unshift({
      id: 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      feature: e.feature,
      provider: mapProvider(e.provider),
      promptTokens: pTok,
      completionTokens: cTok,
      costUsd: (pTok * 0.003 + cTok * 0.006) / 1000,
      durationMs: Math.max(0, Math.round(e.durationMs)),
      createdAt: new Date().toISOString(),
      success: e.success,
      errorMessage: e.errorMessage,
    });
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* telemetri ana akışı asla bozmaz */ }
}
