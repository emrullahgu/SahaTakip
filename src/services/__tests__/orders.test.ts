// orders.test.ts — POZ-DEV-339 Orders service unit testleri
import { listOrders, getOrder, getOrdSummary, nextStatus } from '../orders';

describe('orders service', () => {
  it('listOrders dizi döner (demo seed kaldırıldı, Supabase tablosu hazır olunca dolacak)', async () => {
    const orders = await listOrders();
    expect(Array.isArray(orders)).toBe(true);
  });

  it('getOrder olmayan id için undefined', async () => {
    const found = await getOrder('non-existent-id');
    expect(found).toBeUndefined();
  });

  it('getOrdSummary geçerli iskelet döner', async () => {
    const sum = await getOrdSummary();
    expect(sum.totalOrders).toBe(0);
    expect(sum.totalValue).toBe(0);
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
