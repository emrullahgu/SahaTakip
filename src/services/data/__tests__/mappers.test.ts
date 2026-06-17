// mappers.test.ts — created_by (RLS owner-write) regresyon testleri
import { quoteToRow, quoteFromRow, workOrderToRow, customerToRow } from '../mappers';
import type { Quote, WorkOrder, Customer } from '../../../types';

const quote = {
  id: 'q1', number: 'QT-1', customerName: 'X', title: 'T', date: '2026-06-09',
  engineer: 'E', status: 'Taslak', lines: [], subtotal: 0, vatTotal: 0, grandTotal: 0,
} as unknown as Quote;

const wo = { id: 'wo1', client: 'X', serviceName: 'S', date: '2026-06-09', engineer: 'E', status: 'Bekliyor', materials: [] } as unknown as WorkOrder;
const cust = { id: 'c1', shortName: 'X', title: 'X A.Ş.' } as unknown as Customer;

describe('mappers — created_by (RLS owner-write)', () => {
  it('quoteToRow userId verilince created_by set eder', () => {
    expect(quoteToRow(quote, 'user-123').created_by).toBe('user-123');
  });
  it('quoteToRow userId verilmezse created_by null (RLS reddi riski → repo userId geçmeli)', () => {
    expect(quoteToRow(quote).created_by).toBeNull();
  });
  it('workOrderToRow userId\'yi created_by\'a yazar', () => {
    expect(workOrderToRow(wo, 'u9').created_by).toBe('u9');
  });
  it('customerToRow userId\'yi created_by\'a yazar', () => {
    expect(customerToRow(cust, 'u5').created_by).toBe('u5');
  });
});

describe('mappers — work_order source_quote_id (idempotency izi)', () => {
  it('sourceQuoteId yoksa source_quote_id null (manuel iş emri kısıtlanmaz)', () => {
    expect(workOrderToRow(wo).source_quote_id).toBeNull();
  });
  it('sourceQuoteId verilince source_quote_id satıra yazılır', () => {
    const fromQuote = { ...wo, sourceQuoteId: 'q-42' } as unknown as WorkOrder;
    expect(workOrderToRow(fromQuote).source_quote_id).toBe('q-42');
  });
});

describe('mappers — teklif kabul metadata kalıcılığı (WO link + imza kaybı regresyonu)', () => {
  const accepted = {
    ...quote,
    status: 'Kabul Edildi',
    revision: 2,
    acceptedAt: '2026-06-16T10:00:00.000Z',
    acceptedBy: 'Ahmet Yılmaz',
    acceptSignature: 'base64sig==',
    generatedWorkOrderId: 'IE-2026-007',
    shareToken: 'qst-abc123',
  } as unknown as Quote;

  it('quoteToRow kabul metadata\'sını snake_case kolonlara yazar', () => {
    const row = quoteToRow(accepted, 'u1');
    expect(row.accepted_at).toBe('2026-06-16T10:00:00.000Z');
    expect(row.accepted_by).toBe('Ahmet Yılmaz');
    expect(row.accept_signature).toBe('base64sig==');
    expect(row.generated_work_order_id).toBe('IE-2026-007');
    expect(row.share_token).toBe('qst-abc123');
    expect(row.revision).toBe(2);
  });

  it('round-trip: toRow → fromRow kabul alanlarını korur (refresh sonrası kaybolmaz)', () => {
    const row = quoteToRow(accepted, 'u1');
    const back = quoteFromRow(row, []);
    expect(back.generatedWorkOrderId).toBe('IE-2026-007');
    expect(back.acceptSignature).toBe('base64sig==');
    expect(back.acceptedBy).toBe('Ahmet Yılmaz');
    expect(back.shareToken).toBe('qst-abc123');
    expect(back.revision).toBe(2);
  });

  it('metadata yoksa null/undefined (yeni taslak teklif bozulmaz)', () => {
    const row = quoteToRow(quote);
    expect(row.generated_work_order_id).toBeNull();
    expect(row.accepted_at).toBeNull();
    expect(quoteFromRow(row, []).generatedWorkOrderId).toBeUndefined();
  });
});
