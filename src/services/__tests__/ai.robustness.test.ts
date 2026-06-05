// AI SAĞLAMLIK + UYDURMA-YASAĞI stres testi.
// Sağlayıcı yokken (mock) yerel fallback'ler çalışmalı; match_poz_bulk ASLA
// fiyat uydurmamalı (güvensiz/birim-uyumsuz eşleşmeler manuel işaretlenir).
import { decomposeSurveyToItems, suggestPozFromDescription, normalizeClaudeModel } from '../ai';
import { AGENT_TOOLS } from '../agent/tools';
import { POZ_CATALOG } from '../../data/pozCatalog';

const priceSet = new Set(
  POZ_CATALOG.flatMap(p => [p.materialPrice, p.installPrice, p.materialPrice + p.installPrice]),
);

describe('match_poz_bulk — UYDURMA YASAĞI (en kritik garanti)', () => {
  const run = (items: any[]) => (AGENT_TOOLS.match_poz_bulk.handler as any)({ items });

  it('katalog dışı saçma kalem OTOMATİK fiyatlanmaz (matched=null, needsManualPrice)', async () => {
    const r = await run([{ description: 'XJ-9000 uzay trafosu ışınlama modülü', quantity: 3 }]);
    expect(r.items[0].matched).toBeNull();
    expect(r.items[0].needsManualPrice).toBe(true);
  });

  it('OTOMATİK fiyatlanan her kalemin fiyatı KATALOGDAN gelir (uydurma değil)', async () => {
    const r = await run([
      { description: 'pano' }, { description: 'kablo' }, { description: 'trafo' },
      { description: 'sigorta' }, { description: 'priz anahtar' }, { description: 'XYZ saçma 123' },
    ]);
    for (const it of r.items) {
      if (it.matched) {
        // Fiyatın katalogda gerçekten var olduğunu doğrula
        expect(priceSet.has(it.matched.materialPrice)).toBe(true);
        expect(priceSet.has(it.matched.installPrice)).toBe(true);
        const cat = POZ_CATALOG.find(p => p.id === it.matched.pozId);
        expect(cat).toBeTruthy();
        expect(it.matched.materialPrice).toBe(cat!.materialPrice);
      }
    }
  });

  it('birim uyuşmazlığı (kg ↔ adet) OTOMATİK fiyatlanmaz, suggestion+conflict döner', async () => {
    // Katalogdan adet birimli bir kalem seç, onu "kg" isteyerek çağır
    const adetItem = POZ_CATALOG.find(p => /adet/i.test(p.unit));
    if (adetItem) {
      const r = await run([{ description: adetItem.name, unit: 'kg' }]);
      expect(r.items[0].matched).toBeNull(); // birim uyumsuz → otomatik fiyat YOK
      // suggestion olabilir ama needsManualPrice true olmalı
      expect(r.items[0].needsManualPrice).toBe(true);
    }
  });

  it('boş liste çökmez', async () => {
    const r = await run([]);
    expect(r.ok).toBe(true);
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });

  it('HACİM: 120 kalem sorunsuz; her kalem ya katalogdan ya manuel (asla uydurma)', async () => {
    const items = Array.from({ length: 120 }, (_, i) => ({ description: i % 2 ? 'kablo kanal' : 'zzz-saçma-' + i, quantity: i + 1 }));
    const r = await run(items);
    expect(r.items.length).toBe(120);
    expect(r.matched + r.needsReview).toBe(120);
    for (const it of r.items) {
      // Ya güvenli katalog eşleşmesi (matched) ya da manuel — ikisinin arası yok
      expect(it.matched ? !it.needsManualPrice : it.needsManualPrice).toBe(true);
    }
  });
});

describe('decomposeSurveyToItems — sağlayıcı yokken YEREL fallback', () => {
  it('çok satırlı/noktalı virgüllü notu kalemlere böler', async () => {
    const items = await decomposeSurveyToItems('Salona 6 spot\nMutfağa 3 priz; 2 adet sigorta');
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.every(i => typeof i.description === 'string' && i.description.length > 0)).toBe(true);
  });

  it('basit miktar yakalar ("3 adet")', async () => {
    const items = await decomposeSurveyToItems('3 adet LED armatür');
    expect(items[0].quantity).toBe(3);
  });

  it('boş metin → boş dizi', async () => {
    expect(await decomposeSurveyToItems('')).toEqual([]);
    expect(await decomposeSurveyToItems('   ')).toEqual([]);
  });

  it('tek satır → en az 1 kalem, miktar varsayılan 1', async () => {
    const items = await decomposeSurveyToItems('komple elektrik tesisatı');
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].quantity).toBeGreaterThanOrEqual(1);
  });

  it('çok büyük girdi çökmeden işlenir (cap 20)', async () => {
    const big = Array.from({ length: 100 }, (_, i) => `Kalem ${i} açıklama`).join('\n');
    const items = await decomposeSurveyToItems(big);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(20);
  });
});

describe('suggestPozFromDescription — yerel anahtar kelime fallback', () => {
  it('anlamlı sorgu için eşleşme döner, skorla sıralı', async () => {
    const res = await suggestPozFromDescription('trafo bakım');
    expect(Array.isArray(res)).toBe(true);
    for (let i = 1; i < res.length; i++) expect(res[i - 1].score).toBeGreaterThanOrEqual(res[i].score);
  });

  it('boş/çöp girdi çökmez', async () => {
    expect(await suggestPozFromDescription('')).toEqual([]);
    const garbage = await suggestPozFromDescription('zzzz qqqq ;;;; 🤖');
    expect(Array.isArray(garbage)).toBe(true);
  });
});

describe('normalizeClaudeModel — emekli model yükseltme', () => {
  it('boş/undefined için varsayılan döner', () => {
    expect(typeof normalizeClaudeModel(undefined)).toBe('string');
    expect(normalizeClaudeModel(undefined).length).toBeGreaterThan(0);
  });
  it('geçerli model adını korur veya geçerliye yükseltir (claude içerir)', () => {
    const m = normalizeClaudeModel('claude-3-5-sonnet-20241022');
    expect(m).toMatch(/claude/);
  });
});
