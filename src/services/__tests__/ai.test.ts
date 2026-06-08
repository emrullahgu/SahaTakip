// src/services/__tests__/ai.test.ts
// AI Service unit tests covering chat, fallback mechanisms, auto-promotion and POZ suggestions.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAiSettings, setAiSettings, clearAiSettingsCache, chat, chatWithFallback, suggestPozFromDescription,
  chatVision, analyzePhoto, guessImageMime, isVisionCapable,
  chatWithTools, chatWithToolsFallback, sanitizeGeminiSchema, toGeminiTools, toGeminiContents, parseGeminiToolResponse,
  toClaudeTools, toClaudeMessages, parseClaudeToolResponse, fetchWithTimeout,
  normalizeClaudeModel,
  shouldUseProxy, PROXY_SENTINEL,
  type ChatMessage, type ToolSchema,
} from '../ai';

describe('normalizeClaudeModel', () => {
  it('güncel sonnet modelini olduğu gibi bırakır', () => {
    expect(normalizeClaudeModel('claude-3-5-sonnet-20241022')).toBe('claude-3-5-sonnet-20241022');
  });
  it('emekli claude-2 / instant / ilk claude-3 modellerini güncele yükseltir', () => {
    expect(normalizeClaudeModel('claude-2')).toBe('claude-3-5-sonnet-20241022');
    expect(normalizeClaudeModel('claude-instant-1.2')).toBe('claude-3-5-sonnet-20241022');
    expect(normalizeClaudeModel('claude-3-sonnet-20240229')).toBe('claude-3-5-sonnet-20241022');
    expect(normalizeClaudeModel('claude-3-opus-20240229')).toBe('claude-3-5-sonnet-20241022');
  });
  it('boş/tanımsız → güvenli varsayılan', () => {
    expect(normalizeClaudeModel('')).toBe('claude-3-5-sonnet-20241022');
    expect(normalizeClaudeModel(undefined)).toBe('claude-3-5-sonnet-20241022');
  });
});

// Mock Expo FileSystem
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(() => Promise.resolve('mock-base64-content')),
}));

// Mock Supabase to ensure offline state is simulated correctly
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
  SUPABASE_CONFIGURED: false,
}));

