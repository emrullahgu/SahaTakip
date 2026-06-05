// aiTelemetry — gerçek AI gözlemlenebilirliği + listUsageLogs bug regresyonu.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordAiCall } from '../aiTelemetry';
import { listUsageLogs, computeAiUsageStats } from '../aiAssistant';
import type { AiUsageLog } from '../../types';

beforeEach(async () => { try { await AsyncStorage.clear(); } catch { /* noop */ } });

describe('aiTelemetry.recordAiCall + listUsageLogs entegrasyonu', () => {
  it('kaydedilen çağrı listUsageLogs ile GERİ OKUNUR (eski bug: hep boş dönüyordu)', async () => {
    await recordAiCall({ feature: 'chat', provider: 'openai', model: 'gpt-4o-mini', promptChars: 400, replyChars: 200, durationMs: 1234, success: true });
    const logs = await listUsageLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].feature).toBe('chat');
    expect(logs[0].provider).toBe('openai');
    expect(logs[0].durationMs).toBe(1234);   // GERÇEK gecikme (eski kod random uyduruyordu)
    expect(logs[0].success).toBe(true);
    expect(logs[0].promptTokens).toBe(100);  // 400 char / 4
    expect(logs[0].completionTokens).toBe(50);
  });

  it('sağlayıcı eşlemesi: claude→anthropic, groq→local', async () => {
    await recordAiCall({ feature: 'agent', provider: 'claude', durationMs: 100, success: true });
    await recordAiCall({ feature: 'agent', provider: 'groq', durationMs: 100, success: true });
    const logs = await listUsageLogs();
    expect(logs[0].provider).toBe('local');     // groq (en son, unshift)
    expect(logs[1].provider).toBe('anthropic'); // claude
  });

  it('başarısız çağrı errorMessage ile kaydedilir', async () => {
    await recordAiCall({ feature: 'vision', provider: 'gemini', durationMs: 50, success: false, errorMessage: 'HTTP 503' });
    const logs = await listUsageLogs();
    expect(logs[0].success).toBe(false);
    expect(logs[0].errorMessage).toBe('HTTP 503');
    expect(logs[0].feature).toBe('vision');
  });

  it('en fazla 200 kayıt tutulur (ring buffer)', async () => {
    for (let i = 0; i < 205; i++) await recordAiCall({ feature: 'chat', provider: 'openai', durationMs: i, success: true });
    const logs = await listUsageLogs();
    expect(logs.length).toBe(200);
  });

  it('telemetri ana akışı bozmaz (hata fırlatmaz)', async () => {
    await expect(recordAiCall({ feature: 'chat', durationMs: 0, success: true })).resolves.toBeUndefined();
  });
});

describe('computeAiUsageStats — AI sağlık özeti', () => {
  const mk = (over: Partial<AiUsageLog>): AiUsageLog => ({
    id: Math.random().toString(36).slice(2), feature: 'chat', provider: 'openai',
    promptTokens: 10, completionTokens: 10, costUsd: 0, durationMs: 1000,
    createdAt: '2026-01-01T00:00:00Z', success: true, ...over,
  });

  it('boş logda güvenli sıfırlar', () => {
    const s = computeAiUsageStats([]);
    expect(s).toEqual({ total: 0, successRate: 0, failures: 0, avgMs: 0, byProvider: [], byFeature: [] });
  });

  it('başarı oranı + ortalama gecikme + hata sayısı doğru', () => {
    const s = computeAiUsageStats([
      mk({ success: true, durationMs: 1000 }),
      mk({ success: true, durationMs: 2000 }),
      mk({ success: false, durationMs: 3000, errorMessage: 'x' }),
    ]);
    expect(s.total).toBe(3);
    expect(s.failures).toBe(1);
    expect(s.successRate).toBe(67);   // 2/3
    expect(s.avgMs).toBe(2000);       // (1000+2000+3000)/3
  });

  it('sağlayıcı/özellik dağılımı çoktan aza sıralı', () => {
    const s = computeAiUsageStats([
      mk({ provider: 'openai', feature: 'chat' }),
      mk({ provider: 'openai', feature: 'agent' }),
      mk({ provider: 'gemini', feature: 'vision' }),
    ]);
    expect(s.byProvider[0]).toEqual({ provider: 'openai', count: 2 });
    expect(s.byProvider[1]).toEqual({ provider: 'gemini', count: 1 });
    expect(s.byFeature[0].count).toBe(1); // hepsi farklı feature
  });
});
