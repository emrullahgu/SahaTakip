// aiCopilot.formatKbContext — bütçe-farkında KB bağlam biçimleme.
import { formatKbContext } from '../aiCopilot';

describe('formatKbContext — KB bağlam bütçesi', () => {
  it('boş liste → boş string', () => {
    expect(formatKbContext([])).toBe('');
  });

  it('TEK uzun döküman bütçenin çoğunu alır (eski 1200 kırpması düzeldi)', () => {
    const long = 'A'.repeat(9000);
    const out = formatKbContext([{ title: 'Kılavuz', content: long }], 9000);
    // Eskiden sadece 1200 karakter kalıyordu; artık ~9000.
    expect(out.length).toBeGreaterThan(8000);
    expect(out).toContain('### Kılavuz');
  });

  it('çok döküman bütçeyi paylaşır, her biri min 1500 karakter', () => {
    const docs = Array.from({ length: 5 }, (_, i) => ({ title: 'D' + i, content: 'X'.repeat(5000) }));
    const out = formatKbContext(docs, 9000);
    // 9000/5=1800 → her doc 1800 karaktere kırpılır
    for (let i = 0; i < 5; i++) expect(out).toContain('### D' + i);
    expect(out).toContain('…(kısaltıldı)');
  });

  it('kısa döküman kırpılmaz (kısaltıldı eklenmez)', () => {
    const out = formatKbContext([{ title: 'Not', content: 'kısa içerik' }], 9000);
    expect(out).toBe('### Not\nkısa içerik');
    expect(out).not.toContain('kısaltıldı');
  });

  it('uzun içerik kırpılınca işaret eklenir', () => {
    const out = formatKbContext([{ title: 'T', content: 'Y'.repeat(20000) }], 3000);
    expect(out).toContain('…(kısaltıldı)');
    expect(out.length).toBeLessThan(3100);
  });
});
