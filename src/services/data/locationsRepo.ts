// ====================================================================
// Locations Repository — POZ-DEV-014, 015
// Canlı konum yazma + en son konumları getirme + realtime subscribe
// ====================================================================

import { supabase, isOnlineMode, cacheGet, cacheSet, isUuid } from './repository';
import type { GeoPosition } from '../location';

export interface LocationRow {
  id?: string;
  userId: string;
  employeeId?: string | null;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  isMock?: boolean;
  battery?: number | null;
  recordedAt: string; // ISO
}

const rowFrom = (r: any): LocationRow => ({
  id: r.id,
  userId: r.user_id,
  employeeId: r.employee_id,
  lat: Number(r.lat),
  lng: Number(r.lng),
  accuracy: r.accuracy != null ? Number(r.accuracy) : null,
  speed: r.speed != null ? Number(r.speed) : null,
  heading: r.heading != null ? Number(r.heading) : null,
  isMock: !!r.is_mock,
  battery: r.battery != null ? Number(r.battery) : null,
  recordedAt: r.recorded_at,
});

const rowTo = (l: LocationRow) => ({
  user_id: l.userId,
  employee_id: l.employeeId ?? null,
  lat: l.lat,
  lng: l.lng,
  accuracy: l.accuracy ?? null,
  speed: l.speed ?? null,
  heading: l.heading ?? null,
  is_mock: !!l.isMock,
  battery: l.battery ?? null,
  recorded_at: l.recordedAt,
});

const CACHE_LATEST = 'locations:latest';

export const locationsRepo = {
  /** Tek nokta yaz (tracking listener'ından çağrılır) */
  async write(userId: string, pos: GeoPosition, employeeId?: string): Promise<void> {
    const row: LocationRow = {
      userId,
      employeeId: employeeId ?? null,
      lat: pos.latitude,
      lng: pos.longitude,
      accuracy: pos.accuracy ?? null,
      speed: pos.speed ?? null,
      heading: pos.heading ?? null,
      isMock: !!pos.isMock,
      recordedAt: new Date(pos.timestamp).toISOString(),
    };
    if (!isOnlineMode()) {
      // Offline: yalnızca latest cache'i güncelle (geçmiş offline tutulmaz)
      const list = (await cacheGet<LocationRow[]>(CACHE_LATEST)) ?? [];
      const filtered = list.filter(x => x.userId !== userId);
      await cacheSet(CACHE_LATEST, [row, ...filtered]);
      return;
    }
    const { error } = await supabase.from('locations').insert(rowTo(row));
    if (error) {
      // Tracking listener'ı kırmamak için throw etmiyoruz; ancak error-level loglayıp
      // son başarısız noktayı cache'e düşürelim — reconnect ile harita yine düzgün olur.
      console.error('[locations.write] insert failed', error.message);
      const list = (await cacheGet<LocationRow[]>(CACHE_LATEST)) ?? [];
      const filtered = list.filter(x => x.userId !== userId);
      await cacheSet(CACHE_LATEST, [row, ...filtered]);
    }
  },

  /** Tüm kullanıcıların son konumu (harita için) */
  async latestAll(): Promise<LocationRow[]> {
    if (!isOnlineMode()) return (await cacheGet<LocationRow[]>(CACHE_LATEST)) ?? [];
    const { data, error } = await supabase
      .from('latest_locations')
      .select('*');
    if (error) {
      console.warn('[locations.latestAll]', error.message);
      return (await cacheGet<LocationRow[]>(CACHE_LATEST)) ?? [];
    }
    const list = (data ?? []).map(rowFrom);
    await cacheSet(CACHE_LATEST, list);
    return list;
  },

  /** Bir kullanıcının konum geçmişi (POZ-DEV-016) */
  async history(userId: string, fromIso: string, toIso: string): Promise<LocationRow[]> {
    if (!isOnlineMode() || !isUuid(userId)) return [];
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', fromIso)
      .lte('recorded_at', toIso)
      .order('recorded_at', { ascending: true });
    if (error) {
      console.warn('[locations.history]', error.message);
      return [];
    }
    return (data ?? []).map(rowFrom);
  },

  /** Realtime: yeni konum geldiğinde callback (POZ-DEV-015) */
  subscribeRealtime(onInsert: (loc: LocationRow) => void) {
    if (!isOnlineMode()) return () => {};
    const ch = supabase
      .channel('locations-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'locations' },
        payload => onInsert(rowFrom(payload.new))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  },

  /** Sahte konum kayıtları (POZ-DEV-119) */
  async listMockRecent(limit = 100): Promise<LocationRow[]> {
    if (!isOnlineMode()) return [];
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_mock', true)
      .order('recorded_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.warn('[locations.listMockRecent]', error.message);
      return [];
    }
    return (data ?? []).map(rowFrom);
  },
};
