// mappers.test.ts — created_by (RLS owner-write) regresyon testleri
import { quoteToRow, workOrderToRow, customerToRow } from '../mappers';
import type { Quote, WorkOrder, Customer } from '../../../types';

const quote = {
  id: 'q1', number: 'QT-1', customerName: 'X', title: 'T', date: '2026-06-09',
  engineer: 'E', status: 'Taslak', lines: [], subtotal: 0, vatTotal: 0, grandTotal: 0,
} as unknown as Quote;

const wo = { id: 'wo1', client: 'X', serviceName: 'S', date: '2026-06-09', engineer: 'E', status: 'Bekliyor', materials: [] } as unknown as WorkOrder;
const cust = { id: 'c1', shortName: 'X', title: 'X A.Ş.' } as unknown as Customer;

describe('mappers — created_by (RLS owner-write)', () => {
  it('quoteToRow userId verilince created_by set eder', () => {
    expect(quoteToRow(quote, 'user-123').created_by).toBe('user-123');
  });
  it('quoteToRow userId verilmezse created_by null (RLS reddi riski → repo userId geçmeli)', () => {
    expect(quoteToRow(quote).created_by).toBeNull();
  });
  it('workOrderToRow userId\'yi created_by\'a yazar', () => {
    expect(workOrderToRow(wo, 'u9').created_by).toBe('u9');
  });
  it('customerToRow userId\'yi created_by\'a yazar', () => {
    expect(customerToRow(cust, 'u5').created_by).toBe('u5');
  });
});
