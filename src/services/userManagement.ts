// User management service — admin tüm kullanıcıları görür, rol atar, onay durumunu değiştirir.
// SQL: schema.sql sonunda tanımlı `list_all_users` + `set_user_role` + `set_user_approval` RPC'leri.

import { supabase } from './supabase';
import { auditRepo } from './data/auditRepo';
import type { ApprovalStatus, UserRole } from '../context/AuthContext';

const SUPABASE_CONFIGURED: boolean = !!(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export interface AppUser {
  id: string;
  full_name: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  email: string;
  last_sign_in_at: string | null;
}

export async function listAllUsers(): Promise<AppUser[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase.rpc('list_all_users');
  if (error) {
    console.warn('[userManagement] list error:', error.message);
    return [];
  }
  return (data ?? []) as AppUser[];
}

export async function setUserRole(
  userId: string,
  role: UserRole,
): Promise<{ error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase.rpc('set_user_role', {
    target_id: userId,
    new_role: role,
  });
  // İzsiz ayrıcalık-verme yolunu kapat: kim kime hangi rolü verdi denetime yazılır.
  // (Sunucu RPC'si de loglamalı; bu client-tarafı stopgap aktörü hemen kaydeder.)
  if (!error) void auditRepo.logCurrent({ action: 'user.role.set', tableName: 'profiles', refId: userId, meta: { role } });
  return { error: error?.message ?? null };
}

export async function setUserApprovalStatus(
  userId: string,
  status: ApprovalStatus,
  reason?: string,
): Promise<{ error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase.rpc('set_user_approval', {
    target_id: userId,
    new_status: status,
    reason: reason || null,
  });
  if (!error) void auditRepo.logCurrent({ action: 'user.approval.set', tableName: 'profiles', refId: userId, meta: { status, reason: reason || null } });
  return { error: error?.message ?? null };
}
