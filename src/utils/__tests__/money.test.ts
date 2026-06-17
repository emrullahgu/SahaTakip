// money.test.ts — formatTRY tek-kaynak para biçimi
import { formatTRY, formatNumberTR } from '../money';

describe('formatTRY', () => {
  it('binlik ayraç + virgül ondalık (tr-TR)', () => {
    expect(formatTRY(1234.5)).toBe('₺1.234,5');
    expect(formatTRY(1234567.89)).toBe('₺1.234.567,89');
  });
  it('sıfır / undefined / null / NaN → ₺0', () => {
    expect(formatTRY(0)).toBe('₺0');
    expect(formatTRY(undefined)).toBe('₺0');
    expect(formatTRY(null)).toBe('₺0');
    expect(formatTRY(NaN)).toBe('₺0');
  });
  it('negatif değer işareti korur', () => {
    expect(formatTRY(-50)).toBe('₺-50');
  });
  it('inline desenle bit-benzer (maximumFractionDigits: 2)', () => {
    const x = 9999.999;
    expect(formatTRY(x)).toBe('₺' + x.toLocaleString('tr-TR', { maximumFractionDigits: 2 }));
  });
});

describe('formatNumberTR', () => {
  it('sabit ondalık basamak', () => {
    expect(formatNumberTR(1234.5)).toBe('1.234,50');
    expect(formatNumberTR(1000, 0)).toBe('1.000');
  });
  it('geçersiz → 0 biçimli', () => {
    expect(formatNumberTR(undefined)).toBe('0,00');
  });
});
