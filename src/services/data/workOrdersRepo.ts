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
    const { error } = await supabase.from('work_orders').insert(workOrderToRow(w));
    if (error) throw new Error(`[workOrders.insert] ${error.message}`);
    return w;
  },

  async update(id: string, w: WorkOrder): Promise<WorkOrder> {
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'work_orders', action: 'update', payload: w });
      return w;
    }
    const { error } = await supabase.from('work_orders').update(workOrderToRow(w)).eq('id', id);
    if (error) throw new Error(`[workOrders.update] ${error.message}`);
    return w;
  },

  async delete(id: string): Promise<void> {
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'work_orders', action: 'delete', payload: { id } });
      return;
    }
    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) throw new Error(`[workOrders.delete] ${error.message}`);
  },
};
