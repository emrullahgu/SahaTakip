import * as Location from 'expo-location';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
  isMock?: boolean;
}

/**
 * Konum iznini ister ve verirse mevcut konumu döner.
 * Reddedilirse null döner.
 */
export async function requestAndGetPosition(): Promise<GeoPosition | null> {
  // Bazı platform/edge durumlarda izin API'si undefined dönebilir → {status} destructuring
  // çökerdi. Savunmacı: sonuç yoksa veya izin yoksa null (konum yok), çökme yok.
  const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (!perm || perm.status !== 'granted') {
    return null;
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
    speed: pos.coords.speed,
    heading: pos.coords.heading,
    isMock: (pos.coords as any).mocked ?? false,
  };
}

/**
 * Sadece izin durumunu kontrol eder (istekte bulunmadan).
 */
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Reverse geocoding — koordinattan adres üretir.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (results.length === 0) return null;
    const r = results[0];
    return [r.street, r.district, r.city, r.region].filter(Boolean).join(', ');
  } catch {
    return null;
  }
}

/**
 * İki nokta arasındaki mesafeyi km cinsinden döner (Haversine).
 */
export function distanceKm(a: GeoPosition, b: GeoPosition): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Metre cinsinden mesafe — geofence için.
 */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  return (
    distanceKm(
      { ...a, accuracy: null, timestamp: 0 },
      { ...b, accuracy: null, timestamp: 0 }
    ) * 1000
  );
}

/**
 * POZ-DEV-018 — Sahte konum (mock location) tespiti.
 * Android: expo-location coords.mocked true gelirse → mock.
 * iOS: native API yok; heuristic (accuracy 0, hız aşırı) ile kontrol.
 */
export function isMockLocation(pos: GeoPosition): boolean {
  if (pos.isMock) return true;
  // Heuristic — gerçekçi olmayan hız/doğruluk
  if (pos.speed != null && pos.speed > 100) return true; // 360 km/h üstü
  if (pos.accuracy === 0) return true; // gerçekçi değil
  return false;
}

// =============================================================
// POZ-DEV-014 — Canlı GPS takibi (foreground watch)
// =============================================================
let watchSub: Location.LocationSubscription | null = null;

export type LocationListener = (pos: GeoPosition) => void;

export async function startLiveTracking(
  listener: LocationListener,
  intervalMs = 15000,
  minDistanceM = 25
): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  // Aynı anda birden fazla watch açılmasın
  if (watchSub) {
    watchSub.remove();
    watchSub = null;
  }

  watchSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: intervalMs,
      distanceInterval: minDistanceM,
    },
    pos => {
      listener({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        isMock: (pos.coords as any).mocked ?? false,
      });
    }
  );
  return true;
}

export function stopLiveTracking() {
  if (watchSub) {
    watchSub.remove();
    watchSub = null;
  }
}
