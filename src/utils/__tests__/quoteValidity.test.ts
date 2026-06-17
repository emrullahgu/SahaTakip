// quoteValidity.test.ts — teklif geçerlilik durumu (deterministik: now enjekte)
import { quoteValidity, daysUntilValid, validityBadge } from '../quoteValidity';
import type { Quote } from '../../types';

const NOW = new Date('2026-06-17T12:00:00.000Z');
const mk = (over: Partial<Quote>): Quote => ({
  id: 'q', number: 'QT-1', customerName: 'X', title: 'T', date: '2026-06-01',
  engineer: 'E', lines: [], status: 'Müşteriye Gönderildi', subtotal: 0, vatTotal: 0, grandTotal: 0,
  ...over,
} as Quote);

describe('quoteValidity', () => {
  it('validUntil yok → none', () => {
    expect(quoteValidity(mk({}), NOW)).toBe('none');
  });
  it('geçmiş tarih + aktif durum → expired', () => {
    expect(quoteValidity(mk({ validUntil: '2026-06-10' }), NOW)).toBe('expired');
  });
  it('3 gün sonrası → expiringSoon', () => {
    expect(quoteValidity(mk({ validUntil: '2026-06-20' }), NOW)).toBe('expiringSoon');
  });
  it('30 gün sonrası → valid', () => {
    expect(quoteValidity(mk({ validUntil: '2026-07-17' }), NOW)).toBe('valid');
  });
  it('kapanmış teklif (Kabul Edildi) → tarih geçmiş olsa bile none', () => {
    expect(quoteValidity(mk({ validUntil: '2026-06-10', status: 'Kabul Edildi' }), NOW)).toBe('none');
  });
  it('bozuk tarih → none', () => {
    expect(quoteValidity(mk({ validUntil: 'gecersiz-tarih' }), NOW)).toBe('none');
  });
});

describe('daysUntilValid / validityBadge', () => {
  it('kalan gün sayısı doğru', () => {
    expect(daysUntilValid(mk({ validUntil: '2026-06-20' }), NOW)).toBe(3);
  });
  it('expired rozet metni', () => {
    expect(validityBadge(mk({ validUntil: '2026-06-10' }), NOW)).toBe('Süresi doldu');
  });
  it('expiringSoon rozet metni', () => {
    expect(validityBadge(mk({ validUntil: '2026-06-20' }), NOW)).toBe('3 gün kaldı');
  });
  it('valid → rozet yok', () => {
    expect(validityBadge(mk({ validUntil: '2026-07-17' }), NOW)).toBeNull();
  });
});
