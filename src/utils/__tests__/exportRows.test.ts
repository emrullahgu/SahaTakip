// exportRows.test.ts — CSV dışa aktarma saf dönüştürücüleri
import { quotesToRows, workOrdersToRows, customersToRows } from '../exportRows';
import { buildCsv } from '../../services/csvExport';
import type { Quote, WorkOrder, Customer } from '../../types';

describe('quotesToRows', () => {
  it('başlık + kayıt satırı sayısı doğru, customerTitle önceliklenir', () => {
    const quotes = [
      { number: 'QT-1', customerName: 'Ahmet', customerTitle: 'Ahmet A.Ş.', title: 'İş', date: '2026-06-17', status: 'Taslak', grandTotal: 1000 },
    ] as unknown as Quote[];
    const rows = quotesToRows(quotes);
    expect(rows).toHaveLength(2); // başlık + 1
    expect(rows[0][0]).toBe('Teklif No');
    expect(rows[1][1]).toBe('Ahmet A.Ş.');
    expect(rows[1][6]).toBe(1000);
  });
  it('boş dizi → yalnız başlık', () => {
    expect(quotesToRows([])).toHaveLength(1);
  });
  it('undefined grandTotal → 0', () => {
    const rows = quotesToRows([{ number: 'X' } as unknown as Quote]);
    expect(rows[1][6]).toBe(0);
  });
});

describe('workOrdersToRows', () => {
  it('iş emri satırı + kâr alanı', () => {
    const wo = [{ id: 'IE-1', client: 'X', serviceName: 'S', date: '2026-06-17', engineer: 'E', status: 'Bekliyor', quoteAmount: 500, profit: 100 }] as unknown as WorkOrder[];
    const rows = workOrdersToRows(wo);
    expect(rows[0]).toHaveLength(8);
    expect(rows[1][7]).toBe(100);
  });
});

describe('customersToRows + buildCsv entegrasyonu (formül enjeksiyonu kaçışı)', () => {
  it('tehlikeli ünvan buildCsv ile nötralize edilir', () => {
    const cust = [{ shortName: 'A', title: '=HYPERLINK("x")', city: 'İstanbul', phone: '555', taxNumber: '111', type: 'Aktif', currentBalance: -250 }] as unknown as Customer[];
    const rows = customersToRows(cust);
    expect(rows[1][6]).toBe(-250);
    const csv = buildCsv(rows);
    expect(csv).toMatch(/'=HYPERLINK/); // formül prefix tek tırnakla nötralize
  });
  it('undefined currentBalance → 0', () => {
    const rows = customersToRows([{ shortName: 'A', title: 'B' } as unknown as Customer]);
    expect(rows[1][6]).toBe(0);
  });
});
