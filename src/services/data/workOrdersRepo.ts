// ====================================================================
// WorkOrders Repository — POZ-DEV-004
// ====================================================================

import {
  supabase,
  isOnlineMode,
  cacheGet,
  cacheSet,
  enqueueSync,
  Repository,
} from './repository';
import { workOrderFromRow, workOrderToRow } from './mappers';
import type { WorkOrder } from '../../types';

const CACHE_KEY = 'work_orders';

export const workOrdersRepo: Repository<WorkOrder> = {
  async list(): Promise<WorkOrder[]> {
    if (!isOnlineMode()) return (await cacheGet<WorkOrder[]>(CACHE_KEY)) ?? [];
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[workOrders.list]', error.message);
      return (await cacheGet<WorkOrder[]>(CACHE_KEY)) ?? [];
    }
    const list = (data ?? []).map(workOrderFromRow);
    await cacheSet(CACHE_KEY, list);
    return list;
  },

  async insert(w: WorkOrder): Promise<WorkOrder> {
    if (!isOnlineMode()) {
      await enqueueSync({ id: w.id, table: 'work_orders', action: 'insert', payload: w });
      const list = (await cacheGet<WorkOrder[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, [w, ...list]);
      return w;
    }
    // Auth uid'i çek: RLS wo_owner_write created_by = auth.uid() istiyor.
    // Aksi halde saha kullanıcısının insert'i sessizce reddediliyor → admin göremiyor.
    let userId: string | undefined;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    } catch { /* ignore */ }
    const { error } = await supabase.from('work_orders').insert(workOrderToRow(w, userId));
    if (error) throw new Error(`[workOrders.insert] ${error.message}`);
    return w;
  },

  async update(id: string, w: WorkOrder): Promise<WorkOrder> {
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'work_orders', action: 'update', payload: w });
      return w;
    }
    let userId: string | undefined;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    } catch { /* ignore */ }
    // App id `number` kolonunda saklanır (DB id = uuid).
    const { error } = await supabase.from('work_orders').update(workOrderToRow(w, userId)).eq('number', id);
    if (error) throw new Error(`[workOrders.update] ${error.message}`);
    return w;
  },

  async delete(id: string): Promise<void> {
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'work_orders', action: 'delete', payload: { id } });
      return;
    }
    // DB'den sil. 0 satır dönmesi HATA DEĞİLDİR: kayıt yerel-only olabilir
    // (hiç senkronlanmadı) — bu durumda yerel state'ten kaldırmak yeterlidir.
    // Yalnızca gerçek bir Supabase hatası (ağ/izin) fırlatılır.
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('number', id);
    if (error) throw new Error(`[workOrders.delete] ${error.message}`);
  },
};
