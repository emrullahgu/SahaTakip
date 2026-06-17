// tools.test.ts — Agent araçları (match_poz_bulk toplu fiyat eşleştirme)
import { AGENT_TOOLS } from '../tools';
import { POZ_CATALOG } from '../../../data/pozCatalog';

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
    expect(res.matched + res.needsReview).toBe(2);
  });

  it('boş liste için güvenli döner', async () => {
    const res = await AGENT_TOOLS['match_poz_bulk'].handler({ items: [] }, ctx);
    expect(res.ok).toBe(true);
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });

  it('birim uyuşmazlığında (kg ↔ adet) otomatik fiyatlandırmaz → manuel fiyat işaretler', async () => {
    // Aynı kalem "Adet" iken eşleşir; "kğ" verilince fiyat güvenilmez olur (kg miktarı
    // adet fiyatıyla çarpılırsa toplam patlar) → matched=null, needsManualPrice=true.
    const res = await AGENT_TOOLS['match_poz_bulk'].handler(
      { items: [{ description: 'Ölüm Tehlike Levhası', quantity: 2785, unit: 'kğ' }] },
      ctx,
    );
    const o = res.items[0];
    expect(o.matched).toBeNull();
    expect(o.needsManualPrice).toBe(true);
    expect(o.suggestion).toBeTruthy();
    expect(String(o.suggestion.reason)).toMatch(/[Bb]irim/);
  });

  it('jenerik dolgu kelimeleri tek başına eşleşme üretmez', async () => {
    // "sarf malzemesi dahil" gibi yalnız dolgu kelimeleri → eşleşme yok
    const res = await AGENT_TOOLS['match_poz_bulk'].handler(
      { items: [{ description: 'sarf malzemesi dahil montaj', quantity: 1000, unit: 'kğ' }] },
      ctx,
    );
    expect(res.items[0].matched).toBeNull();
  });
});

describe('set_quote_status — geçersiz durum DB\'ye yazılmaz (Teklifler ekranı çökmesini önler)', () => {
  it('bilinen sinonimi geçerli QuoteStatus\'a eşler', async () => {
    let written: any = null;
    const c: any = { ...ctx, app: { setQuoteStatus: (_id: string, s: string) => { written = s; return { ok: true }; } } };
    const res = await AGENT_TOOLS['set_quote_status'].handler({ id: 'x', status: 'Onaylandı' }, c);
    expect(res.ok).toBe(true);
    expect(written).toBe('Kabul Edildi'); // "Onaylandı" -> geçerli statü
  });

  it('tamamen geçersiz durumu reddeder, setQuoteStatus çağırmaz', async () => {
    let called = false;
    const c: any = { ...ctx, app: { setQuoteStatus: () => { called = true; return { ok: true }; } } };
    const res = await AGENT_TOOLS['set_quote_status'].handler({ id: 'x', status: 'zzz-yok' }, c);
    expect(res.ok).toBe(false);
    expect(called).toBe(false);
    expect(String(res.error)).toMatch(/Geçerli değerler/);
  });

  it('geçerli durumu olduğu gibi geçirir', async () => {
    let written: any = null;
    const c: any = { ...ctx, app: { setQuoteStatus: (_id: string, s: string) => { written = s; return { ok: true }; } } };
    const res = await AGENT_TOOLS['set_quote_status'].handler({ id: 'x', status: 'Müşteriye Gönderildi' }, c);
    expect(res.ok).toBe(true);
    expect(written).toBe('Müşteriye Gönderildi');
  });
});

describe('sistem-farkındalığı read-tool\'ları (agent tüm sistemi tanır)', () => {
  it('beş yeni read-tool AGENT_TOOLS\'a kayıtlı', () => {
    for (const name of ['get_fleet_status', 'get_inventory_status', 'get_finance_summary', 'get_work_order_detail', 'get_customer_detail']) {
      expect(AGENT_TOOLS[name]).toBeTruthy();
      expect(AGENT_TOOLS[name].schema.function.name).toBe(name);
    }
  });

  it('get_work_order_detail id veya numara ile iş emrini bulur, yoksa hata döner', async () => {
    const wo: any = { id: 'WO-1', client: 'ACME', serviceName: 'Bakım', status: 'Başladı', materials: [{ name: 'Kablo', qty: 2, price: 10 }], number: 'WO-1' };
    const c: any = { ...ctx, app: { workOrders: [wo], quotes: [], customers: [] } };
    const ok = await AGENT_TOOLS['get_work_order_detail'].handler({ id: 'WO-1' }, c);
    expect(ok.ok).toBe(true);
    expect(ok.workOrder.client).toBe('ACME');
    expect(ok.materials).toHaveLength(1);
    const miss = await AGENT_TOOLS['get_work_order_detail'].handler({ id: 'YOK' }, c);
    expect(miss.ok).toBe(false);
  });

  it('get_customer_detail müşteriyi + tekliflerini + iş emirlerini döner (gerçek veri)', async () => {
    const cust: any = { id: 'cu1', shortName: 'DİNÇER', title: 'Dinçer A.Ş.' };
    const quote: any = { id: 'q1', number: 'QT-1', customerName: 'DİNÇER', title: 'T', status: 'Taslak', date: '2026-06-04', grandTotal: 100 };
    const wo: any = { id: 'w1', client: 'DİNÇER', serviceName: 'S', status: 'Bekliyor' };
    const c: any = { ...ctx, app: { customers: [cust], quotes: [quote], workOrders: [wo] } };
    const res = await AGENT_TOOLS['get_customer_detail'].handler({ customerId: 'DİNÇER' }, c);
    expect(res.ok).toBe(true);
    expect(res.quotes).toHaveLength(1);
    expect(res.workOrders).toHaveLength(1);
    expect(Array.isArray(res.payments)).toBe(true); // servis offline → boş ama dizi
  });
});

