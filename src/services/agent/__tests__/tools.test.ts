// tools.test.ts — Agent araçları (match_poz_bulk toplu fiyat eşleştirme)
import { AGENT_TOOLS } from '../tools';

const ctx: any = { app: {}, currentUserName: 'Test', confirm: async () => true, log: () => {} };

describe('match_poz_bulk — toplu POZ/fiyat eşleştirme', () => {
  it('fiyatsız listeyi gerçek katalogla eşleştirir ve fiyat döner', async () => {
    const res = await AGENT_TOOLS['match_poz_bulk'].handler(
      {
        items: [
          { description: 'Ölüm Tehlike Levhası', quantity: 5, unit: 'Adet' },
          { description: 'kesinlikle-alakasiz-zzz-xyz-qwerty', quantity: 1 },
        ],
      },
      ctx,
    );
    expect(res.ok).toBe(true);
    expect(res.total).toBe(2);
    // 1. kalem kataloglda var → eşleşmeli ve sayısal fiyatı olmalı
    const first = res.items[0];
    expect(first.matched).toBeTruthy();
    expect(typeof first.matched.pozId).toBe('string');
    expect(typeof first.matched.materialPrice).toBe('number');
    expect(first.quantity).toBe(5);
    // alakasız kalem eşleşmemeli (null)
    expect(res.items[1].matched).toBeNull();
    // özet sayaçlar tutarlı
    expect(res.matched + res.unmatched).toBe(2);
  });

  it('boş liste için güvenli döner', async () => {
    const res = await AGENT_TOOLS['match_poz_bulk'].handler({ items: [] }, ctx);
    expect(res.ok).toBe(true);
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });
});

describe('set_quote_status — geçersiz durum DB\'ye yazılmaz (Teklifler ekranı çökmesini önler)', () => {
  it('bilinen sinonimi geçerli QuoteStatus\'a eşler', async () => {
    let written: any = null;
    const c: any = { ...ctx, app: { setQuoteStatus: (_id: string, s: string) => { written = s; } } };
    const res = await AGENT_TOOLS['set_quote_status'].handler({ id: 'x', status: 'Onaylandı' }, c);
    expect(res.ok).toBe(true);
    expect(written).toBe('Kabul Edildi'); // "Onaylandı" -> geçerli statü
  });

  it('tamamen geçersiz durumu reddeder, setQuoteStatus çağırmaz', async () => {
    let called = false;
    const c: any = { ...ctx, app: { setQuoteStatus: () => { called = true; } } };
    const res = await AGENT_TOOLS['set_quote_status'].handler({ id: 'x', status: 'zzz-yok' }, c);
    expect(res.ok).toBe(false);
    expect(called).toBe(false);
    expect(String(res.error)).toMatch(/Geçerli değerler/);
  });

  it('geçerli durumu olduğu gibi geçirir', async () => {
    let written: any = null;
    const c: any = { ...ctx, app: { setQuoteStatus: (_id: string, s: string) => { written = s; } } };
    const res = await AGENT_TOOLS['set_quote_status'].handler({ id: 'x', status: 'Müşteriye Gönderildi' }, c);
    expect(res.ok).toBe(true);
    expect(written).toBe('Müşteriye Gönderildi');
  });
});
