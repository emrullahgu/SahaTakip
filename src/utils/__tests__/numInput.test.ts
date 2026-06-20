import { parseNum, parseNonNeg, parseNonNegOr0 } from '../numInput';

describe('parseNum', () => {
  it('geçerli sayıyı döndürür', () => {
    expect(parseNum('12')).toBe(12);
    expect(parseNum('12.5')).toBe(12.5);
  });
  it('TR virgüllü ondalığı çevirir', () => {
    expect(parseNum('12,5')).toBe(12.5);
  });
  it('boş/whitespace → undefined', () => {
    expect(parseNum('')).toBeUndefined();
    expect(parseNum('   ')).toBeUndefined();
    expect(parseNum(null)).toBeUndefined();
  });
  it('geçersiz biçim → undefined (NaN sızdırmaz)', () => {
    expect(parseNum('12.3.4')).toBeUndefined();
    expect(parseNum('abc')).toBeUndefined();
  });
  it('min/max sınırını uygular', () => {
    expect(parseNum('-5', { min: 0 })).toBeUndefined();
    expect(parseNum('5', { min: 0 })).toBe(5);
    expect(parseNum('3000', { max: 2027 })).toBeUndefined();
  });
});

describe('parseNonNeg / parseNonNegOr0', () => {
  it('negatifi reddeder', () => {
    expect(parseNonNeg('-3')).toBeUndefined();
    expect(parseNonNeg('3')).toBe(3);
  });
  it('parseNonNegOr0 geçersiz/negatifi 0 yapar', () => {
    expect(parseNonNegOr0('-3')).toBe(0);
    expect(parseNonNegOr0('abc')).toBe(0);
    expect(parseNonNegOr0('7,5')).toBe(7.5);
  });
});
