// quoteMath.ts — Teklif para motoru (saf fonksiyonlar, test edilebilir).
// Tüm teklif tutarları (ekran + PDF + AI ajan) BU fonksiyonlardan geçer; bu yüzden
// regresyona karşı birim testiyle korunur (denetim M10). AppContext bunları
// re-export eder; mevcut `from '../context/AppContext'` importları çalışmaya devam eder.
import { QuoteLine } from '../types';

export const calcLineTotal = (line: QuoteLine) => {
  const unitBase =
    line.materialPrice +
    line.installPrice +
    (line.withDismantle ? line.dismantlePrice : 0);
  const lineRaw = unitBase * line.quantity;
  const afterDiscount = lineRaw * (1 - line.discountPct / 100);
  const withOverhead = afterDiscount * (1 + line.overheadPct / 100);
  const withProfit = withOverhead * (1 + line.profitPct / 100);
  const vat = withProfit * (line.vatPct / 100);
  return {
    unitBase,
    lineRaw,
    afterDiscount,
    withOverhead,
    withProfit,
    vat,
    total: withProfit + vat,
  };
};

export const calcQuoteTotals = (lines: QuoteLine[]) => {
  // Tek geçişte hesapla — önceden her satır için calcLineTotal 2 kez çağrılıyordu
  // (subtotal + vat ayrı reduce). Büyük tekliflerde gereksiz iş + yuvarlama riski.
  let subtotal = 0;
  let vatTotal = 0;
  for (const l of lines) {
    const t = calcLineTotal(l);
    subtotal += t.withProfit;
    vatTotal += t.vat;
  }
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
};
