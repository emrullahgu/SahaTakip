// ====================================================================
// Geofences Repository — POZ-DEV-017
// Daire (lat/lng + radius) bazlı geofence yönetimi + event kaydı
// ====================================================================

import { supabase, isOnlineMode, cacheGet, cacheSet } from './repository';
import { distanceMeters } from '../location';

export interface Geofence {
  id: string;
  name: string;
  customerId?: string | null;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  notes?: string | null;
}

const fromRow = (r: any): Geofence => ({
  id: r.id,
  name: r.name,
  customerId: r.customer_id,
  centerLat: Number(r.center_lat),
  centerLng: Number(r.center_lng),
  radiusM: Number(r.radius_m),
  notes: r.notes,
});

const CACHE_KEY = 'geofences';

export const geofencesRepo = {
  async list(): Promise<Geofence[]> {
    if (!isOnlineMode()) return (await cacheGet<Geofence[]>(CACHE_KEY)) ?? [];
    const { data, error } = await supabase.from('geofences').select('*').order('name');
    if (error) {
      console.warn('[geofences.list]', error.message);
      return (await cacheGet<Geofence[]>(CACHE_KEY)) ?? [];
    }
    const list = (data ?? []).map(fromRow);
    await cacheSet(CACHE_KEY, list);
    return list;
  },

  async add(g: Omit<Geofence, 'id'>): Promise<Geofence | null> {
    if (!isOnlineMode()) {
      const fake: Geofence = { id: 'local-' + Date.now(), ...g };
      const cur = (await cacheGet<Geofence[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, [...cur, fake]);
      return fake;
    }
    const { data, error } = await supabase
      .from('geofences')
      .insert({
        name: g.name,
        customer_id: g.customerId ?? null,
        center_lat: g.centerLat,
        center_lng: g.centerLng,
        radius_m: g.radiusM,
        notes: g.notes ?? null,
      })
      .select()
      .single();
    if (error) {
      console.warn('[geofences.add]', error.message);
      return null;
    }
    return fromRow(data);
  },

  async delete(id: string): Promise<void> {
    if (!isOnlineMode()) {
      const cur = (await cacheGet<Geofence[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, cur.filter(g => g.id !== id));
      return;
    }
    await supabase.from('geofences').delete().eq('id', id);
  },

  /** Bir noktanın hangi geofence'lerin içinde olduğunu döner */
  pointInside(lat: number, lng: number, fences: Geofence[]): Geofence[] {
    return fences.filter(
      f =>
        distanceMeters(
          { latitude: lat, longitude: lng },
          { latitude: f.centerLat, longitude: f.centerLng }
        ) <= f.radiusM
    );
  },

  /** Enter/Exit event'ini Supabase'e yaz */
  async logEvent(geofenceId: string, userId: string, event: 'enter' | 'exit'): Promise<void> {
    if (!isOnlineMode()) return;
    await supabase.from('geofence_events').insert({
      geofence_id: geofenceId,
      user_id: userId,
      event,
    });
  },
};
