// ====================================================================
// customerSites — POZ-DEV-044
// Müşteriye bağlı saha/lokasyon listesi. AsyncStorage tabanlı.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerSite } from '../types';

const KEY = '@SahaTakip:customer_sites';

export async function listSites(): Promise<CustomerSite[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CustomerSite[]) : [];
  } catch {
    return [];
  }
}

export async function listSitesByCustomer(customerId: string): Promise<CustomerSite[]> {
  const all = await listSites();
  return all.filter(s => s.customerId === customerId);
}

export async function saveSites(list: CustomerSite[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertSite(s: CustomerSite) {
  const all = await listSites();
  const idx = all.findIndex(x => x.id === s.id);
  if (idx >= 0) all[idx] = s;
  else all.unshift(s);
  await saveSites(all);
}

export async function deleteSite(id: string) {
  const all = await listSites();
  await saveSites(all.filter(s => s.id !== id));
}
