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
    // create_quote_draft: arg.lc=true ise düşük-güven (fiyatsız kalem + eşleşmeyen müşteri) döner.
    create_quote_draft: {
      destructive: true,
      handler: async (args: any) =>
        args && args.lc
          ? { ok: true, id: 'q2', number: 'TK-2026-0002', manualPriceLines: [{ lineNo: 1, pozName: 'Özel kalem' }], needsCustomer: true, customerName: 'Bilinmeyen A.Ş.' }
          : { ok: true, id: 'q1' },
    },
    // destructive OLMAYAN write tool (Req#3 Y1 kapsamı)
    update_work_order_status: { write: true, handler: async () => ({ ok: false, error: 'geçersiz geçiş' }) },
    finish: { handler: async (args: any) => ({ summary: args.summary }) },
  },
  getAllToolSchemas: () => [],
}));

// auditRepo (loop.ts içe aktarır) test ortamında DB'ye gitmesin; logCurrent no-op.
jest.mock('../../data/auditRepo', () => ({ auditRepo: { logCurrent: jest.fn(async () => {}) } }));

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

  it('destructive OLMAYAN write (update_work_order_status ok:false) de UYARI tetikler', async () => {
    mockResponses.push(
      { content: null, toolCalls: [{ id: '1', function: { name: 'update_work_order_status', arguments: '{}' } }], finishReason: 'tool_calls' },
      { content: null, toolCalls: [{ id: '2', function: { name: 'finish', arguments: JSON.stringify({ summary: 'İş emri güncellendi.' }) } }], finishReason: 'tool_calls' },
    );
    const events: AgentEvent[] = [];
    await runAgent({ goal: 'durum değiştir', ctx, onEvent: e => events.push(e) });
    const final = lastFinal(events) || '';
    expect(final).toMatch(/İş emri güncellendi\./);    // LLM özeti korunur
    expect(final).toMatch(/DİKKAT/);                    // write başarısız → uyarı (Y1)
    expect(final).toMatch(/geçersiz geçiş/);            // gerçek hata
  });

  it('create_quote_draft fiyatsız kalem/eşleşmeyen müşteri → DETERMİNİSTİK gözden-geçirme notu', async () => {
    mockResponses.push(
      { content: null, toolCalls: [{ id: '1', function: { name: 'create_quote_draft', arguments: JSON.stringify({ lc: true }) } }], finishReason: 'tool_calls' },
      { content: null, toolCalls: [{ id: '2', function: { name: 'finish', arguments: JSON.stringify({ summary: 'Teklif hazır.' }) } }], finishReason: 'tool_calls' },
    );
    const events: AgentEvent[] = [];
    await runAgent({ goal: 'teklif hazırla', ctx, onEvent: e => events.push(e) });
    const final = lastFinal(events) || '';
    expect(final).toMatch(/Teklif hazır\./);            // LLM özeti korunur
    expect(final).toMatch(/GÖZDEN GEÇİRME/);            // deterministik kapı (Req#6)
    expect(final).toMatch(/KATALOGTA YOK/);             // fiyatsız kalem uyarısı
    expect(final).toMatch(/eşleşmedi/);                 // müşteri uyarısı
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
