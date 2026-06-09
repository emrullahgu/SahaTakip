// search.ts — Türkçe-duyarlı, aksan-toleranslı arama yardımcıları.
// Amaç: "kontaktör" ararken "kontaktor", "Kontaktor", "KONTAKTÖR" hepsi bulunsun;
// çok kelimeli sorgu (ör. "siemens kontaktor") sıra/bitişiklik şartı olmadan eşleşsin.
// Birebir isim aranmaz — her kelime (token) hedef metinde geçiyorsa eşleşir.

const TR_FOLD: Record<string, string> = {
  ş: 's', Ş: 's', ı: 'i', İ: 'i', ğ: 'g', Ğ: 'g',
  ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
  â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
};

// Birleşik aksan işaretleri (NFD sonrası): U+0300–U+036F
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Türkçe karakterleri ASCII'ye katlar, aksanları siler, küçük harfe çevirir.
 *  "Güç Kontaktörü" → "guc kontaktoru" — böylece aksansız yazım da eşleşir. */
export function foldTr(s: string | null | undefined): string {
  if (!s) return '';
  let mapped = '';
  for (const ch of s) mapped += TR_FOLD[ch] ?? ch;
  // NFD + birleşik aksan işaretlerini sil (kalan é, ô vb. için güvenlik ağı).
  return mapped.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** Sorgudaki HER kelime (token) hedef metinde (aksan-katlanmış) geçiyorsa true.
 *  Birebir isim gerekmez; sıra önemsiz. Boş sorgu → her şey eşleşir. */
export function matchesQuery(haystack: string | null | undefined, query: string | null | undefined): boolean {
  const q = foldTr(query).trim();
  if (!q) return true;
  const hay = foldTr(haystack);
  if (!hay) return false;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

/** Birden çok alanı tek metinde birleştirip eşleştirir (ad+kod+marka+kategori vb.).
 *  Token'lar alanlar ARASINDA eşleşebilir (ör. "siemens kontaktor"). */
export function matchesAnyField(fields: Array<string | null | undefined>, query: string | null | undefined): boolean {
  return matchesQuery(fields.filter(Boolean).join(' '), query);
}
