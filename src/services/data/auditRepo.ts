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
};
