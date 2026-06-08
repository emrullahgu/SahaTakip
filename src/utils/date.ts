// date.ts — tarih yardımcıları.

/**
 * Cihazın YEREL saatine göre YYYY-MM-DD döndürür (UTC kayması olmadan).
 * `new Date().toISOString().slice(0,10)` UTC'ye çevirir; UTC+3'te gece yarısı
 * civarı bir gün geri/ileri kayabiliyordu (iş emri/rapor tarihleri yanlış).
 */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