describe('analyze_system_health — pasif personele atanmış iş (assignedToId kanonik alan)', () => {
  it('assignedToId pasif (attendance boş) personele işaret ediyorsa bulgu üretir', async () => {
    const inactiveEmp: any = { id: 'emp-1', name: 'Pasif Usta', role: 'Usta', attendance: {} };
    // Kanonik alan assignedToId; legacy assignedTo boş bırakıldı (gerçek veride böyle).
    const wo: any = { id: 'IE-2026-001', client: 'ACME', serviceName: 'Bakım', status: 'Bekliyor', assignedToId: 'emp-1' };
    const c: any = {
      ...ctx,
      app: { employees: [inactiveEmp], workOrders: [wo], quotes: [], customers: [], materials: [] },
    };
    const res = await AGENT_TOOLS['analyze_system_health'].handler({}, c);
    const orphanFinding = (res.findings || []).find((f: any) => /Pasif personele atanmış/.test(f.title));
    expect(orphanFinding).toBeTruthy();
    expect(orphanFinding.count).toBeGreaterThanOrEqual(1);
  });
});

describe('create_quote_draft — fiyat uydurma YASAK (yalnız katalogtan)', () => {
  it('katalog dışı kaleme ajan fiyat verse bile 0 yazılır + manualPriceLines\'da işaretlenir', async () => {
    let saved: any = null;
    const c: any = { ...ctx, currentUserName: 'T', app: { addQuote: (q: any) => { saved = q; return { ok: true }; } } };
    const res = await AGENT_TOOLS['create_quote_draft'].handler(
      {
        customerName: 'X', title: 'Test',
        lines: [
          // Ajan uydurma fiyat geçiriyor — sistem yok saymalı:
          { pozId: 'MANUAL-1', pozName: 'Özel Trafo', quantity: 2, unit: 'Ad', materialPrice: 999999, installPrice: 5000 },
        ],
      },
      c,
    );
    expect(res.ok).toBe(true);
    expect(res.manualPriceLines).toHaveLength(1);
    expect(saved.lines[0].materialPrice).toBe(0);
    expect(saved.lines[0].installPrice).toBe(0);
    expect(saved.grandTotal).toBe(0); // uydurma fiyat toplamı şişiremez
    expect(String(saved.lines[0].notes)).toMatch(/girilmeli/);
    expect(String(saved.notes)).toMatch(/uydurma yapılmadı/);
  });

  it('katalogdaki kalem gerçek katalog fiyatıyla fiyatlanır', async () => {
    const realPoz = POZ_CATALOG.find(p => (p.materialPrice || 0) > 0)!;
    let saved: any = null;
    const c: any = { ...ctx, currentUserName: 'T', app: { addQuote: (q: any) => { saved = q; return { ok: true }; } } };
    const res = await AGENT_TOOLS['create_quote_draft'].handler(
      { customerName: 'X', title: 'T', lines: [{ pozId: realPoz.id, quantity: 1 }] },
      c,
    );
    expect(res.ok).toBe(true);
    expect(res.manualPriceLines).toHaveLength(0);
    expect(saved.lines[0].materialPrice).toBe(realPoz.materialPrice);
  });
});

describe('yazma tool\'ları — dürüstlük + alan eşlemesi (denetim M4/M10)', () => {
  it('create_customer: name → shortName + title (Customer\'da name yok), ok gerçek sonuçtan gelir', async () => {
    let saved: any = null;
    const c: any = { ...ctx, app: { addCustomer: (cust: any) => { saved = cust; return { ok: true }; } } };
    const res = await AGENT_TOOLS['create_customer'].handler({ name: 'DİNÇER A.Ş.', phone: '555' }, c);
    expect(res.ok).toBe(true);
    expect(saved.shortName).toBe('DİNÇER A.Ş.');
    expect(saved.title).toBe('DİNÇER A.Ş.');
    expect(saved.name).toBeUndefined(); // bozuk 'name' alanı yazılmamalı
    expect(saved.phone).toBe('555');
  });

  it('create_customer: DB başarısızsa ok:false döner (ajan "oluşturdum" yalanı engellenir)', async () => {
    const c: any = { ...ctx, app: { addCustomer: () => ({ ok: false, error: 'RLS reddetti' }) } };
    const res = await AGENT_TOOLS['create_customer'].handler({ name: 'X' }, c);
    expect(res.ok).toBe(false);
    expect(String(res.message)).toMatch(/RLS reddetti/);
  });

  it('delete_work_order: silme başarısızsa ok:false + hata mesajı', async () => {
    const c: any = { ...ctx, app: { deleteWorkOrder: () => ({ ok: false, error: 'yetki yok' }) } };
    const res = await AGENT_TOOLS['delete_work_order'].handler({ id: 'WO-1' }, c);
    expect(res.ok).toBe(false);
    expect(String(res.message)).toMatch(/yetki yok/);
  });

  it('delete_customer: başarılı silmede ok:true', async () => {
    let deletedId: string | null = null;
    const c: any = { ...ctx, app: { deleteCustomer: (id: string) => { deletedId = id; return { ok: true }; } } };
    const res = await AGENT_TOOLS['delete_customer'].handler({ id: 'cu-9' }, c);
    expect(res.ok).toBe(true);
    expect(deletedId).toBe('cu-9');
  });
});
