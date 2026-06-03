// ====================================================================
// Customers Repository — POZ-DEV-001 (iskelet)
// POZ-DEV-003'te AppContext bunu kullanır.
// ====================================================================

import {
  supabase,
  isOnlineMode,
  isUuid,
  cacheGet,
  cacheSet,
  enqueueSync,
  Repository,
} from './repository';
import { customerFromRow, customerToRow } from './mappers';
import type { Customer } from '../../types';

const CACHE_KEY = 'customers';

export const customersRepo: Repository<Customer> = {
  async list(): Promise<Customer[]> {
    if (!isOnlineMode()) return (await cacheGet<Customer[]>(CACHE_KEY)) ?? [];
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('short_name');
    if (error) {
      console.warn('[customersRepo.list]', error.message);
      return (await cacheGet<Customer[]>(CACHE_KEY)) ?? [];
    }
    const list = (data ?? []).map(customerFromRow);
    await cacheSet(CACHE_KEY, list);
    return list;
  },

  async insert(c: Customer): Promise<Customer> {
    if (!isOnlineMode()) {
      await enqueueSync({ id: c.id, table: 'customers', action: 'insert', payload: c });
      return c;
    }
    const { error } = await supabase.from('customers').insert(customerToRow(c));
    if (error) throw new Error(`[customers.insert] ${error.message}`);
    return c;
  },

  async update(id: string, c: Customer): Promise<Customer> {
    // Non-UUID id'ler (eski/yerel kayıtlar) DB'de yok; yalnızca cache'te güncelle.
    if (!isUuid(id)) {
      const cached = (await cacheGet<Customer[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, cached.map(x => (x.id === id ? c : x)));
      return c;
    }
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'customers', action: 'update', payload: c });
      return c;
    }
    const { error } = await supabase.from('customers').update(customerToRow(c)).eq('id', id);
    if (error) throw new Error(`[customers.update] ${error.message}`);
    return c;
  },

  async delete(id: string): Promise<void> {
    // Non-UUID id'ler Supabase'e hiç yazılmadı (ör. "cust-0312-teklif"); DB'ye gitme,
    // sadece yerel cache'ten çıkar. Aksi halde Postgres "invalid input syntax for type uuid" verir.
    if (!isUuid(id)) {
      const cached = (await cacheGet<Customer[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, cached.filter(x => x.id !== id));
      return;
    }
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'customers', action: 'delete', payload: { id } });
      return;
    }
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw new Error(`[customers.delete] ${error.message}`);
  },
};