describe('AI Service', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    clearAiSettingsCache(); // testler arası ayar önbelleği sızmasın
  });

  describe('getAiSettings', () => {
    it('should return mock provider by default when no keys are defined', async () => {
      const settings = await getAiSettings();
      expect(settings.provider).toBe('mock');
    });

    it('should retrieve custom saved settings from AsyncStorage', async () => {
      const savedSettings = { provider: 'openai', apiKey: 'test-key', model: 'gpt-4o' };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(savedSettings));

      const settings = await getAiSettings();
      expect(settings.provider).toBe('openai');
      expect(settings.apiKey).toBe('test-key');
      expect(settings.model).toBe('gpt-4o');
    });

    it('önbellek: TTL içinde 2. çağrı AsyncStorage\'ı TEKRAR okumaz (hız)', async () => {
      const saved = JSON.stringify({ provider: 'openai', apiKey: 'k', model: 'gpt-4o-mini' });
      clearAiSettingsCache();
      // Once kullan ki kalıcı implementasyon sonraki testlere sızmasın.
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
      const a = await getAiSettings();
      const after1 = (AsyncStorage.getItem as jest.Mock).mock.calls.length;
      const b = await getAiSettings(); // önbellekten gelmeli — okuma yok
      expect(b).toEqual(a);
      expect((AsyncStorage.getItem as jest.Mock).mock.calls.length).toBe(after1);
      clearAiSettingsCache();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
      await getAiSettings(); // temizlikten sonra tekrar okur
      expect((AsyncStorage.getItem as jest.Mock).mock.calls.length).toBeGreaterThan(after1);
    });
  });

  describe('chat', () => {
    it('should throw an error for mock provider', async () => {
      await expect(chat('Hello', { provider: 'mock' })).rejects.toThrow(
        'AI provider yapılandırılmamış. Demo modda çalışılıyor.'
      );
    });

    it('should successfully query OpenAI API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'OpenAI response' } }],
        }),
      });

      const reply = await chat('Hello', { provider: 'openai', apiKey: 'op-key', model: 'gpt-4o-mini' });
      expect(reply).toBe('OpenAI response');
      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.any(Object));
    });

    it('OpenAI hata gövdesini hata mesajına dahil eder (teşhis için)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 401,
        text: () => Promise.resolve('{"error":{"message":"invalid api key"}}'),
      });
      await expect(
        chat('Hello', { provider: 'openai', apiKey: 'bad', model: 'gpt-4o-mini' }),
      ).rejects.toThrow(/OpenAI HTTP 401.*invalid api key/);
    });

    it('Claude hata gövdesini hata mesajına dahil eder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 429,
        text: () => Promise.resolve('rate limit exceeded'),
      });
      await expect(
        chat('Hello', { provider: 'claude', apiKey: 'k', model: 'claude-3-5-sonnet' }),
      ).rejects.toThrow(/Claude HTTP 429.*rate limit/);
    });

    it('should successfully query Groq API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Groq response' } }],
        }),
      });

      const reply = await chat('Hello', { provider: 'groq', apiKey: 'gr-key', model: 'llama-3.3-70b-versatile' });
      expect(reply).toBe('Groq response');
      expect(mockFetch).toHaveBeenCalledWith('https://api.groq.com/openai/v1/chat/completions', expect.any(Object));
    });

    it('should successfully query Claude API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Claude response' }],
        }),
      });

      const reply = await chat('Hello', { provider: 'claude', apiKey: 'cl-key', model: 'claude-3-5-sonnet' });
      expect(reply).toBe('Claude response');
      expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.any(Object));
    });

    it('should successfully query Gemini API and use system instructions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }],
        }),
      });

      const reply = await chat('Hello', { provider: 'gemini', apiKey: 'gem-key', model: 'gemini-2.5-flash' }, 'System rule');
      expect(reply).toBe('Gemini response');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'),
        expect.any(Object)
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.system_instruction.parts[0].text).toBe('System rule');
      // 2.5 thinking modeli için düşünme KAPALI olmalı (boş-yanıt bug'ı önlemi)
      expect(requestBody.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
      expect(requestBody.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(4096);
    });

    it('chatWithTools (gemini 2.5): thinking kapalı + buyuk token limiti + cok-part yaniti birlestirir', async () => {
      // Gemini yanıtı: önce boş bir thinking part, sonra functionCall → eski parse
      // boş dönerdi; yeni parse functionCall'ı yakalamalı.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: { parts: [
              { text: '' },
              { functionCall: { name: 'match_poz_bulk', args: { items: [{ description: 'x' }] } } },
            ] },
            finishReason: 'STOP',
          }],
        }),
      });
      const tools: any = [{ type: 'function', function: { name: 'match_poz_bulk', description: 'd', parameters: { type: 'object', properties: {} } } }];
      const res = await chatWithTools(
        [{ role: 'user', content: 'liste...' } as any],
        tools,
        { provider: 'gemini', apiKey: 'gem-key', model: 'gemini-2.5-flash' },
      );
      expect(res.toolCalls).toHaveLength(1);
      expect(res.toolCalls[0].function.name).toBe('match_poz_bulk');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
      expect(body.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(8192);
    });

    it('should automatically promote legacy gemini-1.5-flash model to gemini-2.5-flash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Healed Gemini response' }] } }],
        }),
      });

      const reply = await chat('Hello', { provider: 'gemini', apiKey: 'gem-key', model: 'gemini-1.5-flash' });
      expect(reply).toBe('Healed Gemini response');
      // Verify that the outgoing request path actually uses gemini-2.5-flash instead of gemini-1.5-flash
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1beta/models/gemini-2.5-flash:generateContent'),
        expect.any(Object)
      );
    });
  });

  describe('fetchWithTimeout', () => {
    it('istek init\'ine AbortController signal ekler ve normalde çözülür', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const res = await fetchWithTimeout('https://x', { method: 'POST', body: '{}' });
      expect((res as any).ok).toBe(true);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://x');
      expect((init as any).signal).toBeDefined();
      expect((init as any).body).toBe('{}'); // mevcut init alanları korunur
    });

    it('AbortError\'u anlaşılır bir zaman aşımı hatasına çevirir', async () => {
      const err = new Error('Aborted');
      (err as any).name = 'AbortError';
      mockFetch.mockRejectedValueOnce(err);
      await expect(fetchWithTimeout('https://x', {}, 10)).rejects.toThrow(/zaman aşımına/);
    });

    it('AbortError olmayan ağ hatasını olduğu gibi yükseltir', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network down'));
      await expect(fetchWithTimeout('https://x', {})).rejects.toThrow('Network down');
    });
  });

  describe('chatWithFallback', () => {
    it('should attempt primary provider first and return answer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Primary OK' } }],
        }),
      });

      const res = await chatWithFallback('Test', { provider: 'openai', apiKey: 'op-key', model: 'gpt-4o-mini' });
      expect(res.reply).toBe('Primary OK');
      expect(res.usedProvider).toBe('openai');
    });

    it('geçici hatada (503) aynı sağlayıcıyı retry eder (kopilot tek blip\'te düşmez)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('high demand') })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'Retry OK' } }] }) });
      const res = await chatWithFallback('Test', { provider: 'openai', apiKey: 'op-key', model: 'gpt-4o-mini' });
      expect(res.reply).toBe('Retry OK');
      expect(res.usedProvider).toBe('openai');
      expect(mockFetch).toHaveBeenCalledTimes(2); // 503 → retry → 200
    });
  });

  describe('suggestPozFromDescription', () => {
    it('should perform local keyword matching and return matching suggestions', async () => {
      // "klima" is contained in standard POZ candidates
      const suggestions = await suggestPozFromDescription('Trafo bakımı ve kablo bağlantı kontrolü');
      expect(Array.isArray(suggestions)).toBe(true);
      if (suggestions.length > 0) {
        expect(suggestions[0].score).toBeGreaterThan(0);
        expect(suggestions[0].pozId).toBeDefined();
        expect(suggestions[0].name).toBeDefined();
      }
    });

    it('should return empty list when description is empty', async () => {
      const suggestions = await suggestPozFromDescription('   ');
      expect(suggestions).toEqual([]);
    });
  });

  describe('vision yetenekleri', () => {
    it('isVisionCapable: openai/gemini/claude true, groq/mock false', () => {
      expect(isVisionCapable('openai')).toBe(true);
      expect(isVisionCapable('gemini')).toBe(true);
      expect(isVisionCapable('claude')).toBe(true);
      expect(isVisionCapable('groq')).toBe(false);
      expect(isVisionCapable('mock')).toBe(false);
    });

    it('guessImageMime uzantıdan doğru MIME üretir', () => {
      expect(guessImageMime('file:///a/b.png')).toBe('image/png');
      expect(guessImageMime('file:///a/b.JPG')).toBe('image/jpeg');
      expect(guessImageMime('photo.webp')).toBe('image/webp');
      expect(guessImageMime('no-ext')).toBe('image/jpeg');
    });

    it('chatVision (gemini) inline_data ve doğru endpoint kullanır', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"severity":"high"}' }] } }] }),
      });
      const out = await chatVision(
        'analiz et', { base64: 'AAA', mimeType: 'image/png' },
        { provider: 'gemini', apiKey: 'gk', model: 'gemini-2.5-flash' },
      );
      expect(out).toBe('{"severity":"high"}');
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/v1beta/models/gemini-2.5-flash:generateContent');
      const body = JSON.parse((opts as any).body);
      expect(body.contents[0].parts[1].inline_data).toEqual({ mime_type: 'image/png', data: 'AAA' });
    });

    it('chatVision (claude) base64 image source bloğu gönderir', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'claude vision yanıtı' }] }),
      });
      const out = await chatVision(
        'analiz et', { base64: 'BBB' },
        { provider: 'claude', apiKey: 'ck', model: 'claude-3-5-sonnet-20241022' },
      );
      expect(out).toBe('claude vision yanıtı');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].content[0].source).toEqual({ type: 'base64', media_type: 'image/jpeg', data: 'BBB' });
    });

    it('chatVision groq sağlayıcısı için hata fırlatır (vision yok)', async () => {
      await expect(
        chatVision('x', { base64: 'C' }, { provider: 'groq', apiKey: 'g' }),
      ).rejects.toThrow(/desteklemiyor/);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('analyzePhoto gemini sağlayıcıda GERÇEK vision çağrısı yapar (mock değil)', async () => {
      await setAiSettings({ provider: 'gemini', apiKey: 'gk', model: 'gemini-2.5-flash' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{
            text: '{"severity":"critical","findings":["yanık izi"],"recommendations":["enerjiyi kes"],"estimatedCost":9000,"confidence":88}',
          }] } }],
        }),
      });
      const res = await analyzePhoto('file:///pano.jpg', 'OG pano');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res.severity).toBe('critical');
      expect(res.findings).toContain('yanık izi');
      expect(res.estimatedCost).toBe(9000);
      expect(res.confidence).toBe(88);
      expect(res.imageUri).toBe('file:///pano.jpg');
      expect(res.source).toBe('ai'); // gerçek model sonucu
    });

    it('analyzePhoto AI yapılandırılmamışsa demo sonuç döner (source=demo)', async () => {
      await setAiSettings({ provider: 'mock' }); // anahtarsız mod
      const res = await analyzePhoto('file:///pano.jpg', 'panoda yanık izi var');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(res.source).toBe('demo');
      expect(res.severity).toBe('critical'); // 'yanık' anahtar kelimesi
    });
  });

  describe('tool-calling format dönüştürücüler', () => {
    const TOOLS: ToolSchema[] = [
      {
        type: 'function',
        function: {
          name: 'create_work_order',
          description: 'İş emri oluştur',
          parameters: {
            type: 'object',
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#',
            properties: { client: { type: 'string', description: 'Müşteri' } },
            required: ['client'],
          },
        },
      },
    ];

    it('sanitizeGeminiSchema desteklenmeyen anahtarları atar', () => {
      const out = sanitizeGeminiSchema(TOOLS[0].function.parameters);
      expect(out.additionalProperties).toBeUndefined();
      expect(out.$schema).toBeUndefined();
      expect(out.properties.client).toEqual({ type: 'string', description: 'Müşteri' });
      expect(out.required).toEqual(['client']);
    });

    it('toGeminiTools functionDeclarations üretir', () => {
      const [t] = toGeminiTools(TOOLS);
      expect(t.functionDeclarations[0].name).toBe('create_work_order');
      expect(t.functionDeclarations[0].parameters.properties.client).toBeDefined();
      expect(t.functionDeclarations[0].parameters.$schema).toBeUndefined();
    });

    it('toGeminiContents tool sonucunu functionResponse + doğru ada çevirir', () => {
      const msgs: ChatMessage[] = [
        { role: 'system', content: 'Sistem' },
        { role: 'user', content: 'iş emri aç' },
        { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'create_work_order', arguments: '{"client":"ABC"}' } }] },
        { role: 'tool', tool_call_id: 'call_1', content: '{"ok":true,"id":"wo-1"}' },
      ];
      const map = { call_1: 'create_work_order' };
      const { systemInstruction, contents } = toGeminiContents(msgs, map);
      expect(systemInstruction.parts[0].text).toBe('Sistem');
      // assistant → model + functionCall
      expect(contents[1]).toEqual({ role: 'model', parts: [{ functionCall: { name: 'create_work_order', args: { client: 'ABC' } } }] });
      // tool → user + functionResponse(name)
      expect(contents[2].parts[0].functionResponse.name).toBe('create_work_order');
      expect(contents[2].parts[0].functionResponse.response).toEqual({ ok: true, id: 'wo-1' });
    });

    it('parseGeminiToolResponse functionCall → toolCalls', () => {
      const r = parseGeminiToolResponse({
        candidates: [{ content: { parts: [
          { text: 'tamam' },
          { functionCall: { name: 'create_work_order', args: { client: 'ABC' } } },
        ] }, finishReason: 'STOP' }],
      });
      expect(r.content).toBe('tamam');
      expect(r.toolCalls).toHaveLength(1);
      expect(r.toolCalls[0].function.name).toBe('create_work_order');
      expect(JSON.parse(r.toolCalls[0].function.arguments)).toEqual({ client: 'ABC' });
      expect(r.finishReason).toBe('tool_calls');
    });

    it('toClaudeTools input_schema üretir', () => {
      const [t] = toClaudeTools(TOOLS);
      expect(t.name).toBe('create_work_order');
      expect(t.input_schema.properties.client).toBeDefined();
    });

    it('toClaudeMessages ardışık tool sonuçlarını tek user turn\'de birleştirir', () => {
      const msgs: ChatMessage[] = [
        { role: 'user', content: 'iki iş emri aç' },
        { role: 'assistant', content: 'açıyorum', tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'create_work_order', arguments: '{"client":"A"}' } },
          { id: 'c2', type: 'function', function: { name: 'create_work_order', arguments: '{"client":"B"}' } },
        ] },
        { role: 'tool', tool_call_id: 'c1', content: '{"ok":true}' },
        { role: 'tool', tool_call_id: 'c2', content: '{"ok":true}' },
      ];
      const { messages: out } = toClaudeMessages(msgs);
      // assistant: text + 2 tool_use bloğu
      expect(out[1].role).toBe('assistant');
      expect(out[1].content.filter((b: any) => b.type === 'tool_use')).toHaveLength(2);
      // iki tool sonucu TEK user turn'ünde
      expect(out[2].role).toBe('user');
      expect(out[2].content).toHaveLength(2);
      expect(out[2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'c1' });
      expect(out[2].content[1]).toMatchObject({ type: 'tool_result', tool_use_id: 'c2' });
    });

    it('parseClaudeToolResponse tool_use → toolCalls (id korunur)', () => {
      const r = parseClaudeToolResponse({
        content: [
          { type: 'text', text: 'oluşturuyorum' },
          { type: 'tool_use', id: 'toolu_9', name: 'create_quote', input: { customer: 'X' } },
        ],
        stop_reason: 'tool_use',
      });
      expect(r.content).toBe('oluşturuyorum');
      expect(r.toolCalls[0]).toMatchObject({ id: 'toolu_9', function: { name: 'create_quote' } });
      expect(JSON.parse(r.toolCalls[0].function.arguments)).toEqual({ customer: 'X' });
    });
  });

  describe('chatWithTools — Gemini/Claude native tool-calling (uçtan uca)', () => {
    const TOOLS: ToolSchema[] = [{
      type: 'function',
      function: { name: 'finish', description: 'Bitir', parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] } },
    }];
    const msgs: ChatMessage[] = [
      { role: 'system', content: 'Sistem' },
      { role: 'user', content: 'görevi bitir' },
    ];

    it('gemini: tools.functionDeclarations gönderir ve toolCalls döner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ functionCall: { name: 'finish', args: { summary: 'tamam' } } }] }, finishReason: 'STOP' }],
        }),
      });
      const r = await chatWithTools(msgs, TOOLS, { provider: 'gemini', apiKey: 'gk', model: 'gemini-2.5-flash' });
      expect(r.toolCalls[0].function.name).toBe('finish');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tools[0].functionDeclarations[0].name).toBe('finish');
      expect(body.tool_config.function_calling_config.mode).toBe('AUTO');
    });

    it('claude: tools gönderir ve tool_use → toolCalls döner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'tool_use', id: 'toolu_1', name: 'finish', input: { summary: 'tamam' } }],
          stop_reason: 'tool_use',
        }),
      });
      const r = await chatWithTools(msgs, TOOLS, { provider: 'claude', apiKey: 'ck', model: 'claude-3-5-sonnet-20241022' });
      expect(r.toolCalls[0]).toMatchObject({ id: 'toolu_1', function: { name: 'finish' } });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tools[0].name).toBe('finish');
      expect(body.system).toBe('Sistem');
    });
  });

  describe('chatWithToolsFallback — dayanıklılık', () => {
    const msgs: ChatMessage[] = [{ role: 'user', content: 'görevi bitir' }];

    it('geçici hatada (503) aynı sağlayıcıyı retry eder', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('This model is currently experiencing high demand') })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'tamam', tool_calls: [] }, finish_reason: 'stop' }] }) });
      const r = await chatWithToolsFallback(msgs, [], { provider: 'openai', apiKey: 'k', model: 'gpt-4o-mini' });
      expect(r.content).toBe('tamam');
      expect(mockFetch).toHaveBeenCalledTimes(2); // 503 → retry → 200
    });

    it('kalıcı hatada anahtarı olan diğer sağlayıcıya geçer', async () => {
      process.env.EXPO_PUBLIC_CLAUDE_KEY = 'claude-test-key';
      try {
        mockFetch
          // primary openai → kalıcı 401 (retry edilmez)
          .mockResolvedValueOnce({ ok: false, status: 401, text: () => Promise.resolve('invalid api key') })
          // fallback claude → 200
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ content: [{ type: 'text', text: 'claude cevap' }], stop_reason: 'end_turn' }) });
        const r = await chatWithToolsFallback(msgs, [], { provider: 'openai', apiKey: 'k', model: 'gpt-4o-mini' });
        expect(r.content).toBe('claude cevap');
        const claudeCall = mockFetch.mock.calls.find(c => String(c[0]).includes('anthropic'));
        expect(claudeCall).toBeTruthy();
      } finally {
        delete process.env.EXPO_PUBLIC_CLAUDE_KEY;
      }
    });
  });
});

