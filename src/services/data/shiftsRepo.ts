// ====================================================================
// Shifts Repository — POZ-DEV-019 (Mesai başlat/bitir)
// ====================================================================

import { supabase, isOnlineMode, cacheGet, cacheSet } from './repository';

export interface Shift {
  id: string;
  userId: string;
  employeeId?: string | null;
  startAt: string;
  endAt?: string | null;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  breakMinutes: number;
  notes?: string | null;
}

const fromRow = (r: any): Shift => ({
  id: r.id,
  userId: r.user_id,
  employeeId: r.employee_id,
  startAt: r.start_at,
  endAt: r.end_at,
  startLat: r.start_lat != null ? Number(r.start_lat) : null,
  startLng: r.start_lng != null ? Number(r.start_lng) : null,
  endLat: r.end_lat != null ? Number(r.end_lat) : null,
  endLng: r.end_lng != null ? Number(r.end_lng) : null,
  breakMinutes: r.break_minutes ?? 0,
  notes: r.notes,
});

const CACHE_ACTIVE = 'shifts:active';

export const shiftsRepo = {
  /** Aktif vardiyamı getir (endAt null olan) */
  async getActive(userId: string): Promise<Shift | null> {
    if (!isOnlineMode()) {
      return (await cacheGet<Shift | null>(CACHE_ACTIVE)) ?? null;
    }
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .is('end_at', null)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[shifts.getActive]', error.message);
      return null;
    }
    return data ? fromRow(data) : null;
  },

  async start(userId: string, lat?: number, lng?: number, employeeId?: string): Promise<Shift | null> {
    const payload = {
      user_id: userId,
      employee_id: employeeId ?? null,
      start_at: new Date().toISOString(),
      start_lat: lat ?? null,
      start_lng: lng ?? null,
    };
    if (!isOnlineMode()) {
      const shift: Shift = {
        id: 'local-' + Date.now(),
        userId,
        employeeId,
        startAt: payload.start_at,
        startLat: lat ?? null,
        startLng: lng ?? null,
        breakMinutes: 0,
      };
      await cacheSet(CACHE_ACTIVE, shift);
      return shift;
    }
    const { data, error } = await supabase.from('shifts').insert(payload).select().single();
    if (error) {
      console.warn('[shifts.start]', error.message);
      return null;
    }
    return fromRow(data);
  },

  async end(shiftId: string, lat?: number, lng?: number, notes?: string): Promise<void> {
    if (!isOnlineMode()) {
      await cacheSet(CACHE_ACTIVE, null);
      return;
    }
    const { error } = await supabase
      .from('shifts')
      .update({
        end_at: new Date().toISOString(),
        end_lat: lat ?? null,
        end_lng: lng ?? null,
        notes: notes ?? null,
      })
      .eq('id', shiftId);
    if (error) console.warn('[shifts.end]', error.message);
  },

  async listMine(userId: string, limit = 30): Promise<Shift[]> {
    if (!isOnlineMode()) return [];
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .order('start_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map(fromRow);
  },

  /** Belirli ay (YYYY-MM) için tüm tamamlanmış vardiyaları getir (puantaj için) — POZ-DEV-123 */
  async listMonth(year: number, month: number, userId?: string): Promise<Shift[]> {
    if (!isOnlineMode()) return [];
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();
    let q = supabase
      .from('shifts')
      .select('*')
      .gte('start_at', start)
      .lt('start_at', end)
      .order('start_at', { ascending: true });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) return [];
    return (data ?? []).map(fromRow);
  },

  /** Şu anda aktif olan tüm vardiyaları getir (admin canlı izleme için). */
  async listActive(): Promise<Shift[]> {
    if (!isOnlineMode()) return [];
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .is('end_at', null)
      .order('start_at', { ascending: false });
    if (error) {
      console.warn('[shifts.listActive]', error.message);
      return [];
    }
    return (data ?? []).map(fromRow);
  },
};
