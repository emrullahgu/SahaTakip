// ====================================================================
// vehicleRoutes — POZ-DEV-063
// Araç rota geçmişi: lokasyon × araç. Manuel/otomatik nokta ekleme.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleRoutePoint } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:vehicle_routes';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function fromRow(r: any): VehicleRoutePoint {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    lat: Number(r.lat),
    lng: Number(r.lng),
    speed: r.speed == null ? undefined : Number(r.speed),
    recordedAt: r.recorded_at ?? new Date().toISOString(),
    workOrderId: r.work_order_id ?? undefined,
    userId: r.user_id ?? undefined,
    userName: r.user_name ?? undefined,
  };
}
function toRow(p: VehicleRoutePoint): Record<string, any> {
  const row: Record<string, any> = {
    vehicle_id: p.vehicleId,
    lat: p.lat,
    lng: p.lng,
    speed: p.speed ?? null,
    recorded_at: p.recordedAt,
    work_order_id: uuidOrNull(p.workOrderId),
    user_id: uuidOrNull(p.userId),
    user_name: p.userName ?? null,
  };
  if (UUID_RE.test(p.id)) row.id = p.id;
  return row;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listPoints(): Promise<VehicleRoutePoint[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('vehicle_route_points')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(2000);
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
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
  if (SUPABASE_CONFIGURED && UUID_RE.test(point.vehicleId)) {
    try {
      const { data, error } = await supabase.from('vehicle_route_points').insert(toRow(point)).select().single();
      if (!error && data) {
        point.id = data.id;
        point.recordedAt = data.recorded_at ?? point.recordedAt;
      }
    } catch { /* keep local */ }
  }
  const all = await listPoints();
  await saveAll([point, ...all]);
  return point;
}

export async function deletePoint(id: string) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('vehicle_route_points').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listPoints();
  await saveAll(all.filter(p => p.id !== id));
}

export async function deletePointsByVehicle(vehicleId: string) {
  if (SUPABASE_CONFIGURED && UUID_RE.test(vehicleId)) {
    try { await supabase.from('vehicle_route_points').delete().eq('vehicle_id', vehicleId); } catch { /* ignore */ }
  }
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
