// ====================================================================
// vehicleRoutes — POZ-DEV-063
// Araç rota geçmişi: lokasyon × araç. Manuel/otomatik nokta ekleme.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleRoutePoint } from '../types';

const KEY = '@SahaTakip:vehicle_routes';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listPoints(): Promise<VehicleRoutePoint[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VehicleRoutePoint[]) : [];
  } catch {
    return [];
  }
}

export async function listPointsByVehicle(vehicleId: string): Promise<VehicleRoutePoint[]> {
  const all = await listPoints();
  return all
    .filter(p => p.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

export async function listPointsByVehicleAndDay(
  vehicleId: string,
  dayISO: string,
): Promise<VehicleRoutePoint[]> {
  const day = dayISO.slice(0, 10);
  const all = await listPointsByVehicle(vehicleId);
  return all
    .filter(p => p.recordedAt.slice(0, 10) === day)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

async function saveAll(list: VehicleRoutePoint[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function addPoint(input: Omit<VehicleRoutePoint, 'id' | 'recordedAt'> & {
  recordedAt?: string;
}): Promise<VehicleRoutePoint> {
  const point: VehicleRoutePoint = {
    id: uid(),
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    vehicleId: input.vehicleId,
    lat: input.lat,
    lng: input.lng,
    speed: input.speed,
    workOrderId: input.workOrderId,
    userId: input.userId,
    userName: input.userName,
  };
  const all = await listPoints();
  await saveAll([point, ...all]);
  return point;
}

export async function deletePoint(id: string) {
  const all = await listPoints();
  await saveAll(all.filter(p => p.id !== id));
}

export async function deletePointsByVehicle(vehicleId: string) {
  const all = await listPoints();
  await saveAll(all.filter(p => p.vehicleId !== vehicleId));
}

// İki nokta arası mesafe (haversine, km)
function haversineKm(a: VehicleRoutePoint, b: VehicleRoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function totalDistanceKm(vehicleId: string): Promise<number> {
  const pts = (await listPointsByVehicle(vehicleId)).slice().reverse(); // kronolojik
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversineKm(pts[i - 1], pts[i]);
  return total;
}
