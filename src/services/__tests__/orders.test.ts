// orders.test.ts — POZ-DEV-339 Orders service unit testleri
import { listOrders, getOrder, getOrdSummary, nextStatus } from '../orders';

describe('orders service', () => {
  it('listOrders 8 demo sipariş döner', async () => {
    const orders = await listOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
  });

  it('getOrder mevcut id ile bulur', async () => {
    const orders = await listOrders();
    const first = orders[0];
    const found = await getOrder(first.id);
    expect(found?.id).toBe(first.id);
  });

  it('getOrder olmayan id için undefined', async () => {
    const found = await getOrder('non-existent-id');
    expect(found).toBeUndefined();
  });

  it('getOrdSummary toplam ve durum dağılımı içerir', async () => {
    const sum = await getOrdSummary();
    expect(sum.totalOrders).toBeGreaterThan(0);
    expect(sum.totalValue).toBeGreaterThan(0);
    expect(sum.byStatus).toBeDefined();
    expect(Array.isArray(sum.topProducts)).toBe(true);
  });

  it('nextStatus akışı linear ilerler', () => {
    expect(nextStatus('draft')).toBe('submitted');
    expect(nextStatus('submitted')).toBe('confirmed');
    expect(nextStatus('confirmed')).toBe('preparing');
    expect(nextStatus('preparing')).toBe('shipped');
    expect(nextStatus('shipped')).toBe('delivered');
    expect(nextStatus('delivered')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
  });
});
