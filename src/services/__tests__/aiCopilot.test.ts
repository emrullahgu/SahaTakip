// aiCopilot.formatKbContext — bütçe-farkında KB bağlam biçimleme.
import { formatKbContext, queryTokens, pickRelevant } from '../aiCopilot';

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

describe('queryTokens — sorgu token çıkarımı', () => {
  it('≥3 karakter token döndürür, kısa kelimeleri atar', () => {
    // 'ev' (2) atılır; 'sm' (2) atılır; geri kalan ≥3 tutulur.
    expect(queryTokens('Ev sm teklif yap')).toEqual(['teklif', 'yap']);
  });

  it('Türkçe küçük harf + noktalama temizliği', () => {
    expect(queryTokens('ACME A.Ş. bakiyesi?')).toEqual(['acme', 'bakiyesi']);
  });

  it('tekrar eden token tek sefer', () => {
    expect(queryTokens('trafo trafo bakım')).toEqual(['trafo', 'bakım']);
  });

  it('boş/anlamsız sorgu → boş dizi', () => {
    expect(queryTokens('a, b. c!')).toEqual([]);
  });
});

describe('pickRelevant — sorguyla eşleşen kayıt seçimi', () => {
  const items = [
    { id: '1', name: 'ACME Elektrik' },
    { id: '2', name: 'Beta Enerji' },
    { id: '3', name: 'Gamma Trafo Bakım' },
  ];
  const fields = (it: { name: string }) => it.name;

  it('eşleşen kaydı bulur', () => {
    const out = pickRelevant(items, queryTokens('acme bakiyesi'), fields);
    expect(out.map(x => x.id)).toEqual(['1']);
  });

  it('token sayısına göre skorlar (çok eşleşen önce)', () => {
    const out = pickRelevant(items, queryTokens('trafo bakım'), fields);
    expect(out[0].id).toBe('3');
  });

  it('eşleşme yoksa boş', () => {
    expect(pickRelevant(items, queryTokens('hiçbiri yok burada'), fields)).toEqual([]);
  });

  it('boş token → boş (tüm listeyi DÖNDÜRMEZ)', () => {
    expect(pickRelevant(items, [], fields)).toEqual([]);
  });

  it('max sınırına uyar', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: 'trafo ' + i }));
    expect(pickRelevant(many, ['trafo'], it => it.name, 6)).toHaveLength(6);
  });
});
