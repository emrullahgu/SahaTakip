import { localDateISO } from '../date';

describe('localDateISO', () => {
  it('verilen tarihi yerel YYYY-MM-DD biçiminde döndürür', () => {
    // Yerel saatle 2026-06-08 09:30 → "2026-06-08" (UTC kayması yok).
    const d = new Date(2026, 5, 8, 9, 30, 0); // ay 0-tabanlı: 5 = Haziran
    expect(localDateISO(d)).toBe('2026-06-08');
  });

  it('tek haneli ay/günü sıfırla doldurur', () => {
    const d = new Date(2026, 0, 3, 12, 0, 0); // 3 Ocak 2026
    expect(localDateISO(d)).toBe('2026-01-03');
  });

  it('argümansız çağrıda bugünün yerel tarihini verir', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(localDateISO()).toBe(expected);
  });
});