describe('AI proxy modu (EXPO_PUBLIC_AI_USE_PROXY)', () => {
  const KEY = 'EXPO_PUBLIC_AI_USE_PROXY';
  afterEach(() => { delete process.env[KEY]; clearAiSettingsCache(); });

  it('shouldUseProxy çeşitli truthy değerleri tanır', () => {
    for (const v of ['true', '1', 'yes', 'on', 'TRUE', ' On ']) {
      process.env[KEY] = v;
      expect(shouldUseProxy()).toBe(true);
    }
    for (const v of ['', 'false', '0', 'no', 'off']) {
      process.env[KEY] = v;
      expect(shouldUseProxy()).toBe(false);
    }
    delete process.env[KEY];
    expect(shouldUseProxy()).toBe(false);
  });

  it('proxy modunda getAiSettings yapılandırılmış sentinel döndürür (anahtar gerekmez)', async () => {
    process.env[KEY] = 'true';
    clearAiSettingsCache();
    const s = await getAiSettings();
    expect(s.provider).not.toBe('mock');
    expect(s.apiKey).toBe(PROXY_SENTINEL);
  });

  it('proxy modunda chat() proxy yoluna gider (Supabase yoksa proxy hatası verir, doğrudan fetch DEĞİL)', async () => {
    process.env[KEY] = 'true';
    await expect(chat('merhaba', { provider: 'openai', apiKey: '' })).rejects.toThrow(/proxy/i);
  });

  it('proxy modunda görsel çağrısı net "desteklenmiyor" hatası verir', async () => {
    process.env[KEY] = 'true';
    await expect(
      chatVision('oku', { base64: 'x' }, { provider: 'openai', apiKey: 'k' }),
    ).rejects.toThrow(/desteklenmiyor/i);
  });

  it('proxy modunda araç-çağırma net "desteklenmiyor" hatası verir', async () => {
    process.env[KEY] = 'true';
    await expect(
      chatWithTools([{ role: 'user', content: 'x' }], [], { provider: 'openai', apiKey: 'k' }),
    ).rejects.toThrow(/desteklenmiyor/i);
  });
});
