// Servis Formu (müşteri imzalı, müşteriye giden belge) marka + güvenlik regresyonu.
import { buildWorkOrderHtml } from '../workOrderPdf';
import { BRAND } from '../../config/brand';
import type { WorkOrder } from '../../types';

const wo = {
  id: 'WO-2026-0001',
  date: '2026-06-03',
  client: 'Acme <A.Ş.> & "Ortak"',
  serviceName: 'Trafo Bakımı',
  assignedToName: 'Mühendis',
  engineer: 'Mühendis',
  status: 'Tamamlandı',
  notes: 'Pano kontrol edildi.',
  materials: [{ name: 'Sigorta', qty: 2, price: 100 }],
} as unknown as WorkOrder;

describe('buildWorkOrderHtml — marka & güvenlik', () => {
  const html = buildWorkOrderHtml(wo);

  it('gömülü logo + firma iletişim bilgilerini (telefon/VKN) içerir', () => {
    expect(html).toContain('data:image/png;base64,');
    expect(html).toContain(BRAND.company.phone);
    expect(html).toContain(BRAND.company.taxNumber);
  });

  it('müşteri adındaki HTML karakterlerini kaçırır (bozuk layout/enjeksiyon önler)', () => {
    expect(html).toContain('Acme &lt;A.Ş.&gt; &amp; &quot;Ortak&quot;');
    expect(html).not.toContain('Acme <A.Ş.>');
  });

  it('@page margin:0 ile tarayıcı başlık/altbilgi basmaz', () => {
    expect(html).toMatch(/@page\s*\{[^}]*margin:\s*0/);
  });
});
