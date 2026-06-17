// pdf.test.ts — Teklif PDF HTML üretimi (markalama + içerik) testleri
import { buildQuoteHtml } from '../pdf';
import { BRAND } from '../../config/brand';
import type { Quote } from '../../types';

const sampleQuote: Quote = {
  id: 'QT-2026-0001',
  number: 'QT-2026-0001',
  customerName: 'Demir Yapı',
  customerTitle: 'Demir Yapı İnşaat A.Ş.',
  title: 'OG Pano Bakımı',
  date: '2026-06-03',
  engineer: 'Mehmet Yılmaz',
  status: 'Taslak',
  subtotal: 1000,
  vatTotal: 200,
  grandTotal: 1200,
  lines: [{
    lineNo: 1, pozId: 'POZ-EM-404', pozName: 'Pano bakımı', unit: 'Adet', quantity: 2,
    materialPrice: 300, installPrice: 200, dismantlePrice: 0, withDismantle: false,
    overheadPct: 10, profitPct: 15, vatPct: 20, discountPct: 0,
  }],
};

describe('buildQuoteHtml — markalama', () => {
  const html = buildQuoteHtml(sampleQuote);

  it('gerçek şirket bilgilerini (KOBİNERJİ) içerir', () => {
    expect(html).toContain(BRAND.company.name);
    expect(html).toContain(BRAND.company.email);
    expect(html).toContain(BRAND.company.phone);
    expect(html).toContain(BRAND.company.taxNumber);
    expect(html).toContain(String(BRAND.company.copyrightYear));
  });

  it('eski placeholder iletişim bilgilerini İÇERMEZ (regresyon)', () => {
    expect(html).not.toContain('info@SahaTakip.com');
    expect(html).not.toContain('0xxx xxx xx xx');
    expect(html).not.toContain('© 2025');
  });

  it('teklif içeriğini (no, müşteri, kalem, toplam) yansıtır', () => {
    expect(html).toContain('QT-2026-0001');
    expect(html).toContain('Demir Yapı İnşaat A.Ş.');
    // Müşteriye giden teklifte iç POZ kodu DEĞİL, iş tanımı (pozName) görünür.
    expect(html).not.toContain('POZ-EM-404');
    expect(html).toContain('Pano bakımı');
    expect(html).toContain('OG Pano Bakımı');
    // grandTotal 1.200,00 ₺ olarak formatlanır
    expect(html).toContain('1.200,00');
  });

  it('XSS riskine karşı kullanıcı metnini kaçışlar (escapeHtml)', () => {
    const evil = buildQuoteHtml({ ...sampleQuote, title: '<script>alert(1)</script>' });
    expect(evil).not.toContain('<script>alert(1)</script>');
    expect(evil).toContain('&lt;script&gt;');
  });
});

describe('buildQuoteHtml — kalem açıklaması (per-line not)', () => {
  it('kullanıcı açıklaması kalemin altında görünür', () => {
    const html = buildQuoteHtml({
      ...sampleQuote,
      lines: [{ ...sampleQuote.lines[0], notes: 'Garanti 2 yıl, montaj dahil.' }],
    });
    // .line-note CSS sınıfı her zaman <style>'da var; render edilen div'i kontrol et.
    expect(html).toContain('<div class="line-note">');
    expect(html).toContain('Garanti 2 yıl, montaj dahil.');
  });

  it('sistem uyarısı (⚠ ile başlayan) müşteri PDF\'ine BASILMAZ', () => {
    const html = buildQuoteHtml({
      ...sampleQuote,
      lines: [{ ...sampleQuote.lines[0], notes: '⚠ Birim fiyat girilmeli (katalogda yok)' }],
    });
    expect(html).not.toContain('Birim fiyat girilmeli');
    expect(html).not.toContain('<div class="line-note">');
  });

  it('açıklama da escapeHtml ile kaçışlanır (XSS)', () => {
    const html = buildQuoteHtml({
      ...sampleQuote,
      lines: [{ ...sampleQuote.lines[0], notes: '<img src=x onerror=alert(1)>' }],
    });
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });
});
