// bordro.ts — Birleşik bordro veri katmanı (Supabase + offline cache).
// RLS: herkes KENDİ bordrosunu görür (employees.user_id eşleşmesi), yönetici/müdür
// HERKESİ görür; yazma yalnız yönetici/müdür. Hesap motoru: bordroEngine.calcBordro.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { newUuid } from './data/repository';
import { calcBordro } from './bordroEngine';
import type { Bordro, BordroStatus } from '../types';

const KEY = 'bordro_v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOrNull = (v?: string | null): string | null => (v && UUID_RE.test(v) ? v : null);
const now = () => new Date().toISOString();

export const BORDRO_STATUS_LABEL: Record<BordroStatus, string> = {
  taslak: 'Taslak', onaylandi: 'Onaylandı', odendi: 'Ödendi',
};
export const BORDRO_STATUS_COLOR: Record<BordroStatus, string> = {
  taslak: '#64748b', onaylandi: '#0ea5e9', odendi: '#22c55e',
};

/** Geçerli ay 'YYYY-MM' (cihaz yerel saatiyle; tarih util tutarlılığı). */
export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
/** Son N ay seçenekleri (yeniden eskiye). */
export function recentPeriods(count = 12, base = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

async function loadCache(): Promise<Bordro[]> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function saveCache(list: Bordro[]): Promise<void> { await AsyncStorage.setItem(KEY, JSON.stringify(list)); }

function toRow(b: Bordro) {
  return {
    id: b.id,
    employee_id: uuidOrNull(b.employeeId),
    period: b.period,
    full_name: b.fullName,
    national_id: b.nationalId,
    agreed_net: b.agreedNet,
    worked_days: b.workedDays,
    overtime_hours: b.overtimeHours,
    sunday_holiday_days: b.sundayHolidayDays,
    absent_days: b.absentDays,
    advance: b.advance,
    expense: b.expense,
    bonus: b.bonus,
    official_salary: b.officialSalary,
    extra_payment: b.extraPayment,
    status: b.status,
    created_by: uuidOrNull(b.createdBy),
    created_at: b.createdAt,
    updated_at: b.updatedAt ?? b.createdAt,
  };
}
function fromRow(r: any): Bordro {
  return {
    id: r.id,
    employeeId: r.employee_id ?? '',
    period: r.period ?? currentPeriod(),
    fullName: r.full_name ?? '',
    nationalId: r.national_id ?? '',
    agreedNet: Number(r.agreed_net) || 0,
    workedDays: Number(r.worked_days) || 0,
    overtimeHours: Number(r.overtime_hours) || 0,
    sundayHolidayDays: Number(r.sunday_holiday_days) || 0,
    absentDays: Number(r.absent_days) || 0,
    advance: Number(r.advance) || 0,
    expense: Number(r.expense) || 0,
    bonus: Number(r.bonus) || 0,
    officialSalary: Number(r.official_salary) || 0,
    extraPayment: Number(r.extra_payment) || 0,
    status: (r.status as BordroStatus) ?? 'taslak',
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at ?? now(),
    updatedAt: r.updated_at ?? undefined,
  };
}

/** RLS-filtrelenmiş tüm bordrolar (kendi veya — yöneticiyse — herkes). */
export async function listBordro(): Promise<Bordro[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('bordro_aylik').select('*').order('full_name');
      if (!error && data) { const list = data.map(fromRow); await saveCache(list); return list; }
    } catch { /* offline fallback */ }
  }
  return loadCache();
}

export async function bordroForPeriod(period: string): Promise<Bordro[]> {
  return (await listBordro()).filter(b => b.period === period).sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr'));
}

