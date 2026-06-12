// ====================================================================
// Sync Drain — POZ-DEV-011
// Offline iken biriken işlemleri online olduğunda Supabase'e yazar.
// ====================================================================

import { supabase, isOnlineMode, getSyncQueue, clearSyncOp } from './repository';
import {
  quoteToRow,
  quoteLineToRow,
  customerToRow,
  workOrderToRow,
  employeeToRow,
  expenseToRow,
} from './mappers';

let draining = false;

export { getSyncQueue };

/**
 * Sync kuyruğundaki tüm bekleyen operasyonları sırayla Supabase'e gönderir.
 * Online değilse no-op. Aynı anda birden fazla drain başlamaz.
 */
export async function drainSyncQueue(): Promise<{ ok: number; failed: number }> {
  if (!isOnlineMode() || draining) return { ok: 0, failed: 0 };
  draining = true;
  let ok = 0;
  let failed = 0;
  try {
    const queue = await getSyncQueue();
    for (const op of queue) {
      try {
        await applyOp(op);
        await clearSyncOp(op.id);
        ok++;
      } catch (e: any) {
        const msg = String(e?.message || e);
        // Kalıcı hata: yerel-id (UUID değil) bir kayıt → DB'ye asla yazılamaz, kuyruktan düş
        if (/invalid input syntax for type uuid/i.test(msg)) {
          console.warn('[sync] dropping unrecoverable op', op.table, op.action, op.id, msg);
          await clearSyncOp(op.id);
          failed++;
          continue;
        }
        console.warn('[sync] op failed', op.table, op.action, e);
        failed++;
      }
    }
  } finally {
    draining = false;
  }
  return { ok, failed };
}

// export: birim testi (syncDrain.test.ts) doğrudan dal mantığını doğrular (denetim M10).
export async function applyOp(op: { table: string; action: string; payload: any }) {
  const { table, action, payload } = op;

  // Offline biriken kayıtlar dren edilirken created_by set edilmeli; aksi halde
  // RLS owner-write politikası reddedip kaydı düşürür (kalıcı veri kaybı).
  let userId: string | undefined;
  try { const { data } = await supabase.auth.getUser(); userId = data?.user?.id ?? undefined; } catch { /* ignore */ }

  // ROW BUILDER — payload'u DB satırına çevir
  const toRow = (): any => {
    switch (table) {
      case 'quotes':
        return quoteToRow(payload, userId);
      case 'customers':
        return customerToRow(payload, userId);
      case 'work_orders':
        return workOrderToRow(payload, userId);
      case 'employees':
        return employeeToRow(payload);
      case 'expenses':
        return expenseToRow(payload, userId);
      default:
        return payload;
    }
  };

  // work_orders app id'yi text `number` kolonunda tutar (DB id = uuid); diğer
  // tablolar uuid `id` kullanır. Yanlış kolonla eşleştirme 0 satır → sessiz kayıp.
  const keyCol = table === 'work_orders' ? 'number' : 'id';

  if (action === 'delete') {
    // quotes/work_orders/customers soft-delete kullanır (deleted_at). Diğerleri hard delete.
    const SOFT = table === 'quotes' || table === 'work_orders' || table === 'customers';
    const { error } = SOFT
      ? await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq(keyCol, payload.id)
      : await supabase.from(table).delete().eq(keyCol, payload.id);
    if (error) throw new Error(error.message);
    return;
  }

  if (action === 'insert') {
    // İDEMPOTENT: kısmi başarısızlıkta (ör. quotes yazıldı ama quote_lines koptu)
    // op kuyrukta kalır; tekrar denemede plain insert 'duplicate key' verip kuyruğu
    // kalıcı tıkardı. Bu yüzden upsert. work_orders'da DB id auto-uuid, app id'si
    // benzersiz `number` kolonunda → çakışma kolonu number; diğerleri PK (id).
    const upsertOpts = table === 'work_orders' ? { onConflict: 'number' } : undefined;
    const { error } = await supabase.from(table).upsert(toRow(), upsertOpts as any);
    if (error) throw new Error(error.message);
    // Teklif insert ise satırları da yaz — önce mevcutları sil (kısmi insert
    // tekrarında çift satır oluşmasın), sonra ekle.
    if (table === 'quotes' && payload.lines?.length) {
      const { error: eDel } = await supabase.from('quote_lines').delete().eq('quote_id', payload.id);
      if (eDel) throw new Error(eDel.message);
      const lineRows = payload.lines.map((l: any) => quoteLineToRow(payload.id, l));
      const { error: e2 } = await supabase.from('quote_lines').insert(lineRows);
      if (e2) throw new Error(e2.message);
    }
    return;
  }

  if (action === 'update') {
    // created_by update'te GÖNDERİLMEZ — sahiplik korunur (insert'te atanır).
    const { created_by, ...row } = toRow();
    void created_by;
    const { error } = await supabase.from(table).update(row).eq(keyCol, payload.id);
    if (error) throw new Error(error.message);
    if (table === 'quotes') {
      const { error: eDel } = await supabase.from('quote_lines').delete().eq('quote_id', payload.id);
      if (eDel) throw new Error(eDel.message);
      if (payload.lines?.length) {
        const lineRows = payload.lines.map((l: any) => quoteLineToRow(payload.id, l));
        const { error: eIns } = await supabase.from('quote_lines').insert(lineRows);
        if (eIns) throw new Error(eIns.message);
      }
    }
  }
}
