// syncDrain.applyOp — offline→online uzlaştırma dal mantığı (denetim M10).
// Kritik: work_orders keyCol='number', soft vs hard delete, created_by update'te
// düşürülür, quotes insert quote_lines'ı da yazar. Hata = saha işinin kalıcı kaybı.

// jest.mock factory yalnız `mock`-önekli dış değişkeni referans alabilir.
const mockCalls: any[] = [];

jest.mock('../repository', () => {
  const builder = (table: string) => ({
    insert: (row: any) => { mockCalls.push({ op: 'insert', table, row }); return Promise.resolve({ error: null }); },
    upsert: (row: any, opts?: any) => { mockCalls.push({ op: 'upsert', table, row, opts }); return Promise.resolve({ error: null }); },
    update: (row: any) => {
      mockCalls.push({ op: 'update', table, row });
      return { eq: (col: string, val: any) => { mockCalls.push({ op: 'update.eq', table, col, val }); return Promise.resolve({ error: null }); } };
    },
    delete: () => ({ eq: (col: string, val: any) => { mockCalls.push({ op: 'delete.eq', table, col, val }); return Promise.resolve({ error: null }); } }),
  });
  return {
    supabase: {
      from: (t: string) => builder(t),
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    },
    isOnlineMode: () => true,
    getSyncQueue: async () => [],
    clearSyncOp: async () => {},
  };
});

jest.mock('../mappers', () => ({
  quoteToRow: (p: any, uid?: string) => ({ id: p.id, created_by: uid }),
  quoteLineToRow: (qid: string, l: any) => ({ quote_id: qid, poz: l.pozId }),
  customerToRow: (p: any, uid?: string) => ({ id: p.id, created_by: uid }),
  workOrderToRow: (p: any, uid?: string) => ({ number: p.id, created_by: uid, status: p.status }),
  employeeToRow: (p: any) => ({ id: p.id }),
  expenseToRow: (p: any, uid?: string) => ({ id: p.id, category: p.type, amount: p.amount, created_by: p.createdBy ?? uid }),
}));

import { applyOp } from '../syncDrain';

beforeEach(() => { mockCalls.length = 0; });

describe('applyOp — delete dalı', () => {
  it('work_orders delete → SOFT (deleted_at) ve keyCol "number"', async () => {
    await applyOp({ table: 'work_orders', action: 'delete', payload: { id: 'IE-2026-001' } });
    const eq = mockCalls.find(c => c.op === 'update.eq');
    expect(eq).toMatchObject({ table: 'work_orders', col: 'number', val: 'IE-2026-001' });
    const upd = mockCalls.find(c => c.op === 'update');
    expect(upd.row).toHaveProperty('deleted_at');
    expect(mockCalls.find(c => c.op === 'delete.eq')).toBeUndefined(); // hard delete olmamalı
  });

  it('customers delete → SOFT, keyCol "id"', async () => {
    await applyOp({ table: 'customers', action: 'delete', payload: { id: 'cu-1' } });
    expect(mockCalls.find(c => c.op === 'update.eq')).toMatchObject({ table: 'customers', col: 'id', val: 'cu-1' });
  });

  it('employees delete → HARD delete (soft değil)', async () => {
    await applyOp({ table: 'employees', action: 'delete', payload: { id: 'e-1' } });
    expect(mockCalls.find(c => c.op === 'delete.eq')).toMatchObject({ table: 'employees', col: 'id', val: 'e-1' });
    expect(mockCalls.find(c => c.op === 'update.eq')).toBeUndefined();
  });
});

describe('applyOp — insert / update', () => {
  it('quotes insert → quotes upsert + quote_lines (sil→ekle, idempotent)', async () => {
    await applyOp({ table: 'quotes', action: 'insert', payload: { id: 'q-1', lines: [{ pozId: 'P1' }, { pozId: 'P2' }] } });
    const q = mockCalls.filter(c => c.op === 'upsert' && c.table === 'quotes');
    const qlDel = mockCalls.filter(c => c.op === 'delete.eq' && c.table === 'quote_lines');
    const ql = mockCalls.filter(c => c.op === 'insert' && c.table === 'quote_lines');
    expect(q).toHaveLength(1);            // plain insert değil → idempotent upsert
    expect(qlDel).toHaveLength(1);        // önce mevcut satırlar silinir
    expect(qlDel[0]).toMatchObject({ col: 'quote_id', val: 'q-1' });
    expect(ql).toHaveLength(1);
    expect(ql[0].row).toHaveLength(2);    // iki satır
  });

  it('work_orders insert → number çakışmalı upsert (idempotent, çift kayıt yok)', async () => {
    await applyOp({ table: 'work_orders', action: 'insert', payload: { id: 'IE-2026-003', status: 'Bekliyor' } });
    const up = mockCalls.find(c => c.op === 'upsert' && c.table === 'work_orders');
    expect(up).toBeDefined();
    expect(up.opts).toMatchObject({ onConflict: 'number' });
    expect(up.row).toHaveProperty('number', 'IE-2026-003');
  });

  it('expenses insert → expenseToRow ile id PK upsert (offline masraf drenajı)', async () => {
    await applyOp({ table: 'expenses', action: 'insert', payload: { id: 'ex-uuid-1', type: 'Yol', amount: 150, createdBy: 'u9' } });
    const up = mockCalls.find(c => c.op === 'upsert' && c.table === 'expenses');
    expect(up).toBeDefined();
    expect(up.row).toMatchObject({ id: 'ex-uuid-1', category: 'Yol', amount: 150 });
  });

  it('work_orders update → keyCol "number" ve created_by GÖNDERİLMEZ (sahiplik korunur)', async () => {
    await applyOp({ table: 'work_orders', action: 'update', payload: { id: 'IE-2026-002', status: 'Tamamlandı' } });
    expect(mockCalls.find(c => c.op === 'update.eq')).toMatchObject({ table: 'work_orders', col: 'number', val: 'IE-2026-002' });
    const upd = mockCalls.find(c => c.op === 'update' && c.table === 'work_orders');
    expect(upd.row).not.toHaveProperty('created_by');
    expect(upd.row).toHaveProperty('status', 'Tamamlandı');
  });
});
