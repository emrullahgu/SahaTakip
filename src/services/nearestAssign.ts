// ====================================================================
// En yakın personele atama — POZ-DEV-030
// locationsRepo.latestAll() ile aktif personellerin son konumunu okur,
// en yakın olanı önerir.
// ====================================================================

import { locationsRepo } from './data';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface CandidateEmployee {
  userId: string;
  name?: string;
  distanceM: number;
  lat: number;
  lng: number;
  updatedAt?: string;
}

/**
 * Hedef konuma en yakın ilk N personeli sıralı döndürür.
 */
export async function findNearestEmployees(
  targetLat: number,
  targetLng: number,
  limit = 5,
): Promise<CandidateEmployee[]> {
  try {
    const locs = await locationsRepo.latestAll();
    return locs
      .filter(l => l.lat != null && l.lng != null)
      .map(l => ({
        userId: l.userId,
        lat: l.lat,
        lng: l.lng,
        updatedAt: l.recordedAt,
        distanceM: haversine(targetLat, targetLng, l.lat, l.lng),
      }))
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, limit);
  } catch (e) {
    console.warn('[findNearestEmployees]', e);
    return [];
  }
}
