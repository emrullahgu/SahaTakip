// receiptPdf.test.ts — Makbuz PDF markalama (BRAND/KOBİNERJİ) regresyon testi
import { buildReceiptHtml } from '../receiptPdf';
import { BRAND } from '../../config/brand';
import type { Payment } from '../../types';

const payment: Payment = {
  id: 'pay-1',
  customerId: 'c1',
  customerName: 'Demir Yapı A.Ş.',
  amount: 1200,
  currency: 'TRY',
  method: 'transfer',
  status: 'received',
  receivedAt: '2026-06-10T10:00:00.000Z',
  receiptNo: 'MKB-2026-001',
  vatRate: 20,
  createdAt: '2026-06-10T10:00:00.000Z',
};

describe('buildReceiptHtml — markalama', () => {
  const html = buildReceiptHtml(payment);

  it('varsayılan olarak gerçek şirket (KOBİNERJİ) bilgilerini gömer', () => {
    expect(html).toContain(BRAND.company.legalName);
    expect(html).toContain(BRAND.company.taxNumber);
    expect(html).toContain(BRAND.company.phone);
  });

  it('eski "SahaTakip uygulaması" ibaresini İÇERMEZ (regresyon)', () => {
    expect(html).not.toContain('SahaTakip uygulaması');
  });

  it('makbuz içeriğini yansıtır', () => {
    expect(html).toContain('MKB-2026-001');
    expect(html).toContain('Demir Yapı A.Ş.');
    expect(html).toContain('1.200,00');
  });

  it('açıkça company verilirse onu kullanır (white-label)', () => {
    const custom = buildReceiptHtml(payment, { title: 'ÖZEL FİRMA LTD', address: 'X', tax: 'Y' });
    expect(custom).toContain('ÖZEL FİRMA LTD');
  });
});
