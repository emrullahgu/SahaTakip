import { WorkOrder, Employee, ServiceCatalogItem, MaterialCatalogItem } from '../types';
import { REAL_EMPLOYEES } from './realEmployees';
import { REAL_MATERIALS } from './realMaterials';
import { REAL_CUSTOMERS } from './realCustomers';

// Demo veriler kaldırıldı; servis kataloğu sahadan eklenir.
export const SERVICE_CATALOG: ServiceCatalogItem[] = [];

export const MATERIAL_CATALOG: MaterialCatalogItem[] = REAL_MATERIALS;

export const CLIENTS: string[] = REAL_CUSTOMERS
  .filter(c => c.type !== 'Tedarikçi')
  .map(c => c.title);

// İş emirleri sahada / Supabase üzerinden oluşur. Demo seed yok.
export const INITIAL_WORK_ORDERS: WorkOrder[] = [];

export const INITIAL_EMPLOYEES: Employee[] = REAL_EMPLOYEES;
