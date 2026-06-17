// csvExport.test.ts — CSV formül enjeksiyonu + RFC4180 kaçışı (SEC-04).
import { escapeCell, buildCsv } from '../csvExport';

describe('escapeCell — formül enjeksiyonu nötralizasyonu', () => {
  it('= ile başlayan hücreyi tek tırnakla nötralize eder', () => {
    expect(escapeCell('=1+1')).toBe("'=1+1");
  });
  it('= + çift tırnak: hem nötralize hem RFC4180 sarma', () => {
    // =HYPERLINK("x") → önce \' eklenir, sonra " içerdiği için sarılır + ikilenir
    expect(escapeCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
  it('+, -, @ prefix\'leri de nötralize edilir', () => {
    expect(escapeCell('+1')).toBe("'+1");
    expect(escapeCell('-1')).toBe("'-1");
    expect(escapeCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
  it('normal metin değişmez', () => {
    expect(escapeCell('Ahmet Yılmaz')).toBe('Ahmet Yılmaz');
    expect(escapeCell(42)).toBe('42');
  });
  it('çift tırnak içeren hücre RFC4180 ile kaçırılır (ikilenir + sarılır)', () => {
    expect(escapeCell('a"b')).toBe('"a""b"');
  });
  it('noktalı virgül içeren hücre tırnağa alınır (sütun kaymaz)', () => {
    expect(escapeCell('a;b')).toBe('"a;b"');
  });
  it('null/undefined → boş string', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });
});

describe('buildCsv — satır birleştirme', () => {
  it('başlık + veri satırlarını ; ve CRLF ile birleştirir, tehlikeli hücreyi escape eder', () => {
    const csv = buildCsv([
      ['Ad', 'Tutar'],
      ['=cmd', 1000],
    ]);
    expect(csv).toBe('Ad;Tutar\r\n\'=cmd;1000');
  });
});
