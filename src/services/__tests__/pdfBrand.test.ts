// PDF marka/temizlik regresyonu:
//  - @page margin:0 → tarayıcı tarih/saat/başlık/URL basmaz
//  - logo data URI gömülü
import { buildQuoteHtml } from '../pdf';
import type { Quote } from '../../types';

const quote: Quote = {
  id: '11111111-1111-4111-8111-111111111111',
  number: 'TK-2026-0001',
  customerName: 'Test Müşteri',
  customerTitle: 'Test Müşteri A.Ş.',
  title: 'Trafo Bakım Teklifi',
  date: '2026-06-03',
  engineer: 'Mühendis',
  status: 'Taslak',
  lines: [
    {
      lineNo: 1, pozId: 'POZ-1', pozName: 'Örnek', unit: 'Adet', quantity: 2,
      materialPrice: 100, installPrice: 50, dismantlePrice: 0, withDismantle: false,
      overheadPct: 10, profitPct: 15, vatPct: 20, discountPct: 0,
    },
  ],
  subtotal: 0, vatTotal: 0, grandTotal: 0,
} as Quote;

describe('buildQuoteHtml — marka & yazdırma temizliği', () => {
  const html = buildQuoteHtml(quote);

  it('@page margin:0 içerir (tarayıcı başlık/altbilgi basmaz)', () => {
    expect(html).toMatch(/@page\s*\{[^}]*margin:\s*0/);
  });

  it('inline logo (data:image/png;base64) gömülüdür', () => {
    expect(html).toContain('data:image/png;base64,');
    expect(html).toMatch(/<img[^>]+class="logo"/);
  });

  it('metin firma adı başlığı yerine logo kullanılır', () => {
    expect(html).not.toContain('<div class="name">');
  });

  it('müşteriye giden teklifte iç POZ kodu (POZ-.../MANUAL-...) GÖRÜNMEZ, sadece iş tanımı', () => {
    // quote.lines[0].pozId = 'POZ-1', pozName = 'Örnek'
    expect(html).toContain('Örnek');          // iş tanımı görünür
    expect(html).not.toContain('POZ-1');      // iç kod görünmez
    expect(html).not.toMatch(/MANUAL-\d/);    // manuel kalem kodu görünmez
  });
});
