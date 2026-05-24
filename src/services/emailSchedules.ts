// Scheduled email reports service — günlük/haftalık/aylık/yıllık rapor mailleri.
// SQL: supabase/schema.sql sonunda tanımlı `email_schedules` tablosu + RPC'ler.
// Edge Function: supabase/functions/dispatch-email-reports

import { supabase } from './supabase';

const SUPABASE_CONFIGURED: boolean = !!(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export type ScheduleKind = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReportType = 'summary' | 'kpi' | 'workorders' | 'collections' | 'custom';
export type DispatchStatus = 'success' | 'failed' | 'partial';

export interface EmailSchedule {
  id: string;
  name: string;
  kind: ScheduleKind;
  report_type: ReportType;
  recipients: string[];
  role_filter: string[] | null;
  subject_template: string | null;
  body_template: string | null;
  hour_utc: number;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  active: boolean;
  last_run_at: string | null;
  last_status: DispatchStatus | null;
  last_error: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface EmailScheduleInput {
  name: string;
  kind: ScheduleKind;
  report_type?: ReportType;
  recipients?: string[];
  role_filter?: string[] | null;
  subject_template?: string | null;
  body_template?: string | null;
  hour_utc?: number;
  day_of_week?: number | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
  active?: boolean;
}

export async function listSchedules(): Promise<EmailSchedule[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from('email_schedules')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[emailSchedules] list error:', error.message);
    return [];
  }
  return (data ?? []) as EmailSchedule[];
}

export async function createSchedule(input: EmailScheduleInput): Promise<{ error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase.from('email_schedules').insert({
    report_type: 'summary',
    recipients: [],
    hour_utc: 6,
    active: true,
    ...input,
  });
  return { error: error?.message ?? null };
}

export async function updateSchedule(id: string, patch: Partial<EmailScheduleInput>): Promise<{ error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase.from('email_schedules').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteSchedule(id: string): Promise<{ error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase.from('email_schedules').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function toggleSchedule(id: string, active: boolean): Promise<{ error: string | null }> {
  return updateSchedule(id, { active });
}

export async function runNow(id: string): Promise<{ error: string | null }> {
  // next_run_at = now() → bir sonraki cron tick'inde işlenir
  if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
  const { error } = await supabase
    .from('email_schedules')
    .update({ next_run_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export interface DispatchLogEntry {
  id: string;
  schedule_id: string | null;
  recipients: string[];
  subject: string | null;
  status: DispatchStatus;
  error: string | null;
  sent_at: string;
}

export async function listDispatchLogs(scheduleId?: string, limit = 50): Promise<DispatchLogEntry[]> {
  if (!SUPABASE_CONFIGURED) return [];
  let q = supabase
    .from('email_dispatch_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (scheduleId) q = q.eq('schedule_id', scheduleId);
  const { data, error } = await q;
  if (error) {
    console.warn('[emailSchedules] logs error:', error.message);
    return [];
  }
  return (data ?? []) as DispatchLogEntry[];
}

export const KIND_LABEL: Record<ScheduleKind, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  yearly: 'Yıllık',
};

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  summary: 'Genel Özet',
  kpi: 'KPI Raporu',
  workorders: 'İş Emirleri',
  collections: 'Tahsilat',
  custom: 'Özel',
};
