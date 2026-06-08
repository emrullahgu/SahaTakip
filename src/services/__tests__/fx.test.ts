// fx.test.ts — TCMB kur ayrıştırma + döviz→TL dönüşümü (saf fonksiyonlar).
import { parseTcmbXml, convertToTry, liveUnitPriceTry, FX_FALLBACK, FX_MARGIN_TRY, type FxRates } from '../fx';

const SAMPLE_XML = `<?xml version="1.0" encoding="ISO-8859-9"?>
<Tarih_Date Tarih="06.06.2026" Date="06/06/2026">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Unit>1</Unit><Isim>ABD DOLARI</Isim>
    <ForexBuying>45.5000</ForexBuying><ForexSelling>45.8000</ForexSelling>
  </Currency>
  <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR">
    <Unit>1</Unit><Isim>EURO</Isim>
    <ForexBuying>52.8000</ForexBuying><ForexSelling>53.1200</ForexSelling>
  </Currency>
</Tarih_Date>`;

describe('parseTcmbXml', () => {
  it('USD/EUR ForexSelling ve tarihi ayrıştırır', () => {
    const r = parseTcmbXml(SAMPLE_XML);
    expect(r.USD).toBeCloseTo(45.8, 4);
    expect(r.EUR).toBeCloseTo(53.12, 4);
    expect(r.date).toBe('06.06.2026');
  });

  it('eksik/bozuk XML → undefined alanlar', () => {
    const r = parseTcmbXml('<xml>boş</xml>');
    expect(r.USD).toBeUndefined();
    expect(r.EUR).toBeUndefined();
  });
});

describe('convertToTry', () => {
  const rates: FxRates = { USD: 45.8, EUR: 53.12, date: '06.06.2026', source: 'TCMB' };

  it('TL/TRY → aynen döner (çevirme yok)', () => {
    expect(convertToTry(100, 'TL', rates)).toBe(100);
    expect(convertToTry(100, 'TRY', rates)).toBe(100);
    expect(convertToTry(100, undefined, rates)).toBe(100);
  });

  it('EUR → kur + güvenlik marjı ile çevrilir', () => {
    // 10 EUR × (53.12 + 1.5) = 546.2
    expect(convertToTry(10, 'EUR', rates)).toBeCloseTo(10 * (53.12 + FX_MARGIN_TRY), 4);
  });

  it('USD → kur + marj; marj override edilebilir', () => {
    expect(convertToTry(2, 'USD', rates, { margin: 0 })).toBeCloseTo(2 * 45.8, 4);
  });

  it('bilinmeyen döviz → olduğu gibi', () => {
    expect(convertToTry(100, 'GBP', rates)).toBe(100);
  });
});

describe('liveUnitPriceTry', () => {
  const rates: FxRates = { USD: 45.8, EUR: 53.12, date: '06.06.2026', source: 'TCMB' };

  it('TL ürün: baked fiyatı olduğu gibi (zaten iskontolu)', () => {
    // SERER örneği: liste 37.7, ted. ind. %40, price 22.62
    expect(liveUnitPriceTry({ price: 22.62, currency: 'TL', listPrice: 37.7, discountRate: 40 }, rates)).toBe(22.62);
  });

  it('EUR ürün: liste × (1−tedarikçi ind.) × güncel kur (bayat baked price DEĞİL)', () => {
    // ABB örneği: liste 6.1 EUR, ted. ind. %50 → net 3.05 EUR × (53.12+1.5)=166.59
    const out = liveUnitPriceTry({ price: 166.09, currency: 'EUR', listPrice: 6.1, discountRate: 50 }, rates);
    expect(out).toBeCloseTo(3.05 * (53.12 + FX_MARGIN_TRY), 1);
    // Bayat baked fiyattan (166.09) farklı olmalı — canlı kur kullanıldığının kanıtı.
    expect(out).not.toBe(166.09);
  });

  it('orijinal döviz fiyatı yoksa baked fiyata düşer', () => {
    expect(liveUnitPriceTry({ price: 200, currency: 'EUR' }, rates)).toBe(200);
  });
});

describe('FX_FALLBACK', () => {
  it('build kuruyla uyumlu güvenli varsayılan içerir', () => {
    expect(FX_FALLBACK.EUR).toBeGreaterThan(0);
    expect(FX_FALLBACK.USD).toBeGreaterThan(0);
    expect(FX_FALLBACK.source).toBe('fallback');
  });
});
