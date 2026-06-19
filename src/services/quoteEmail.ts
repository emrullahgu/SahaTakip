// ====================================================================
// quoteEmail.ts — POZ-DEV-037
// Teklif e-posta gönderimi.
//   - Online + Supabase Edge Function bulunduysa → 'send-quote-email' invoke.
//   - Yoksa → cihazın mail uygulamasını mailto: ile açar (her zaman çalışır).
// ====================================================================

import { Linking } from 'react-native';
import { openUrlSafe } from '../utils/urlGuard';
import { isOnlineMode } from './data/repository';
import { supabase } from './supabase';
import { quotePdfFileName } from './pdf';
import type { Quote } from '../types';

function quoteSummary(q: Quote): string {
  const lines = q.lines
    .slice(0, 8)
    .map((l, i) => `${i + 1}. ${l.pozName} — ${l.quantity} ${l.unit}`)
    .join('\n');
  const extra = q.lines.length > 8 ? `\n... (+${q.lines.length - 8} kalem daha)` : '';
  return `Sayın ${q.customerName},

${q.title} konulu ${q.number} numaralı teklifimizi ekte iletiyoruz.

Kalemler:
${lines}${extra}

Genel Toplam (KDV Dahil): ${q.grandTotal.toLocaleString('tr-TR')} ₺
Geçerlilik: ${q.validUntil ?? '—'}

Saygılarımızla,
${q.engineer}
SahaTakip Mühendislik`;
}

export async function sendQuoteEmail(
  quote: Quote,
  toEmail: string,
  pdfUri?: string,
): Promise<{ ok: boolean; mode: 'edge' | 'mailto' | 'none'; error?: string }> {
  const subject = `Teklif ${quote.number} — ${quote.title}`;
  const body = quoteSummary(quote);

  // 1) Bulutta Edge Function var mı? (deploy edilmemişse 404 atar → mailto'ya düşeriz)
  if (isOnlineMode()) {
    try {
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        // fileName: "KOBİNERJİ-KONU-NO.pdf" — müşteriye giden ek de bu adla gitsin
        // (cihaz paylaşımıyla AYNI ad). Brand tek kaynak client'ta.
        body: { to: toEmail, subject, html: body.replace(/\n/g, '<br/>'), quote, pdfUri, fileName: quotePdfFileName(quote) },
      });
      if (!error && data) {
        return { ok: true, mode: 'edge' };
      }
    } catch {
      // sessiz geç — mailto fallback'ine düşelim
    }
  }

  // 2) mailto: fallback — cihazın varsayılan mail uygulamasını aç
  const url = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await openUrlSafe(url);
    return { ok: true, mode: 'mailto' };
  }

  return { ok: false, mode: 'none', error: 'E-posta uygulaması bulunamadı.' };
}
