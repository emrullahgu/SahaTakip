// services/routeOptimizer.ts — POZ-DEV-093 TSP rota optimizasyonu (greedy NN + 2-opt)
import { OptimizedRoute, RouteStop } from '../types';

// Haversine km
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function totalDistance(order: RouteStop[]): number {
  let sum = 0;
  for (let i = 0; i < order.length - 1; i++) sum += haversineKm(order[i], order[i + 1]);
  return sum;
}

// Nearest-neighbor starting from first stop (depot)
function nearestNeighbor(stops: RouteStop[]): RouteStop[] {
  if (stops.length <= 2) return [...stops];
  const remaining = stops.slice(1);
  const out: RouteStop[] = [stops[0]];
  let current = stops[0];
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = haversineKm(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    current = remaining.splice(bestIdx, 1)[0];
    out.push(current);
  }
  return out;
}

// 2-opt improvement pass
function twoOpt(order: RouteStop[]): RouteStop[] {
  let improved = true;
  let best = [...order];
  let bestDist = totalDistance(best);
  let iter = 0;
  while (improved && iter < 50) {
    improved = false;
    iter++;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const d = totalDistance(candidate);
        if (d + 0.001 < bestDist) {
          best = candidate;
          bestDist = d;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function optimizeRoute(stops: RouteStop[]): OptimizedRoute {
  if (stops.length === 0) {
    return { stops: [], totalKm: 0, computedAt: new Date().toISOString() };
  }
  const original = totalDistance(stops);
  let order = nearestNeighbor(stops);
  order = twoOpt(order);
  // Annotate orderIndex + legKm
  const annotated: RouteStop[] = order.map((s, i) => ({
    ...s,
    orderIndex: i,
    legKm: i === 0 ? 0 : haversineKm(order[i - 1], s),
  }));
  const total = totalDistance(order);
  return {
    stops: annotated,
    totalKm: total,
    originalKm: original,
    savingsKm: Math.max(0, original - total),
    computedAt: new Date().toISOString(),
  };
}
