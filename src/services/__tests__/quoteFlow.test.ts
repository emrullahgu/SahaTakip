// quoteFlow — teklif durum geçiş guard'ı (Kural 9)
import { canTransitionQuote, QUOTE_NEXT_STATUS } from '../quoteFlow';

describe('canTransitionQuote', () => {
  test('aynı duruma geçiş daima serbest (idempotent)', () => {
    expect(canTransitionQuote('Taslak', 'Taslak')).toBe(true);
    expect(canTransitionQuote('Faturalandırıldı', 'Faturalandırıldı')).toBe(true);
  });

  test('meşru ileri geçişlere izin verir', () => {
    expect(canTransitionQuote('Taslak', 'Onay Bekliyor')).toBe(true);
    expect(canTransitionQuote('Onay Bekliyor', 'Müşteriye Gönderildi')).toBe(true);
    expect(canTransitionQuote('Müşteriye Gönderildi', 'Kabul Edildi')).toBe(true);
    expect(canTransitionQuote('Kabul Edildi', 'Faturalandırıldı')).toBe(true);
  });

  test('atlamalı/geçersiz geçişleri REDDEDER (AI Taslak→Faturalandırıldı koruması)', () => {
    expect(canTransitionQuote('Taslak', 'Faturalandırıldı')).toBe(false);
    expect(canTransitionQuote('Taslak', 'Kabul Edildi')).toBe(false);
    expect(canTransitionQuote('Onay Bekliyor', 'Faturalandırıldı')).toBe(false);
  });

  test('Faturalandırıldı terminal — hiçbir yere gitmez', () => {
    expect(QUOTE_NEXT_STATUS['Faturalandırıldı']).toEqual([]);
    expect(canTransitionQuote('Faturalandırıldı', 'Taslak')).toBe(false);
  });

  test('Reddedildi yeniden açılabilir', () => {
    expect(canTransitionQuote('Reddedildi', 'Taslak')).toBe(true);
  });
});
