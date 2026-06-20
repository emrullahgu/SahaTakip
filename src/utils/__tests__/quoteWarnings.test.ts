import { quotePricingWarnings } from '../quoteWarnings';
import type { QuoteLine } from '../../types';

const line = (p: Partial<QuoteLine>): QuoteLine => ({
  id: 'l', lineNo: 1, pozId: 'X', pozName: 'Kalem', unit: 'Adet',
  quantity: 1, materialPrice: 0, installPrice: 100, dismantlePrice: 0,
  withDismantle: false, overheadPct: 0, profitPct: 0, vatPct: 20, discountPct: 0,
  ...p,
});

describe('quotePricingWarnings', () => {
  it('boş teklifte uyarı yok', () => {
    expect(quotePricingWarnings([], 0)).toEqual([]);
  });

  it('fiyatsız kalemi danger olarak işaretler', () => {
    const w = quotePricingWarnings([line({ materialPrice: 0, installPrice: 0, dismantlePrice: 0 })], 0);
    expect(w.some(x => x.severity === 'danger' && /fiyatı 0/.test(x.message))).toBe(true);
  });

  it('söküm dahilse söküm bedeli tabana sayılır (fiyatsız sayılmaz)', () => {
    const w = quotePricingWarnings([line({ materialPrice: 0, installPrice: 0, dismantlePrice: 500, withDismantle: true })], 5000);
    expect(w.some(x => x.severity === 'danger')).toBe(false);
  });

  it('iskonto ≥ %50 uyarır', () => {
    const w = quotePricingWarnings([line({ discountPct: 60 })], 100);
    expect(w.some(x => /iskonto/.test(x.message))).toBe(true);
  });

  it('miktar > 9999 uyarır', () => {
    const w = quotePricingWarnings([line({ quantity: 100000 })], 100);
    expect(w.some(x => /miktar/.test(x.message))).toBe(true);
  });

  it('genel toplam 0 uyarır', () => {
    const w = quotePricingWarnings([line({ installPrice: 100 })], 0);
    expect(w.some(x => /genel toplam/i.test(x.message))).toBe(true);
  });

  it('normal teklifte uyarı yok', () => {
    const w = quotePricingWarnings([line({ installPrice: 2500, quantity: 2 })], 6000);
    expect(w).toEqual([]);
  });
});
