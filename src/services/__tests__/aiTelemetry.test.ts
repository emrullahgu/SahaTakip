// aiTelemetry — gerçek AI gözlemlenebilirliği + listUsageLogs bug regresyonu.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordAiCall } from '../aiTelemetry';
import { listUsageLogs } from '../aiAssistant';

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
