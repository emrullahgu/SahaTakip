import * as Location from 'expo-location';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

/**
 * Konum iznini ister ve verirse mevcut konumu döner.
 * Reddedilirse null döner.
 */
export async function requestAndGetPosition(): Promise<GeoPosition | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
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
