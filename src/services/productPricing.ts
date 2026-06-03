// productPricing.ts — Toplu ürün fiyatı / marka iskonto yönetimi
// ====================================================================
// Ürün kataloğu (MATERIAL_CATALOG) statik ve salt-okunurdur. Kaynak veriyi
// bozmadan, marka / kategori / tüm katalog kapsamında TOPLU fiyat ayarı
// yapmak için bu servis bir "kural overlay" tutar (AsyncStorage).
//
// Efektif fiyat = katalogFiyatı × (1 + zam%/100) × (1 − iskonto%/100)
//   - markupPct  : fiyat artış/azalışı (zam: +, indirim: −)
//   - discountRate: bayi/marka iskontosu (liste fiyatından düşülür)
//
// Kurallar non-destructive'dir: her zaman orijinal katalog fiyatından
// hesaplanır, bu yüzden kaldırıldığında fiyatlar eski haline döner.
// ====================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MaterialCatalogItem } from '../types';

export type PricingScope = 'brand' | 'category' | 'all';

export interface BrandPricingRule {
  scope: PricingScope;
  key: string;            // marka adı / kategori adı / 'all' kapsamı için '*'
  discountRate?: number;  // % — liste fiyatından düşülen iskonto (0–100)
  markupPct?: number;     // % — fiyat artışı(+)/indirimi(−), ör. zam
  updatedAt: string;
}

const KEY = 'product_pricing_rules_v1';

const clampPct = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

function ruleId(r: Pick<BrandPricingRule, 'scope' | 'key'>): string {
  return `${r.scope}:${r.key}`;
}

export async function listPricingRules(): Promise<BrandPricingRule[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BrandPricingRule[]) : [];
  } catch {
    return [];
  }
}

async function saveRules(rules: BrandPricingRule[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(rules));
}

/** Kuralı ekler/günceller. Aynı scope+key için tek kural tutulur. */
export async function upsertPricingRule(
  input: Omit<BrandPricingRule, 'updatedAt'>,
): Promise<BrandPricingRule> {
  const rules = await listPricingRules();
  const rule: BrandPricingRule = {
    scope: input.scope,
    key: input.scope === 'all' ? '*' : input.key,
    discountRate: input.discountRate != null ? clampPct(input.discountRate, 0, 100) : undefined,
    markupPct: input.markupPct != null ? clampPct(input.markupPct, -100, 1000) : undefined,
    updatedAt: new Date().toISOString(),
  };
  const idx = rules.findIndex(r => ruleId(r) === ruleId(rule));
  if (idx >= 0) rules[idx] = rule;
  else rules.unshift(rule);
  await saveRules(rules);
  return rule;
}

export async function deletePricingRule(scope: PricingScope, key: string): Promise<void> {
  const rules = await listPricingRules();
  const target = ruleId({ scope, key: scope === 'all' ? '*' : key });
  await saveRules(rules.filter(r => ruleId(r) !== target));
}

export async function clearPricingRules(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** Bir ürün için en spesifik kuralı seçer: brand > category > all. */
export function findRuleForItem(
  item: Pick<MaterialCatalogItem, 'brand' | 'category'>,
  rules: BrandPricingRule[],
): BrandPricingRule | undefined {
  return (
    rules.find(r => r.scope === 'brand' && !!item.brand && r.key === item.brand) ??
    rules.find(r => r.scope === 'category' && !!item.category && r.key === item.category) ??
    rules.find(r => r.scope === 'all')
  );
}

export interface EffectivePricing {
  price: number;        // kurallar uygulanmış efektif fiyat (TL)
  basePrice: number;    // orijinal katalog fiyatı
  discountRate: number; // uygulanan iskonto %
  markupPct: number;    // uygulanan zam %
  changed: boolean;     // efektif fiyat orijinalden farklı mı
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Tek bir ürünün kurallara göre efektif fiyatını hesaplar. */
export function effectivePricing(
  item: MaterialCatalogItem,
  rules: BrandPricingRule[],
): EffectivePricing {
  const base = item.price || 0;
  const rule = findRuleForItem(item, rules);
  const markupPct = rule?.markupPct ?? 0;
  // Kural iskontoyu açıkça belirtmişse onu, yoksa üründeki mevcut iskontoyu kullan.
  const discountRate = rule?.discountRate ?? item.discountRate ?? 0;
  const price = round2(base * (1 + markupPct / 100) * (1 - discountRate / 100));
  return {
    price,
    basePrice: base,
    discountRate,
    markupPct,
    changed: price !== round2(base),
  };
}

/** Tüm katalogu kurallarla overlay'ler — yeni dizi döner (kaynak değişmez). */
export function applyPricingRules(
  catalog: MaterialCatalogItem[],
  rules: BrandPricingRule[],
): MaterialCatalogItem[] {
  if (!rules.length) return catalog;
  return catalog.map(item => {
    const eff = effectivePricing(item, rules);
    if (!eff.changed && eff.discountRate === (item.discountRate ?? 0)) return item;
    return { ...item, price: eff.price, discountRate: eff.discountRate };
  });
}

/** Bir kapsamın etkilediği ürün sayısını sayar (UI önizleme için). */
export function countAffected(
  catalog: MaterialCatalogItem[],
  scope: PricingScope,
  key: string,
): number {
  if (scope === 'all') return catalog.length;
  if (scope === 'brand') return catalog.filter(m => m.brand === key).length;
  return catalog.filter(m => m.category === key).length;
}
