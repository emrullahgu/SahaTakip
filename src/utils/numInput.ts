// numInput — kullanıcı sayı girdilerini GÜVENLİ ayrıştırma (NaN/negatif/üst-sınır koruması).
// Yaygın hatalı desen `x ? Number(x) : undefined` truthy ama geçersiz string'i ("12.3.4",
// "-5") yutmaz → NaN/negatif saklanan veriye sızıp istatistik/değerleme bozar. Bu helper
// virgüllü ondalığı (TR) çevirir ve sınır dışını undefined'a indirir.

export interface NumOpts {
  min?: number;   // dahil alt sınır
  max?: number;   // dahil üst sınır
}

/** Geçerli + sınır içindeyse sayı, aksi halde undefined. Boş/whitespace → undefined. */
export function parseNum(s: unknown, opts: NumOpts = {}): number | undefined {
  const raw = String(s ?? '').replace(',', '.').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (opts.min != null && n < opts.min) return undefined;
  if (opts.max != null && n > opts.max) return undefined;
  return n;
}

/** Negatif olmayan miktar/fiyat; geçersizse undefined. */
export const parseNonNeg = (s: unknown): number | undefined => parseNum(s, { min: 0 });

/** Geçersiz/negatifi 0'a indirir (kontrollü girdi alanlarında varsayılan). */
export const parseNonNegOr0 = (s: unknown): number => parseNonNeg(s) ?? 0;
