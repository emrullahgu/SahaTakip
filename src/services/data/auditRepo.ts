// ====================================================================
// Audit Log Repository — POZ-DEV-010
// ====================================================================
// Kullanıcı işlemlerini audit_log tablosuna kaydeder.
// Hata fırlatmaz — sessiz başarısızlık (log etmesi denemesi UI'ı bozmasın).

import { supabase, isOnlineMode } from './repository';

export interface AuditEvent {
  action: string;          // 'quote.create', 'customer.delete', 'shift.start', vb.
  tableName?: string;      // 'quotes'
  refId?: string;          // İlgili kaydın id'si
  meta?: Record<string, any>;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_name?: string | null;
  action: string;
  table_name: string | null;
  ref_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export const auditRepo = {
  async log(userId: string | null, e: AuditEvent): Promise<void> {
    if (!isOnlineMode() || !userId) return;
    try {
      await supabase.from('audit_log').insert({
        user_id: userId,
        action: e.action,
        table_name: e.tableName ?? null,
        ref_id: e.refId ?? null,
        meta: e.meta ?? {},
      });
    } catch {
      /* sessiz */
    }
  },

  /** Aktif kullanıcıyı kendi çözerek loglar — React context'i olmayan servisler
   *  (payments/stock/cashRegister/payroll vb.) için kolaylık (denetim M9). */
  async logCurrent(e: AuditEvent): Promise<void> {
    if (!isOnlineMode()) return;
    try {
      const { data } = await supabase.auth.getUser();
      await this.log(data?.user?.id ?? null, e);
    } catch {
      /* sessiz */
    }
  },

  async list(limit = 100): Promise<AuditLogRow[]> {
    if (!isOnlineMode()) return [];
    try {
      const { data } = await supabase
        .from('audit_log')
        .select('id, user_id, action, table_name, ref_id, meta, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data as AuditLogRow[] | null) ?? [];
    } catch {
      return [];
    }
  },
};

