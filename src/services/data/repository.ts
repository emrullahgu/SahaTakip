// ====================================================================
// SahaTakip — Data Layer (POZ-DEV-001)
// ====================================================================
// Tüm CRUD bu katmandan geçer. UI doğrudan supabase'i çağırmaz.
//
// Modlar:
//   - online:   EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY tanımlıysa Supabase'e yazar
//               + AsyncStorage'a cache eder (offline okuma için).
//   - offline:  Sadece AsyncStorage. Reconnect olduğunda sync kuyruğu çalışır.
//
// Sonraki POZ'lar (002..005) bu repository'leri kullanarak AppContext'i
// Supabase'e bağlar.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export const isOnlineMode = (): boolean => {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder')
  );
};

// AsyncStorage key prefix
const CACHE_PREFIX = '@SahaTakip:cache:';

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* sessiz */
  }
}

export async function cacheClear(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    /* sessiz */
  }
}

// ========== Generic Repository ==========
// Her domain repo'su bu sınıfı genişletir (quotes, customers, work_orders...)
export interface Repository<T> {
  list(): Promise<T[]>;
  insert(item: T): Promise<T>;
  update(id: string, item: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// ========== Sync Queue (POZ-DEV-011'de tamamlanacak) ==========
// Şimdilik iskelet. Offline yapılan değişiklikler burada birikir.
interface SyncOp {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  createdAt: number;
}

const SYNC_QUEUE_KEY = 'sync_queue';

export async function enqueueSync(op: Omit<SyncOp, 'createdAt'>) {
  const queue = (await cacheGet<SyncOp[]>(SYNC_QUEUE_KEY)) ?? [];
  queue.push({ ...op, createdAt: Date.now() });
  await cacheSet(SYNC_QUEUE_KEY, queue);
}

export async function getSyncQueue(): Promise<SyncOp[]> {
  return (await cacheGet<SyncOp[]>(SYNC_QUEUE_KEY)) ?? [];
}

export async function clearSyncOp(opId: string) {
  const queue = await getSyncQueue();
  await cacheSet(
    SYNC_QUEUE_KEY,
    queue.filter(o => o.id !== opId)
  );
}

// Re-export supabase for child repos
export { supabase };
