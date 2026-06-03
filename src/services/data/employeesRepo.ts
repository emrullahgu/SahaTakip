// ====================================================================
// Employees Repository — POZ-DEV-005
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
import { employeeFromRow, employeeToRow } from './mappers';
import type { Employee } from '../../types';

const CACHE_KEY = 'employees';

export const employeesRepo: Repository<Employee> = {
  async list(): Promise<Employee[]> {
    if (!isOnlineMode()) return (await cacheGet<Employee[]>(CACHE_KEY)) ?? [];
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('active', true)
      .order('full_name');
    if (error) {
      console.warn('[employees.list]', error.message);
      return (await cacheGet<Employee[]>(CACHE_KEY)) ?? [];
    }
    const list = (data ?? []).map(employeeFromRow);
    await cacheSet(CACHE_KEY, list);
    return list;
  },

  async insert(e: Employee): Promise<Employee> {
    if (!isOnlineMode()) {
      await enqueueSync({ id: e.id, table: 'employees', action: 'insert', payload: e });
      return e;
    }
    const { error } = await supabase.from('employees').insert(employeeToRow(e));
    if (error) throw new Error(`[employees.insert] ${error.message}`);
    return e;
  },

  async update(id: string, e: Employee): Promise<Employee> {
    // Non-UUID id (eski/yerel kayıt) DB'de yok; yalnızca cache'te güncelle.
    if (!isUuid(id)) {
      const cached = (await cacheGet<Employee[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, cached.map(x => (x.id === id ? e : x)));
      return e;
    }
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'employees', action: 'update', payload: e });
      return e;
    }
    const { error } = await supabase.from('employees').update(employeeToRow(e)).eq('id', id);
    if (error) throw new Error(`[employees.update] ${error.message}`);
    return e;
  },

  async delete(id: string): Promise<void> {
    // Non-UUID id Supabase'e hiç yazılmadı → DB'ye gitme, cache'ten çıkar.
    if (!isUuid(id)) {
      const cached = (await cacheGet<Employee[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, cached.filter(x => x.id !== id));
      return;
    }
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'employees', action: 'delete', payload: { id } });
      return;
    }
    // Soft delete — active=false
    const { error } = await supabase.from('employees').update({ active: false }).eq('id', id);
    if (error) throw new Error(`[employees.delete] ${error.message}`);
  },
};
