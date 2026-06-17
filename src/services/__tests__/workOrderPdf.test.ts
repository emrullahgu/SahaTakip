// Servis Formu (müşteri imzalı, müşteriye giden belge) marka + güvenlik regresyonu.
import { buildWorkOrderHtml, signatureToSvg } from '../workOrderPdf';
import { BRAND } from '../../config/brand';
import type { WorkOrder } from '../../types';

// SignaturePad biçiminde (data:application/json;base64) imza üret.
function makeJsonSignature(strokes: { x: number; y: number; start?: boolean }[]): string {
  const json = JSON.stringify({ v: 1, w: 300, h: 150, strokes });
  const b64 = Buffer.from(json, 'utf-8').toString('base64');
  return `data:application/json;base64,${b64}`;
}

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

describe('signatureToSvg — imza stroke JSON → inline SVG', () => {
  it('geçerli JSON imzayı SVG path\'lerine çevirir', () => {
    const sig = makeJsonSignature([
      { x: 10, y: 10, start: true }, { x: 40, y: 30 }, { x: 70, y: 12 },
      { x: 90, y: 50, start: true }, { x: 120, y: 20 },
    ]);
    const svg = signatureToSvg(sig);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 300 150"');
    // İki ayrı stroke (start bayrağı) → iki path.
    expect((svg!.match(/<path /g) || []).length).toBe(2);
    expect(svg).toContain('M10.0,10.0');
  });

  it('data:image/png imzası için null döner (çağıran <img> kullanır)', () => {
    expect(signatureToSvg('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
  });

  it('http URL ve boş/undefined için null döner', () => {
    expect(signatureToSvg('https://x/sig.png')).toBeNull();
    expect(signatureToSvg(undefined)).toBeNull();
    expect(signatureToSvg('')).toBeNull();
  });

  it('tek nokta / bozuk veri → null (çizilecek çizgi yok)', () => {
    expect(signatureToSvg(makeJsonSignature([{ x: 5, y: 5, start: true }]))).toBeNull();
    expect(signatureToSvg('data:application/json;base64,bozuk!!!')).toBeNull();
  });

  it('Servis Formu HTML\'inde imza SVG olarak gömülür, bozuk <img> değil', () => {
    const sig = makeJsonSignature([{ x: 1, y: 1, start: true }, { x: 2, y: 2 }, { x: 3, y: 1 }]);
    const out = buildWorkOrderHtml({ ...wo, signatureUri: sig } as WorkOrder);
    expect(out).toContain('<svg');
    expect(out).not.toContain('src="data:application/json');
  });
});
