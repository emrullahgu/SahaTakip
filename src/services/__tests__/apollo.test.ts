// apollo — Apollo.io servisi + ajan araçları (mock fetch + key)
const mockKeys: any = { apolloApiKey: 'test-key' };
jest.mock('../externalApiKeys', () => ({
  getExternalApiKeys: async () => mockKeys,
}));

import { enrichOrganization, searchPeople, isApolloConfigured } from '../apollo';
import { APOLLO_TOOLS } from '../agent/apolloTools';

const mockFetch = jest.fn();
beforeEach(() => { (global as any).fetch = mockFetch; mockFetch.mockReset(); mockKeys.apolloApiKey = 'test-key'; });

describe('apollo servisi', () => {
  it('isApolloConfigured anahtar varsa true', async () => {
    expect(await isApolloConfigured()).toBe(true);
    mockKeys.apolloApiKey = '';
    expect(await isApolloConfigured()).toBe(false);
  });

  it('enrichOrganization yanıtı slimler + X-Api-Key header gönderir', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ organization: { id: 'o1', name: 'KOBİNERJİ', primary_domain: 'kobinerji.com', estimated_num_employees: 25, industry: 'energy', city: 'İzmir', country: 'Turkey' } }),
    });
    const org = await enrichOrganization({ domain: 'https://kobinerji.com/x' });
    expect(org?.name).toBe('KOBİNERJİ');
    expect(org?.employees).toBe(25);
    expect(org?.location).toContain('İzmir');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('/organizations/enrich');
    expect(String(url)).toContain('domain=kobinerji.com'); // protokol/yol temizlendi
    expect(opts.headers['X-Api-Key']).toBe('test-key');
  });

  it('searchPeople kişileri slimler', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ people: [{ id: 'p1', first_name: 'Ali', last_name: 'Veli', title: 'Satın Alma', email: 'ali@x.com', organization: { name: 'X A.Ş.' } }] }),
    });
    const people = await searchPeople({ keywords: 'trafo', perPage: 5 });
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Ali Veli');
    expect(people[0].email).toBe('ali@x.com');
  });
});

describe('apollo ajan araçları', () => {
  it('4 araç kayıtlı', () => {
    expect(Object.keys(APOLLO_TOOLS).sort()).toEqual(
      ['apollo_enrich_company', 'apollo_enrich_person', 'apollo_find_leads', 'apollo_search_companies'],
    );
  });

  it('anahtar yoksa "yapılandırılmadı" döner (çökmeden)', async () => {
    mockKeys.apolloApiKey = '';
    const res = await APOLLO_TOOLS['apollo_find_leads'].handler({ keywords: 'x' }, {} as any);
    expect(res.ok).toBe(false);
    expect(String(res.error)).toMatch(/tanımlı değil/);
  });
});
