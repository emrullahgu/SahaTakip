// anomalies.test.ts — kural + z-score anomali tespiti (saf-logic)
import { detectAnomalies, ANOMALY_KIND_LABEL } from '../anomalies';
import type { WorkOrder, Payment, Quote, Employee } from '../../types';

const DAY = 86_400_000;
const daysAgoIso = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const base = { payments: [] as Payment[], employees: [] as Employee[], quotes: [] as Quote[], workOrders: [] as WorkOrder[] };

describe('detectAnomalies', () => {
  it('boş girdi → boş dizi', () => {
    expect(detectAnomalies(base)).toEqual([]);
  });

  it('plannedEnd geçmiş + açık WO → wo_overdue; Tamamlandı olan üretmez', () => {
    const open = { id: 'IE-1', client: 'X', serviceName: 'Bakım', status: 'Bekliyor', plannedEnd: daysAgoIso(10), quoteAmount: 0 } as unknown as WorkOrder;
    const done = { id: 'IE-2', client: 'Y', serviceName: 'Montaj', status: 'Tamamlandı', plannedEnd: daysAgoIso(10), quoteAmount: 0 } as unknown as WorkOrder;
    const res = detectAnomalies({ ...base, workOrders: [open, done] });
    const overdue = res.filter(a => a.kind === 'wo_overdue');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].targetId).toBe('IE-1');
  });

  it('maliyet/teklif oranı 1.5 → cost_spike, score 80 (high)', () => {
    const w = { id: 'IE-3', client: 'Z', serviceName: 'Pano', status: 'Tamamlandı', materialCost: 150, laborCost: 0, otherCost: 0, quoteAmount: 100 } as unknown as WorkOrder;
    const res = detectAnomalies({ ...base, workOrders: [w] });
    const spike = res.find(a => a.kind === 'cost_spike');
    expect(spike).toBeTruthy();
    expect(spike!.score).toBe(80);
    expect(spike!.severity).toBe('high');
  });

  it('30+ gün bekleyen pending tahsilat → payment_late', () => {
    const p = { id: 'p1', customerName: 'Müşteri', amount: 1000, status: 'pending', createdAt: daysAgoIso(40) } as unknown as Payment;
    const res = detectAnomalies({ ...base, payments: [p] });
    expect(res.some(a => a.kind === 'payment_late')).toBe(true);
  });

  it('çıktı score\'a göre azalan sıralı', () => {
    const overdue = { id: 'IE-1', client: 'X', serviceName: 'A', status: 'Bekliyor', plannedEnd: daysAgoIso(10), quoteAmount: 0 } as unknown as WorkOrder;
    const spike = { id: 'IE-2', client: 'Y', serviceName: 'B', status: 'Tamamlandı', materialCost: 130, laborCost: 0, otherCost: 0, quoteAmount: 100 } as unknown as WorkOrder;
    const res = detectAnomalies({ ...base, workOrders: [spike, overdue] });
    for (let i = 1; i < res.length; i++) {
      expect(res[i - 1].score).toBeGreaterThanOrEqual(res[i].score);
    }
  });

  it('ANOMALY_KIND_LABEL tüm türleri kapsar', () => {
    expect(ANOMALY_KIND_LABEL.wo_overdue).toBeTruthy();
    expect(ANOMALY_KIND_LABEL.cost_spike).toBeTruthy();
  });
});
