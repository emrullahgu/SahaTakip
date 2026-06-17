// globalSearch.test.ts — çapraz-varlık arama saf mantığı
import { buildGlobalResults } from '../globalSearch';
import type { Quote, Customer, WorkOrder } from '../../types';

const customers = [
  { id: 'c1', shortName: 'DİMES', title: 'Dimes Gıda A.Ş.', city: 'Tokat', phone: '555' },
] as unknown as Customer[];
const quotes = [
  { id: 'q1', number: 'QT-2026-1', customerName: 'DİMES', title: 'Pano montajı', status: 'Taslak' },
  { id: 'q2', number: 'QT-2026-2', customerName: 'Başka', title: 'Kablo', status: 'Taslak' },
] as unknown as Quote[];
const workOrders = [
  { id: 'IE-2026-1', client: 'DİMES', serviceName: 'Bakım', engineer: 'Ali', status: 'Bekliyor' },
] as unknown as WorkOrder[];

const data = { customers, quotes, workOrders };

describe('buildGlobalResults', () => {
  it('boş sorgu → boş sonuç', () => {
    expect(buildGlobalResults('', data)).toEqual([]);
    expect(buildGlobalResults('   ', data)).toEqual([]);
  });

  it('müşteri adı (aksansız) → müşteri + ilgili teklif + iş emrini döner', () => {
    const res = buildGlobalResults('dimes', data); // aksansız sorgu
    const kinds = res.map(r => r.kind);
    expect(kinds).toContain('customer');
    expect(kinds).toContain('quote');
    expect(kinds).toContain('workOrder');
    // sadece DİMES teklifini bulmalı, "Başka" olanı değil
    expect(res.filter(r => r.kind === 'quote')).toHaveLength(1);
  });

  it('teklif no ile arama yalnız o teklifi döner', () => {
    const res = buildGlobalResults('QT-2026-2', data);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ kind: 'quote', id: 'q2' });
  });

  it('eşleşme yoksa boş', () => {
    expect(buildGlobalResults('zzz-yok-xyz', data)).toEqual([]);
  });
});
