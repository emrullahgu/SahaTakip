import { foldTr, matchesQuery, matchesAnyField } from '../search';

describe('foldTr — Türkçe aksan katlama', () => {
  it('Türkçe karakterleri ASCII\'ye katlar ve küçük harfe çevirir', () => {
    expect(foldTr('Güç Kontaktörü')).toBe('guc kontaktoru');
    expect(foldTr('ŞİĞÜÖÇ')).toBe('siguoc');
    expect(foldTr('İstanbul')).toBe('istanbul');
  });
  it('boş/undefined güvenli', () => {
    expect(foldTr('')).toBe('');
    expect(foldTr(null)).toBe('');
    expect(foldTr(undefined)).toBe('');
  });
});

describe('matchesQuery — aksan-toleranslı, kelime-bazlı', () => {
  it('aksansız sorgu aksanlı hedefi bulur (kontaktor → Kontaktör)', () => {
    expect(matchesQuery('Güç Kontaktörü 25A', 'kontaktor')).toBe(true);
    expect(matchesQuery('Güç Kontaktörü 25A', 'KONTAKTÖR')).toBe(true);
    expect(matchesQuery('Güç Kontaktörü 25A', 'kontaktör')).toBe(true);
  });
  it('çok kelimeli sorgu sıra şartı olmadan eşleşir (her token geçmeli)', () => {
    expect(matchesQuery('Siemens Güç Kontaktörü', 'kontaktor siemens')).toBe(true);
    expect(matchesQuery('Siemens Güç Kontaktörü', 'guc kontaktor')).toBe(true);
  });
  it('eşleşmeyen token varsa false', () => {
    expect(matchesQuery('Siemens Güç Kontaktörü', 'abb kontaktor')).toBe(false);
  });
  it('boş sorgu her şeyi eşleştirir; boş hedef eşleşmez', () => {
    expect(matchesQuery('herhangi', '')).toBe(true);
    expect(matchesQuery('', 'kontaktor')).toBe(false);
  });
});

describe('matchesAnyField — alanlar arası', () => {
  it('token\'lar farklı alanlarda olabilir (marka + ad)', () => {
    expect(matchesAnyField(['Güç Kontaktörü', 'KNT-25', 'Siemens', 'Pano'], 'siemens kontaktor')).toBe(true);
  });
  it('null/undefined alanlar atlanır', () => {
    expect(matchesAnyField(['Kontaktör', null, undefined], 'kontaktor')).toBe(true);
  });
});
