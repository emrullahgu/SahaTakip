// ====================================================================
// customerRatings — POZ-DEV-047
// İş emri tamamlandıktan sonra alınan müşteri puanları.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerRating } from '../types';

const KEY = '@SahaTakip:customer_ratings';

export async function listRatings(): Promise<CustomerRating[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CustomerRating[]) : [];
  } catch {
    return [];
  }
}

export async function listRatingsByCustomer(customerId: string): Promise<CustomerRating[]> {
  const all = await listRatings();
  return all
    .filter(r => r.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveRatings(list: CustomerRating[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function addRating(
  r: Omit<CustomerRating, 'id' | 'createdAt'>,
): Promise<CustomerRating> {
  const newR: CustomerRating = {
    ...r,
    id: `rate-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const all = await listRatings();
  all.unshift(newR);
  await saveRatings(all);
  return newR;
}

export async function averageScore(customerId: string): Promise<number> {
  const list = await listRatingsByCustomer(customerId);
  if (list.length === 0) return 0;
  return list.reduce((s, r) => s + r.score, 0) / list.length;
}
