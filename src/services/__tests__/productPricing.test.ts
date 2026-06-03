// productPricing.test.ts — Toplu fiyat/iskonto kuralları testleri
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  upsertPricingRule, listPricingRules, deletePricingRule, clearPricingRules,
  effectivePricing, applyPricingRules, findRuleForItem, countAffected,
  type BrandPricingRule,
} from '../productPricing';
import type { MaterialCatalogItem } from '../../types';

const mk = (over: Partial<MaterialCatalogItem>): MaterialCatalogItem => ({
  id: over.id || 'x', name: over.name || 'Ürün', price: over.price ?? 100,
  brand: over.brand, category: over.category, currency: 'TL',
  listPrice: over.listPrice, discountRate: over.discountRate,
});

const catalog: MaterialCatalogItem[] = [
  mk({ id: '1', brand: 'ABB', category: 'Şalt', price: 100 }),
  mk({ id: '2', brand: 'ABB', category: 'Kablo', price: 200 }),
  mk({ id: '3', brand: 'Schneider', category: 'Şalt', price: 50 }),
];

beforeEach(async () => { await AsyncStorage.clear(); });

describe('productPricing — kural kalıcılığı', () => {
  it('marka kuralını ekler ve okur', async () => {
    await upsertPricingRule({ scope: 'brand', key: 'ABB', discountRate: 20 });
    const rules = await listPricingRules();
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ scope: 'brand', key: 'ABB', discountRate: 20 });
  });

  it('aynı scope+key için tek kural tutar (upsert)', async () => {
    await upsertPricingRule({ scope: 'brand', key: 'ABB', discountRate: 20 });
    await upsertPricingRule({ scope: 'brand', key: 'ABB', discountRate: 35 });
    const rules = await listPricingRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].discountRate).toBe(35);
  });

  it('iskonto 0–100, zam −100..1000 aralığına kırpılır', async () => {
    const r = await upsertPricingRule({ scope: 'all', key: '*', discountRate: 150, markupPct: -500 });
    expect(r.discountRate).toBe(100);
    expect(r.markupPct).toBe(-100);
    expect(r.key).toBe('*'); // all scope → '*'
  });

  it('kuralı siler ve temizler', async () => {
    await upsertPricingRule({ scope: 'brand', key: 'ABB', discountRate: 20 });
    await upsertPricingRule({ scope: 'category', key: 'Şalt', markupPct: 10 });
    await deletePricingRule('brand', 'ABB');
    expect(await listPricingRules()).toHaveLength(1);
    await clearPricingRules();
    expect(await listPricingRules()).toHaveLength(0);
  });
});

describe('productPricing — efektif fiyat hesabı', () => {
  it('marka iskontosu fiyatı düşürür', () => {
    const rules: BrandPricingRule[] = [{ scope: 'brand', key: 'ABB', discountRate: 25, updatedAt: '' }];
    const eff = effectivePricing(catalog[0], rules); // 100 × 0.75
    expect(eff.price).toBe(75);
    expect(eff.discountRate).toBe(25);
    expect(eff.changed).toBe(true);
  });

  it('zam (markup) fiyatı artırır, iskonto ile birleşir', () => {
    const rules: BrandPricingRule[] = [{ scope: 'brand', key: 'ABB', markupPct: 10, discountRate: 20, updatedAt: '' }];
    // 200 × 1.10 × 0.80 = 176
    expect(effectivePricing(catalog[1], rules).price).toBe(176);
  });

  it('en spesifik kural kazanır: brand > category > all', () => {
    const rules: BrandPricingRule[] = [
      { scope: 'all', key: '*', discountRate: 5, updatedAt: '' },
      { scope: 'category', key: 'Şalt', discountRate: 10, updatedAt: '' },
      { scope: 'brand', key: 'ABB', discountRate: 30, updatedAt: '' },
    ];
    // item1: ABB/Şalt → brand kuralı (30)
    expect(findRuleForItem(catalog[0], rules)?.discountRate).toBe(30);
    expect(effectivePricing(catalog[0], rules).price).toBe(70);
    // item3: Schneider/Şalt → category kuralı (10)
    expect(effectivePricing(catalog[2], rules).price).toBe(45);
  });

  it('kural yoksa fiyat değişmez', () => {
    const eff = effectivePricing(catalog[0], []);
    expect(eff.price).toBe(100);
    expect(eff.changed).toBe(false);
  });

  it('applyPricingRules kaynak diziyi değiştirmez (non-destructive)', () => {
    const rules: BrandPricingRule[] = [{ scope: 'brand', key: 'ABB', discountRate: 50, updatedAt: '' }];
    const out = applyPricingRules(catalog, rules);
    expect(out[0].price).toBe(50);   // overlay
    expect(catalog[0].price).toBe(100); // orijinal korunur
    expect(out).not.toBe(catalog);
  });

  it('boş kural setinde aynı referansı döner', () => {
    expect(applyPricingRules(catalog, [])).toBe(catalog);
  });

  it('countAffected kapsam başına doğru sayar', () => {
    expect(countAffected(catalog, 'brand', 'ABB')).toBe(2);
    expect(countAffected(catalog, 'category', 'Şalt')).toBe(2);
    expect(countAffected(catalog, 'all', '*')).toBe(3);
  });
});
