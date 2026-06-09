import { calcLineTotal, calcQuoteTotals } from '../quoteMath';
import type { QuoteLine } from '../../types';

// Geçerli bir QuoteLine üretir; testler yalnız ilgili alanları override eder.
function line(over: Partial<QuoteLine> = {}): QuoteLine {
  return {
    lineNo: 1,
    pozId: 'POZ-1',
    pozName: 'Test',
    unit: 'Ad',
    quantity: 1,
    materialPrice: 0,
    installPrice: 0,
    dismantlePrice: 0,
    withDismantle: false,
    overheadPct: 0,
    profitPct: 0,
    vatPct: 20,
    discountPct: 0,
    ...over,
  };
}

describe('calcLineTotal — teklif kalem matematiği', () => {
  it('temel: malzeme+montaj, qty, %20 KDV', () => {
    const t = calcLineTotal(line({ materialPrice: 100, installPrice: 50, quantity: 2 }));
    expect(t.unitBase).toBe(150);
    expect(t.lineRaw).toBe(300);
    expect(t.afterDiscount).toBe(300);
    expect(t.withProfit).toBe(300);
    expect(t.vat).toBe(60);
    expect(t.total).toBe(360);
  });

  it('withDismantle=true demontaj fiyatını birim tabana ekler', () => {
    const off = calcLineTotal(line({ materialPrice: 100, dismantlePrice: 20, withDismantle: false }));
    const on = calcLineTotal(line({ materialPrice: 100, dismantlePrice: 20, withDismantle: true }));
    expect(off.unitBase).toBe(100);
    expect(on.unitBase).toBe(120);
  });

  it('iskonto, overhead, kâr, KDV bu SIRAYLA çarpan olarak uygulanır', () => {
    // 100 → iskonto %10 → 90 → overhead %10 → 99 → kâr %20 → 118.8 → KDV %18 → 21.384
    const t = calcLineTotal(line({
      materialPrice: 100, quantity: 1,
      discountPct: 10, overheadPct: 10, profitPct: 20, vatPct: 18,
    }));
    expect(t.afterDiscount).toBeCloseTo(90, 6);
    expect(t.withOverhead).toBeCloseTo(99, 6);
    expect(t.withProfit).toBeCloseTo(118.8, 6);
    expect(t.vat).toBeCloseTo(21.384, 6);
    expect(t.total).toBeCloseTo(140.184, 6);
  });

  it('iskonto %100 → satır 0', () => {
    const t = calcLineTotal(line({ materialPrice: 500, discountPct: 100 }));
    expect(t.withProfit).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe('calcQuoteTotals — teklif toplamı', () => {
  it('boş liste → tüm toplamlar 0', () => {
    expect(calcQuoteTotals([])).toEqual({ subtotal: 0, vatTotal: 0, grandTotal: 0 });
  });

  it('çok kalemli toplam = Σ withProfit + Σ vat', () => {
    const lines = [
      line({ materialPrice: 100, installPrice: 50, quantity: 2, vatPct: 20 }), // withProfit 300, vat 60
      line({ materialPrice: 200, quantity: 1, vatPct: 20 }),                   // withProfit 200, vat 40
    ];
    const r = calcQuoteTotals(lines);
    expect(r.subtotal).toBeCloseTo(500, 6);
    expect(r.vatTotal).toBeCloseTo(100, 6);
    expect(r.grandTotal).toBeCloseTo(600, 6);
  });

  it('grandTotal her zaman subtotal + vatTotal', () => {
    const lines = [line({ materialPrice: 137, installPrice: 63, quantity: 3, discountPct: 7, overheadPct: 12, profitPct: 18, vatPct: 20 })];
    const r = calcQuoteTotals(lines);
    expect(r.grandTotal).toBeCloseTo(r.subtotal + r.vatTotal, 9);
  });
});
