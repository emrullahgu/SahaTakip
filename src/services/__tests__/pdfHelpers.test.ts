// Ortak PDF yardımcıları: escapePdfHtml + pdfBrandHeader regresyonu.
// Ekran-içi PDF üreticileri (puantaj/mesai/denetim/yönetici) bu yardımcılarla
// tek tip marka başlığı + güvenli HTML-escape kullanır.
import { escapePdfHtml, pdfBrandHeader, PDF_BRAND_CSS } from '../pdf';
import { BRAND } from '../../config/brand';

describe('escapePdfHtml', () => {
  it('tüm tehlikeli HTML karakterlerini kaçırır', () => {
    expect(escapePdfHtml('<script>"&\'</script>')).toBe(
      '&lt;script&gt;&quot;&amp;&#039;&lt;/script&gt;',
    );
  });

  it('null/undefined girişte çökmez, boş string döner', () => {
    expect(escapePdfHtml(undefined as unknown as string)).toBe('');
    expect(escapePdfHtml(null as unknown as string)).toBe('');
  });
});

describe('pdfBrandHeader', () => {
  it('gömülü logo + gerçek firma adını içerir', () => {
    const h = pdfBrandHeader('PUANTAJ RAPORU', 'Haziran 2026');
    expect(h).toContain('data:image/png;base64,');
    expect(h).toContain(BRAND.company.name);
    expect(h).toContain('PUANTAJ RAPORU');
    expect(h).toContain('Haziran 2026');
  });

  it('başlık/altbaşlıktaki HTML enjeksiyonunu kaçırır', () => {
    const h = pdfBrandHeader('<img src=x onerror=alert(1)>', '<b>x</b>');
    expect(h).not.toContain('<img src=x onerror=alert(1)>');
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(h).not.toContain('<b>x</b>');
  });

  it('PDF_BRAND_CSS .pdf-brand sınıfını tanımlar', () => {
    expect(PDF_BRAND_CSS).toContain('.pdf-brand');
    expect(PDF_BRAND_CSS).toContain('.pdf-logo');
  });
});
