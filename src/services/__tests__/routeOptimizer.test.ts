// routeOptimizer.test.ts — haversineKm + optimizeRoute (greedy NN + 2-opt)
import { haversineKm, optimizeRoute } from '../routeOptimizer';
import type { RouteStop } from '../../types';

const stop = (lat: number, lng: number, id: string): RouteStop => ({ id, lat, lng } as unknown as RouteStop);

describe('haversineKm', () => {
  it('aynı nokta → 0', () => {
    expect(haversineKm({ lat: 41, lng: 29 }, { lat: 41, lng: 29 })).toBe(0);
  });
  it('İstanbul-Ankara ~350 km', () => {
    const d = haversineKm({ lat: 41.0082, lng: 28.9784 }, { lat: 39.9334, lng: 32.8597 });
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(400);
  });
});

describe('optimizeRoute', () => {
  it('boş liste → {stops:[], totalKm:0}', () => {
    const r = optimizeRoute([]);
    expect(r.stops).toEqual([]);
    expect(r.totalKm).toBe(0);
  });

  it('kötü sıralı duraklar → totalKm <= originalKm, savingsKm >= 0', () => {
    // Kasıtlı kötü sıra: 0 → uzak → yakın → uzak
    const stops = [
      stop(41.0, 29.0, 'depot'),
      stop(41.5, 29.5, 'a'),
      stop(41.05, 29.05, 'b'),
      stop(41.6, 29.6, 'c'),
      stop(41.1, 29.1, 'd'),
    ];
    const r = optimizeRoute(stops);
    expect(r.totalKm).toBeLessThanOrEqual(r.originalKm! + 0.001);
    expect(r.savingsKm).toBeGreaterThanOrEqual(0);
    // orderIndex ardışık, ilk legKm 0
    r.stops.forEach((s: any, i: number) => expect(s.orderIndex).toBe(i));
    expect((r.stops[0] as any).legKm).toBe(0);
    // depot ilk durak olarak korunur
    expect(r.stops[0].id).toBe('depot');
  });

  it('tek durak → totalKm 0', () => {
    const r = optimizeRoute([stop(41, 29, 'only')]);
    expect(r.totalKm).toBe(0);
    expect(r.stops).toHaveLength(1);
  });
});
