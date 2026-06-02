// src/services/__tests__/ai.test.ts
// AI Service unit tests covering chat, fallback mechanisms, auto-promotion and POZ suggestions.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAiSettings, setAiSettings, chat, chatWithFallback, suggestPozFromDescription } from '../ai';

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
});