export async function saveBordro(input: Partial<Bordro> & { id?: string; employeeId: string; period: string; fullName: string }): Promise<Bordro> {
  const list = await loadCache();
  // Tekilleştirme DAİMA employeeId+period üzerinden (UI draftFor her zaman yeni id ürettiğinden
  // id'ye güvenilemez). Eşleşince mevcut satırın id'sini koru → mükerrer kayıt olmaz.
  const idx = list.findIndex(x => x.employeeId === input.employeeId && x.period === input.period);
  let b: Bordro = idx >= 0
    ? ({ ...list[idx], ...input, id: list[idx].id, updatedAt: now() } as Bordro)
    : {
        id: input.id || newUuid(),
        employeeId: input.employeeId, period: input.period, fullName: input.fullName,
        nationalId: input.nationalId ?? '', agreedNet: input.agreedNet ?? 0, workedDays: input.workedDays ?? 0,
        overtimeHours: input.overtimeHours ?? 0, sundayHolidayDays: input.sundayHolidayDays ?? 0, absentDays: input.absentDays ?? 0,
        advance: input.advance ?? 0, expense: input.expense ?? 0, bonus: input.bonus ?? 0,
        officialSalary: input.officialSalary ?? 0, extraPayment: input.extraPayment ?? 0,
        status: input.status ?? 'taslak', createdBy: input.createdBy, createdAt: input.createdAt ?? now(), updatedAt: now(),
      };

  if (SUPABASE_CONFIGURED) {
    // DÜRÜSTLÜK (Req#3): DB-FIRST — başarısızsa cache'e DOKUNMA (hayalet "kaydedildi" yok).
    // onConflict (employee_id, period): aynı personel+dönem ASLA mükerrer satır oluşturmaz.
    const row = toRow(b);
    const payload = idx >= 0 ? row : (({ id, ...rest }) => rest)(row); // yeni kayıtta id'yi DB'ye bırak
    const { data, error } = await supabase.from('bordro_aylik').upsert(payload, { onConflict: 'employee_id,period' }).select().single();
    if (error) throw new Error(`Bordro kaydedilemedi: ${error.message}`);
    b = fromRow(data);
    const fresh = await loadCache();
    const merged = fresh.some(x => x.employeeId === b.employeeId && x.period === b.period)
      ? fresh.map(x => (x.employeeId === b.employeeId && x.period === b.period ? b : x))
      : [b, ...fresh];
    await saveCache(merged);
    return b;
  }
  // Offline/demo: yerel kayıt (Supabase yapılandırılmamış).
  if (idx >= 0) list[idx] = b; else list.unshift(b);
  await saveCache(list);
  return b;
}

/** Bordro önbelleğini temizler. Çıkışta (signOut) çağrılmalı: paylaşılan cihazda
 *  bir kullanıcının maaş+TC verisi diğerine SIZMASIN (PII gizliliği). */
export async function clearBordroCache(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* sessiz */ }
}

export async function deleteBordro(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('bordro_aylik').delete().eq('id', id);
    if (error) throw new Error(`Bordro silinemedi: ${error.message}`);
  }
  const list = await loadCache();
  await saveCache(list.filter(b => b.id !== id));
}

/** Bir personelin o ay bordrosunu, mevcut "anlaşılan net" ile boş taslak olarak üretir (kaydetmez). */
export function draftFor(employeeId: string, fullName: string, period: string, agreedNet = 0, nationalId = ''): Bordro {
  return {
    id: newUuid(), employeeId, period, fullName, nationalId,
    agreedNet, workedDays: 30, overtimeHours: 0, sundayHolidayDays: 0, absentDays: 0,
    advance: 0, expense: 0, bonus: 0, officialSalary: 0, extraPayment: 0,
    status: 'taslak', createdAt: now(),
  };
}

/** Bordro satırının hesaplanmış toplamları. */
export function bordroTotals(b: Bordro) {
  return calcBordro({
    agreedNet: b.agreedNet, workedDays: b.workedDays, overtimeHours: b.overtimeHours,
    sundayHolidayDays: b.sundayHolidayDays, absentDays: b.absentDays, advance: b.advance,
    expense: b.expense, bonus: b.bonus, extraPayment: b.extraPayment,
  });
}
