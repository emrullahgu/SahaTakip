// quoteInsert — teklif numarası çakışmasına (quotes_number_key 23505) dayanıklı insert.
// Kök neden: numara YEREL listeden üretilir; liste bayatsa (başka cihaz/sayfalama/
// yenilenmemiş) sunucudaki bir numarayla çakışır ve teklif HİÇ kaydedilemez. Çözüm:
// çakışmada sunucudaki GERÇEK max'tan yeni numara üretip RETRY. Saf + test edilebilir
// olması için DB/state bağımlılıkları enjekte edilir.
import type { Quote } from '../types';

/** quotes_number_key unique-violation (23505) mu? Hata kodu ya da mesaj kalıbından. */
export function isQuoteNumberDup(e: any): boolean {
  return (
    e?.code === '23505' ||
    /quotes_number_key|duplicate key value/i.test(String(e?.message || ''))
  );
}

export interface QuoteInsertDeps {
  /** Gerçek insert (başarısızsa fırlatır). */
  insert: (quote: Quote) => Promise<void>;
  /** Sunucudaki en yüksek numara sırası (prefix için); offline/hata → 0. */
  serverMaxSeq: (prefix: string) => Promise<number>;
  /** Yereldeki en yüksek numara sırası (prefix için). */
  localMaxSeq: (prefix: string) => number;
  /** Numara her değiştiğinde (optimistik UI güncellemesi için) çağrılır. */
  onNumberChange?: (quote: Quote) => void;
  /** Maksimum retry sayısı (varsayılan 5). */
  maxRetries?: number;
}

/**
 * Teklifi insert eder; numara çakışmasında (23505) sunucu+yerel max'tan yeni numara
 * üretip retry yapar. Başarıda KAYDEDİLEN (numarası güncellenmiş olabilir) teklifi döner.
 * Numara-dışı hatalar (RLS, ağ, vb.) anında yeniden fırlatılır.
 */
export async function insertQuoteWithNumberRetry(
  quote: Quote,
  prefix: string,
  deps: QuoteInsertDeps,
): Promise<Quote> {
  const maxRetries = deps.maxRetries ?? 5;
  let toSave = quote;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await deps.insert(toSave);
      return toSave; // başarı — kaydedilen teklif (güncel numarayla)
    } catch (e) {
      if (isQuoteNumberDup(e) && attempt < maxRetries) {
        const serverMax = await deps.serverMaxSeq(prefix).catch(() => 0);
        const localMax = deps.localMaxSeq(prefix);
        // +attempt+1 → serverMax sabit kalsa bile her denemede numara monoton artar.
        const nextSeq = Math.max(serverMax, localMax) + attempt + 1;
        toSave = { ...toSave, number: `${prefix}${String(nextSeq).padStart(4, '0')}` };
        deps.onNumberChange?.(toSave);
        continue;
      }
      throw e; // numara-dışı hata ya da retry tükendi
    }
  }
  return toSave; // erişilemez (döngü ya return ya throw eder)
}
