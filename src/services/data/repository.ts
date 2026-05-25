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

// ---- Runtime network durumu (web'de güvenilir; native'de varsayılan true) ----
let _runtimeOnline = true;
let _netSubscribed = false;
let _netIntervalId: ReturnType<typeof setInterval> | null = null;

function ensureNetSubscribed() {
  if (_netSubscribed) return;
  _netSubscribed = true;
  try {
    // Web tarayici
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'onLine' in navigator) {
      _runtimeOnline = !!(navigator as any).onLine;
      window.addEventListener('online', () => { _runtimeOnline = true; });
      window.addEventListener('offline', () => { _runtimeOnline = false; });
      return;
    }
    // Native: expo-network ile periyodik kontrol
    // require ile dynamic import — web bundle'da çağrılmaz
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Network = require('expo-network');
    if (Network && typeof Network.getNetworkStateAsync === 'function') {
      const refresh = async () => {
        try {
          const st = await Network.getNetworkStateAsync();
          _runtimeOnline = !!(st?.isConnected && st?.isInternetReachable !== false);
        } catch { /* ignore */ }
      };
      void refresh();
      _netIntervalId = setInterval(refresh, 15000);
    }
  } catch { /* sessiz — paket yoksa varsayılan true kalır */ }
}

/** Network polling'i kapat (test/teardown için). */
export function cleanupNetworkChecking(): void {
  if (_netIntervalId) { clearInterval(_netIntervalId); _netIntervalId = null; }
  _netSubscribed = false;
}
ensureNetSubscribed();

/** Native taraf NetInfo/expo-network yoksa elle set edilebilsin. */
export function setRuntimeOnline(online: boolean): void {
  _runtimeOnline = !!online;
}
export function getRuntimeOnline(): boolean {
  return _runtimeOnline;
}

export const isOnlineMode = (): boolean => {
  const configured = Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder')
  );
  return configured && _runtimeOnline;
};

/** Bir id Supabase UUID formatında mı? Yerel oluşturulan "Q-..."/"WO-..." id'leri DB'ye yazılmaz. */
export const isUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Cross-platform UUID v4 üretici (crypto.randomUUID fallback'lı). */
export function newUuid(): string {
  try {
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  } catch { /* ignore */ }
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
