// ====================================================================
// Location Check-ins Repository — POZ-DEV-020, 021
// QR / NFC ile lokasyon doğrulama kayıtları
// ====================================================================

import { supabase, isOnlineMode, cacheGet, cacheSet, newUuid, isUuid, enqueueSync } from './repository';
import { auditRepo } from './auditRepo';

export interface Checkin {
  id?: string;
  userId: string;
  customerId?: string | null;
  siteCode: string;
  method: 'qr' | 'nfc' | 'manual';
  lat?: number | null;
  lng?: number | null;
  /** Hangi iş emrine bağlı check-in (FIELD işinde 'Başladı' kapısı için). */
  workOrderId?: string | null;
  recordedAt?: string;
}

const CACHE_KEY = 'checkins:mine';

export const checkinsRepo = {
  async create(c: Checkin): Promise<Checkin | null> {
    const id = newUuid();
    const recordedAt = new Date().toISOString();
    const payload = {
      id,
      user_id: c.userId,
      customer_id: c.customerId ?? null,
      site_code: c.siteCode,
      method: c.method,
      lat: c.lat ?? null,
      lng: c.lng ?? null,
      work_order_id: c.workOrderId ?? null,
      recorded_at: recordedAt,
    };
    const record: Checkin = { ...c, id, recordedAt };

    // Check-in'i HER ZAMAN yerel cache'e yaz (online da olsa). Böylece 'Başladı'
    // check-in kontrolü (hasRecentCheckin) tablonun deploy durumundan ve ağdan
    // BAĞIMSIZ çalışır; az önce yapılan check-in daima görünür.
    const cur = (await cacheGet<Checkin[]>(CACHE_KEY)) ?? [];
    await cacheSet(CACHE_KEY, [record, ...cur].slice(0, 50));
    void auditRepo.logCurrent({ action: 'work_order.checkin', tableName: 'location_checkins', refId: c.workOrderId ?? id, meta: { siteCode: c.siteCode, method: c.method, workOrderId: c.workOrderId ?? null } });

    if (!isOnlineMode()) {
      // Offline: DB yazımını kuyruğa al — aksi halde saha check-in'i kalıcı kaybolurdu.
      try { await enqueueSync({ id, table: 'location_checkins', action: 'insert', payload }); } catch { /* sessiz */ }
      return record;
    }

    const { data, error } = await supabase
      .from('location_checkins')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.warn('[checkins.create]', error.message);
      // DB reddi (tablo yok / RLS): yerel kayıt cache'te, DB için kuyruğa al.
      try { await enqueueSync({ id, table: 'location_checkins', action: 'insert', payload }); } catch { /* sessiz */ }
      return record;
    }
    return {
      id: data.id,
      userId: data.user_id,
      customerId: data.customer_id,
      siteCode: data.site_code,
      method: data.method,
      lat: data.lat != null ? Number(data.lat) : null,
      lng: data.lng != null ? Number(data.lng) : null,
      workOrderId: data.work_order_id ?? null,
      recordedAt: data.recorded_at,
    };
  },

  /** Bu iş emri için son `withinMs` içinde (varsayılan 2 saat) bir check-in var mı?
   *  Yerel cache'e bakar (create her zaman cache'e yazar) → deploy/ağ bağımsız. */
  async hasRecentCheckin(workOrderId: string, withinMs = 2 * 60 * 60 * 1000): Promise<boolean> {
    if (!workOrderId) return false;
    const now = Date.now();
    const local = (await cacheGet<Checkin[]>(CACHE_KEY)) ?? [];
    return local.some(c =>
      c.workOrderId === workOrderId &&
      c.recordedAt != null &&
      now - new Date(c.recordedAt).getTime() <= withinMs,
    );
  },

  async listMine(userId: string, limit = 20): Promise<Checkin[]> {
    if (!isOnlineMode() || !isUuid(userId)) return (await cacheGet<Checkin[]>(CACHE_KEY)) ?? [];
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
      workOrderId: r.work_order_id ?? null,
      recordedAt: r.recorded_at,
    }));
  },
};
