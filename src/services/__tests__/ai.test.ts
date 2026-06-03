// src/services/__tests__/ai.test.ts
// AI Service unit tests covering chat, fallback mechanisms, auto-promotion and POZ suggestions.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAiSettings, setAiSettings, chat, chatWithFallback, suggestPozFromDescription,
  chatVision, analyzePhoto, guessImageMime, isVisionCapable,
  chatWithTools, sanitizeGeminiSchema, toGeminiTools, toGeminiContents, parseGeminiToolResponse,
  toClaudeTools, toClaudeMessages, parseClaudeToolResponse,
  type ChatMessage, type ToolSchema,
} from '../ai';

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
});
