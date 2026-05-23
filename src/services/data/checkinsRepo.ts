// ====================================================================
// Location Check-ins Repository — POZ-DEV-020, 021
// QR / NFC ile lokasyon doğrulama kayıtları
// ====================================================================

import { supabase, isOnlineMode, cacheGet, cacheSet } from './repository';

export interface Checkin {
  id?: string;
  userId: string;
  customerId?: string | null;
  siteCode: string;
  method: 'qr' | 'nfc' | 'manual';
  lat?: number | null;
  lng?: number | null;
  recordedAt?: string;
}

const CACHE_KEY = 'checkins:mine';

export const checkinsRepo = {
  async create(c: Checkin): Promise<Checkin | null> {
    const payload = {
      user_id: c.userId,
      customer_id: c.customerId ?? null,
      site_code: c.siteCode,
      method: c.method,
      lat: c.lat ?? null,
      lng: c.lng ?? null,
    };
    if (!isOnlineMode()) {
      const fake: Checkin = { ...c, id: 'local-' + Date.now(), recordedAt: new Date().toISOString() };
      const cur = (await cacheGet<Checkin[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, [fake, ...cur].slice(0, 50));
      return fake;
    }
    const { data, error } = await supabase
      .from('location_checkins')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.warn('[checkins.create]', error.message);
      return null;
    }
    return {
      id: data.id,
      userId: data.user_id,
      customerId: data.customer_id,
      siteCode: data.site_code,
      method: data.method,
      lat: data.lat != null ? Number(data.lat) : null,
      lng: data.lng != null ? Number(data.lng) : null,
      recordedAt: data.recorded_at,
    };
  },

  async listMine(userId: string, limit = 20): Promise<Checkin[]> {
    if (!isOnlineMode()) return (await cacheGet<Checkin[]>(CACHE_KEY)) ?? [];
    const { data, error } = await supabase
      .from('location_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      customerId: r.customer_id,
      siteCode: r.site_code,
      method: r.method,
      lat: r.lat != null ? Number(r.lat) : null,
      lng: r.lng != null ? Number(r.lng) : null,
      recordedAt: r.recorded_at,
    }));
  },
};
