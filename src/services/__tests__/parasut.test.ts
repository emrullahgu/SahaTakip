// parasut.test.ts — fatura kesme çift-kilidi + JSON:API slim mapper
const mockInvoke = jest.fn();
let mockSettingsValue: any = null;

jest.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockSettingsValue ? { value: mockSettingsValue } : null }) }) }),
      upsert: async () => ({ error: null }),
    }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    functions: { invoke: (...a: any[]) => mockInvoke(...a) },
  },
}));

import { createSalesInvoice, listSalesInvoices, loadParasutSettings } from '../parasut';

beforeEach(() => { mockInvoke.mockReset(); mockSettingsValue = null; });

describe('parasut — fatura kesme güvenlik kilidi', () => {
  it('invoicingEnabled false iken createSalesInvoice THROW eder ve proxy çağrılmaz', async () => {
    mockSettingsValue = { enabled: true, invoicingEnabled: false };
    await expect(createSalesInvoice({ data: {} })).rejects.toThrow(/[Ff]atura kesme/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('ayar yoksa varsayılan kapalı (createSalesInvoice throw)', async () => {
    mockSettingsValue = null;
    const s = await loadParasutSettings();
    expect(s.enabled).toBe(false);
    expect(s.invoicingEnabled).toBe(false);
    await expect(createSalesInvoice({})).rejects.toThrow();
  });

  it('invoicingEnabled true iken proxy create çağrılır', async () => {
    mockSettingsValue = { enabled: true, invoicingEnabled: true };
    mockInvoke.mockResolvedValue({ data: { data: { id: 'inv1' } }, error: null });
    await createSalesInvoice({ data: { type: 'sales_invoices' } });
    expect(mockInvoke).toHaveBeenCalledWith('parasut-proxy', expect.objectContaining({ body: expect.objectContaining({ resource: 'sales_invoices', op: 'create' }) }));
  });
});

describe('parasut — JSON:API slim mapper', () => {
  it('listSalesInvoices attributes\'ı slim faturaya çevirir', async () => {
    mockInvoke.mockResolvedValue({
      data: { data: [{ id: '1', attributes: { invoice_no: 'SF-1', net_total: '1250.75', issue_date: '2026-06-01', payment_status: 'paid' } }] },
      error: null,
    });
    const res = await listSalesInvoices();
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ id: '1', no: 'SF-1', total: 1250.75, date: '2026-06-01', status: 'paid' });
  });

  it('edge { error } gövdesi hata olarak fırlatılır', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'Paraşüt yapılandırılmadı' }, error: null });
    await expect(listSalesInvoices()).rejects.toThrow(/yapılandırılmadı/);
  });
});
