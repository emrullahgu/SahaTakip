// quoteValidity.ts — Teklif geçerlilik (validUntil) durumu. SAF → test edilir.
// KOBİ'de süresi dolan teklif = kaybedilen satış; bu, listede/dashboard'da
// aksiyon alınabilir uyarı üretmek için kullanılır.

import type { Quote } from '../types';

export type QuoteValidity = 'none' | 'valid' | 'expiringSoon' | 'expired';

// Yalnız "açık" tekliflerde uyarı üretilir; kapanmış teklif (kabul/ret/fatura)
// geçerlilik uyarısı vermez.
const ACTIVE_STATUSES = new Set(['Müşteriye Gönderildi', 'Onay Bekliyor']);
const SOON_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/** validUntil'e kalan tam gün sayısı (geçmişse negatif). validUntil yoksa null. */
export function daysUntilValid(q: Quote, now: Date = new Date()): number | null {
  if (!q.validUntil) return null;
  const t = Date.parse(q.validUntil);
  if (Number.isNaN(t)) return null;
  // Gün bazında karşılaştır (saat farkı yanıltmasın): her ikisini gün başına indir.
  const dueDay = Math.floor(t / MS_PER_DAY);
  const nowDay = Math.floor(now.getTime() / MS_PER_DAY);
  return dueDay - nowDay;
}

export function quoteValidity(q: Quote, now: Date = new Date()): QuoteValidity {
  if (!ACTIVE_STATUSES.has(q.status)) return 'none';
  const days = daysUntilValid(q, now);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= SOON_DAYS) return 'expiringSoon';
  return 'valid';
}

/** Listede/karttta gösterilecek kısa rozet metni. */
export function validityBadge(q: Quote, now: Date = new Date()): string | null {
  const v = quoteValidity(q, now);
  if (v === 'expired') return 'Süresi doldu';
  if (v === 'expiringSoon') {
    const d = daysUntilValid(q, now) ?? 0;
    return d === 0 ? 'Bugün doluyor' : `${d} gün kaldı`;
  }
  return null;
}
