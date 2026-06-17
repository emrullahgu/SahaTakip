// loop.test.ts — Ajan finish özeti DÜRÜSTLÜĞÜ (ADV-1 / Req#3).
// Bir yazma/destructive tool {ok:false} dönerse, finish özeti "gönderildi"
// dese bile final balona deterministik UYARI eklenmeli; tüm write'lar başarılıysa
// uyarı EKLENMEMELİ.

const mockResponses: any[] = [];

jest.mock('../../ai', () => ({
  chatWithToolsFallback: jest.fn(async () => mockResponses.shift()),
}));

jest.mock('../tools', () => ({
  AGENT_TOOLS: {
    gmail_send: { destructive: true, handler: async () => ({ ok: false, error: 'SMTP reddetti' }) },
    create_quote_draft: { destructive: true, handler: async () => ({ ok: true, id: 'q1' }) },
    finish: { handler: async (args: any) => ({ summary: args.summary }) },
  },
  getAllToolSchemas: () => [],
}));

import { runAgent, type AgentEvent } from '../loop';

const ctx: any = { app: {}, currentUserName: 'T', confirm: async () => true, log: () => {} };

function lastFinal(events: AgentEvent[]): string | undefined {
  const f = [...events].reverse().find(e => e.type === 'final') as any;
  return f?.content;
}

beforeEach(() => { mockResponses.length = 0; });

describe('runAgent — finish özeti dürüstlüğü', () => {
  it('başarısız write (gmail_send ok:false) varken finish özetine UYARI eklenir', async () => {
    mockResponses.push(
      { content: null, toolCalls: [{ id: '1', function: { name: 'gmail_send', arguments: '{}' } }], finishReason: 'tool_calls' },
      { content: null, toolCalls: [{ id: '2', function: { name: 'finish', arguments: JSON.stringify({ summary: 'E-posta gönderildi.' }) } }], finishReason: 'tool_calls' },
    );
    const events: AgentEvent[] = [];
    await runAgent({ goal: 'mail at', ctx, onEvent: e => events.push(e) });
    const final = lastFinal(events) || '';
    expect(final).toMatch(/E-posta gönderildi\./);     // LLM özeti korunur
    expect(final).toMatch(/DİKKAT/);                     // ama uyarı eklenir
    expect(final).toMatch(/SMTP reddetti/);              // gerçek hata sebebi
  });

  it('tüm write\'lar başarılıyken finish özetine UYARI EKLENMEZ', async () => {
    mockResponses.push(
      { content: null, toolCalls: [{ id: '1', function: { name: 'create_quote_draft', arguments: '{}' } }], finishReason: 'tool_calls' },
      { content: null, toolCalls: [{ id: '2', function: { name: 'finish', arguments: JSON.stringify({ summary: 'Teklif oluşturuldu.' }) } }], finishReason: 'tool_calls' },
    );
    const events: AgentEvent[] = [];
    await runAgent({ goal: 'teklif yap', ctx, onEvent: e => events.push(e) });
    const final = lastFinal(events) || '';
    expect(final).toBe('Teklif oluşturuldu.');
    expect(final).not.toMatch(/DİKKAT/);
  });
});
