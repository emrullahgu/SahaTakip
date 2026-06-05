// payrollHr.ts — Bölüm 4: Supabase tabanlı bordro + izin (RLS maaş gizliliği).
// payroll_records / leave_requests tablolarıyla konuşur. RLS sayesinde standart
// kullanıcı yalnız KENDİ kayıtlarını görür; yönetici/admin hepsini.
import { supabase, SUPABASE_CONFIGURED } from './supabase';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  period: string;       // 'YYYY-MM'
  gross: number;
  deductions: number;
  advances: number;
  net: number;
  status: 'draft' | 'approved' | 'paid';
  paidAt?: string;
  notes?: string;
  createdAt?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveType: 'annual' | 'sick' | 'unpaid' | 'other';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  decidedAt?: string;
  createdAt?: string;
}

export const LEAVE_TYPE_LABEL: Record<LeaveRequest['leaveType'], string> = {
  annual: 'Yıllık İzin', sick: 'Raporlu', unpaid: 'Ücretsiz İzin', other: 'Diğer',
};
export const LEAVE_STATUS_LABEL: Record<LeaveRequest['status'], string> = {
  pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi',
};

const prFromRow = (r: any): PayrollRecord => ({
  id: r.id, employeeId: r.employee_id, period: r.period,
  gross: Number(r.gross) || 0, deductions: Number(r.deductions) || 0,
  advances: Number(r.advances) || 0, net: Number(r.net) || 0,
  status: r.status, paidAt: r.paid_at ?? undefined, notes: r.notes ?? undefined,
  createdAt: r.created_at,
});
const lrFromRow = (r: any): LeaveRequest => ({
  id: r.id, employeeId: r.employee_id, startDate: r.start_date, endDate: r.end_date,
  leaveType: r.leave_type, reason: r.reason ?? undefined, status: r.status,
  approvedBy: r.approved_by ?? undefined, decidedAt: r.decided_at ?? undefined,
  createdAt: r.created_at,
});

// ---------- Bordro ----------
export async function listPayrollRecords(period?: string): Promise<PayrollRecord[]> {
  if (!SUPABASE_CONFIGURED) return [];
  let q = supabase.from('payroll_records').select('*').order('period', { ascending: false });
  if (period) q = q.eq('period', period);
  const { data, error } = await q;
  if (error) { console.warn('[payrollHr.list]', error.message); return []; }
  return (data ?? []).map(prFromRow);
}

/** Bordro kaydı oluştur/güncelle (net otomatik hesaplanır). Yalnız yönetici (RLS). */
export async function upsertPayrollRecord(input: {
  id?: string; employeeId: string; period: string;
  gross: number; deductions?: number; advances?: number;
  status?: PayrollRecord['status']; notes?: string;
}): Promise<PayrollRecord | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const deductions = Number(input.deductions) || 0;
  const advances = Number(input.advances) || 0;
  const net = (Number(input.gross) || 0) - deductions - advances;
  const row: any = {
    employee_id: input.employeeId, period: input.period,
    gross: input.gross, deductions, advances, net,
    status: input.status ?? 'draft', notes: input.notes ?? null,
  };
  if (input.id) row.id = input.id;
  const { data, error } = await supabase
    .from('payroll_records')
    .upsert(row, { onConflict: 'employee_id,period' })
    .select().single();
  if (error) throw new Error(`[payroll.upsert] ${error.message}`);
  return prFromRow(data);
}

// ---------- İzin ----------
export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from('leave_requests').select('*').order('created_at', { ascending: false });
  if (error) { console.warn('[leave.list]', error.message); return []; }
  return (data ?? []).map(lrFromRow);
}

export async function createLeaveRequest(input: {
  employeeId: string; startDate: string; endDate: string;
  leaveType: LeaveRequest['leaveType']; reason?: string;
}): Promise<LeaveRequest> {
  const { data, error } = await supabase.from('leave_requests').insert({
    employee_id: input.employeeId, start_date: input.startDate, end_date: input.endDate,
    leave_type: input.leaveType, reason: input.reason ?? null, status: 'pending',
  }).select().single();
  if (error) throw new Error(`[leave.create] ${error.message}`);
  return lrFromRow(data);
}

/** İzin talebini sil (kendi bekleyen talebi veya yönetici — RLS). */
export async function deleteLeaveRequest(id: string): Promise<void> {
  const { error } = await supabase.from('leave_requests').delete().eq('id', id);
  if (error) throw new Error(`[leave.delete] ${error.message}`);
}

/** İzin talebini onayla/reddet (yalnız yönetici — RLS). */
export async function decideLeaveRequest(id: string, approve: boolean): Promise<void> {
  let approverId: string | undefined;
  try { const { data } = await supabase.auth.getUser(); approverId = data.user?.id; } catch { /* ignore */ }
  const { error } = await supabase.from('leave_requests').update({
    status: approve ? 'approved' : 'rejected',
    approved_by: approverId ?? null,
    decided_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error(`[leave.decide] ${error.message}`);
}

/** Personel kaydını bir login kullanıcısına bağla (self-view RLS için). */
export async function linkEmployeeToUser(employeeId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('employees').update({ user_id: userId }).eq('id', employeeId);
  if (error) throw new Error(`[employee.link] ${error.message}`);
}
