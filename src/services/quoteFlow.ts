// ====================================================================
// quoteFlow — Teklif durum-makinesi geçiş kuralları (Kural 9)
// ====================================================================
// "draft / ready-for-review / approved" ayrımı yalnız etiket değil, DAVRANIŞSAL
// olarak korunmalı. workOrderFlow.NEXT_STATUS deseninin teklif karşılığı.
// Önceden setQuoteStatus herhangi bir duruma serbestçe atlayabiliyordu (AI 'Taslak'tan
// doğrudan 'Faturalandırıldı'ya geçebilirdi). Bu tablo geçersiz/atlamalı geçişleri reddeder.
//
// NOT: 'Kabul Edildi'ye GEÇİŞ normalde setQuoteStatus'ten DEĞİL,
// acceptQuoteAndCreateWorkOrder akışından yapılır (iş emri de oluşur). Tablo yine de
// Müşteriye Gönderildi→Kabul Edildi'ye izin verir (idempotent/elle düzeltme), ama
// Taslak→Kabul Edildi gibi atlamalar engellenir.

import type { QuoteStatus } from '../types';

/** Her durumdan geçilebilecek hedef durumlar. Boş = terminal. */
export const QUOTE_NEXT_STATUS: Record<QuoteStatus, QuoteStatus[]> = {
  'Taslak': ['Onay Bekliyor', 'Müşteriye Gönderildi', 'Reddedildi'],
  'Onay Bekliyor': ['Müşteriye Gönderildi', 'Taslak', 'Reddedildi'],
  'Müşteriye Gönderildi': ['Kabul Edildi', 'Reddedildi', 'Onay Bekliyor', 'Taslak'],
  'Kabul Edildi': ['Faturalandırıldı', 'Müşteriye Gönderildi'],
  'Reddedildi': ['Taslak', 'Onay Bekliyor', 'Müşteriye Gönderildi'], // yeniden aç
  'Faturalandırıldı': [], // terminal
};

/**
 * from→to geçişine izin var mı? Aynı duruma geçiş (idempotent no-op) DAİMA serbesttir.
 * Bilinmeyen 'from' (bozuk veri) → engelleme; geçişe izin ver (geriye-uyum).
 */
export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  if (from === to) return true;
  const allowed = QUOTE_NEXT_STATUS[from];
  if (!allowed) return true; // tanımsız kaynak durum → bloklamayı zorlama
  return allowed.includes(to);
}
