// quoteWarnings — teklif fiyat-sağlığı kontrolleri (saf fonksiyon, test edilebilir).
// Amaç: yanlış fiyatlı / eksik teklifi MÜŞTERİYE göndermeden ÖNCE kullanıcıyı uyarmak.
// Bloklamaz — yalnız uyarır; kullanıcı bilerek devam edebilir.
import type { QuoteLine } from '../types';

export interface QuoteWarning {
  severity: 'danger' | 'warn';
  message: string;
}

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Bir kalemin KDV/kâr/iskonto öncesi birim taban fiyatı (malzeme+montaj+söküm). */
const unitBasePrice = (l: QuoteLine): number =>
  num(l.materialPrice) + num(l.installPrice) + (l.withDismantle ? num(l.dismantlePrice) : 0);

/**
 * Teklif kalemlerini olası fiyatlandırma sorunlarına karşı tarar.
 * - danger: fiyatsız kalem (taban fiyat 0) → müşteriye 0 ₺'lik kalem gitmesin.
 * - warn:   iskonto ≥ %50 (olası fazla iskonto), miktar > 9999 (olası yazım hatası),
 *           grandTotal 0 (boş/sıfır teklif).
 */
export function quotePricingWarnings(lines: QuoteLine[], grandTotal: number): QuoteWarning[] {
  const out: QuoteWarning[] = [];
  if (!lines.length) return out;

  const zeroPriced = lines.filter(l => unitBasePrice(l) <= 0);
  if (zeroPriced.length) {
    out.push({
      severity: 'danger',
      message: `${zeroPriced.length} kalemin fiyatı 0 ₺ — birim fiyat girilmeli (aksi halde müşteriye 0 ₺'lik kalem gider).`,
    });
  }

  const highDiscount = lines.filter(l => num(l.discountPct) >= 50);
  if (highDiscount.length) {
    out.push({
      severity: 'warn',
      message: `${highDiscount.length} kalemde iskonto ≥ %50 — kontrol et.`,
    });
  }

  const hugeQty = lines.filter(l => num(l.quantity) > 9999);
  if (hugeQty.length) {
    out.push({
      severity: 'warn',
      message: `${hugeQty.length} kalemde miktar 9999'dan fazla — olası yazım hatası.`,
    });
  }

  if (num(grandTotal) <= 0) {
    out.push({ severity: 'warn', message: 'Teklif genel toplamı 0 ₺.' });
  }

  return out;
}
