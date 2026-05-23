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
      } catch (e) {
        console.warn('[sync] op failed', op.table, op.action, e);
        failed++;
      }
    }
  } finally {
    draining = false;
  }
  return { ok, failed };
}

async function applyOp(op: { table: string; action: string; payload: any }) {
  const { table, action, payload } = op;

  // ROW BUILDER — payload'u DB satırına çevir
  const toRow = (): any => {
    switch (table) {
      case 'quotes':
        return quoteToRow(payload);
      case 'customers':
        return customerToRow(payload);
      case 'work_orders':
        return workOrderToRow(payload);
      case 'employees':
        return employeeToRow(payload);
      default:
        return payload;
    }
  };

  if (action === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', payload.id);
    if (error) throw new Error(error.message);
    return;
  }

  if (action === 'insert') {
    const { error } = await supabase.from(table).insert(toRow());
    if (error) throw new Error(error.message);
    // Teklif insert ise satırları da yaz
    if (table === 'quotes' && payload.lines?.length) {
      const lineRows = payload.lines.map((l: any) => quoteLineToRow(payload.id, l));
      const { error: e2 } = await supabase.from('quote_lines').insert(lineRows);
      if (e2) throw new Error(e2.message);
    }
    return;
  }

  if (action === 'update') {
    const { error } = await supabase.from(table).update(toRow()).eq('id', payload.id);
    if (error) throw new Error(error.message);
    if (table === 'quotes') {
      await supabase.from('quote_lines').delete().eq('quote_id', payload.id);
      if (payload.lines?.length) {
        const lineRows = payload.lines.map((l: any) => quoteLineToRow(payload.id, l));
        await supabase.from('quote_lines').insert(lineRows);
      }
    }
  }
}
