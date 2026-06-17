// money.ts — Tek kaynak TL para biçimlendirme.
// Uygulama genelinde `₺${x.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`
// deseni 200+ dosyada tekrar ediyordu (kimi yerde ondalık var/yok → tutarsızlık).
// formatTRY mevcut inline desenle BIT-BENZER çıktı üretir (görsel regresyon yok)
// ve gelecekte para biçimi değişikliğini tek yere indirir.

/** `1234.5` → `₺1.234,5` · `0`/undefined/NaN → `₺0`. İşaret korunur. */
export function formatTRY(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
}

/** Sembolsüz sayısal biçim (`1.234,56`) — tablo/CSV sütunları için. */
export function formatNumberTR(value: number | null | undefined, fractionDigits = 2): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('tr-TR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}
