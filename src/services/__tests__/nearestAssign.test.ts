// nearestAssign.test.ts — en yakın personel sıralama/filtre (repo mock'lu)
// jest.mock factory yalnız `mock`-önekli dış değişkeni referans alabilir.
const mockLatestAll = jest.fn();
jest.mock('../data', () => ({ locationsRepo: { latestAll: () => mockLatestAll() } }));

import { findNearestEmployees } from '../nearestAssign';

beforeEach(() => { mockLatestAll.mockReset(); });

describe('findNearestEmployees', () => {
  it('mesafeye göre artan sıralı döner', async () => {
    mockLatestAll.mockResolvedValue([
      { userId: 'far', lat: 41.5, lng: 29.5, recordedAt: 't' },
      { userId: 'near', lat: 41.01, lng: 29.01, recordedAt: 't' },
      { userId: 'mid', lat: 41.2, lng: 29.2, recordedAt: 't' },
    ]);
    const res = await findNearestEmployees(41.0, 29.0);
    expect(res.map(r => r.userId)).toEqual(['near', 'mid', 'far']);
    expect(res[0].distanceM).toBeLessThan(res[1].distanceM);
  });

  it('limit uygulanır', async () => {
    mockLatestAll.mockResolvedValue([
      { userId: 'a', lat: 41.01, lng: 29.0, recordedAt: 't' },
      { userId: 'b', lat: 41.02, lng: 29.0, recordedAt: 't' },
      { userId: 'c', lat: 41.03, lng: 29.0, recordedAt: 't' },
    ]);
    const res = await findNearestEmployees(41.0, 29.0, 2);
    expect(res).toHaveLength(2);
  });

  it('lat/lng null olan kayıt elenir', async () => {
    mockLatestAll.mockResolvedValue([
      { userId: 'ok', lat: 41.01, lng: 29.0, recordedAt: 't' },
      { userId: 'null', lat: null, lng: null, recordedAt: 't' },
    ]);
    const res = await findNearestEmployees(41.0, 29.0);
    expect(res.map(r => r.userId)).toEqual(['ok']);
  });

  it('repo hata fırlatırsa boş dizi (çökmez)', async () => {
    mockLatestAll.mockRejectedValue(new Error('db down'));
    const res = await findNearestEmployees(41.0, 29.0);
    expect(res).toEqual([]);
  });
});
