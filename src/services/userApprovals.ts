// User approval service — admin/manager yeni kayıt başvurularını onaylar/reddeder.
// SQL: supabase/schema.sql sonunda tanımlı `pending_user_approvals` view + `set_user_approval` RPC.

import { supabase } from './supabase';
import type { ApprovalStatus, UserRole } from '../context/AuthContext';

const SUPABASE_CONFIGURED: boolean = !!(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export interface PendingUser {
  id: string;
  full_name: string | null;
  role: UserRole;
  email: string;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  created_at: string;
}

export async function listPendingUsers(): Promise<PendingUser[]> {
  if (!SUPABASE_CONFIGURED) return [];
  // Tercih: SECURITY DEFINER RPC (admin/manager kontrolü + auth.users join'ı içeride)
  const { data, error } = await supabase.rpc('list_pending_user_approvals');
  if (!error && Array.isArray(data)) {
    return data as PendingUser[];
  }
  // Fallback: view'dan oku (eski şema)
  const { data: viewData, error: viewError } = await supabase
    .from('pending_user_approvals')
    .select('*');
  if (viewError) {
    console.warn('[userApprovals] list error:', error?.message ?? viewError.message);
    return [];
  }
  return (viewData ?? []) as PendingUser[];
}

export async function approveUser(userId: string): Promise<{ error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase.rpc('set_user_approval', {
    target_id: userId,
    new_status: 'approved',
    reason: null,
  });
  return { error: error?.message ?? null };
}

export async function rejectUser(
  userId: string,
  reason: string,
): Promise<{ error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase.rpc('set_user_approval', {
    target_id: userId,
    new_status: 'rejected',
    reason: reason || null,
  });
  return { error: error?.message ?? null };
}
