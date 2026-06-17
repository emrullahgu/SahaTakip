// offline.ts — POZ-DEV-371 Faz 36 offline queue + sync + connectivity + field prefs
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  OfflineOperation, OfflineOpKind, OfflineOpStatus,
  SyncLogEntry, OfflineFavorite, ConnectivitySample, FieldUiPrefs,
} from '../types';

const KEYS = {
  ops: 'offline_ops_v1',
  sync: 'offline_sync_log_v1',
  fav: 'offline_favorites_v1',
  conn: 'offline_connectivity_v1',
  prefs: 'field_ui_prefs_v1',
};

const MAX_OPS = 500;
const MAX_SYNC_LOG = 100;
const MAX_CONN = 200;

function uid(p: string): string { return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

async function loadList<T>(key: string): Promise<T[]> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; }
}
async function saveList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ── Op kind labels/colors ────────────────────────────────
export const OP_KIND_LABEL: Record<OfflineOpKind, string> = {
  work_order_update: 'İş Emri Güncelleme', work_order_complete: 'İş Emri Tamamla',
  form_submit: 'Form Gönderimi', photo_attach: 'Fotoğraf', signature_attach: 'İmza',
  stock_move: 'Stok Hareketi', note: 'Not', custom: 'Özel',
};
export const OP_KIND_ICON: Record<OfflineOpKind, string> = {
  work_order_update: 'construct-outline', work_order_complete: 'checkmark-done-outline',
  form_submit: 'document-text-outline', photo_attach: 'image-outline', signature_attach: 'create-outline',
  stock_move: 'cube-outline', note: 'reader-outline', custom: 'ellipse-outline',
};

export const OP_STATUS_LABEL: Record<OfflineOpStatus, string> = {
  pending: 'Bekliyor', syncing: 'Gönderiliyor', synced: 'Senkron', failed: 'Başarısız', conflict: 'Çakışma',
};
export const OP_STATUS_COLOR: Record<OfflineOpStatus, string> = {
  pending: '#f59e0b', syncing: '#0ea5e9', synced: '#22c55e', failed: '#ef4444', conflict: '#a855f7',
};

// ── Queue CRUD ───────────────────────────────────────────
export async function listOps(): Promise<OfflineOperation[]> { return loadList<OfflineOperation>(KEYS.ops); }
export async function getOp(id: string): Promise<OfflineOperation | undefined> {
  return (await listOps()).find(o => o.id === id);
}
export async function enqueueOp(input: Omit<OfflineOperation, 'id' | 'createdAt' | 'status' | 'attempts'>): Promise<OfflineOperation> {
  const list = await listOps();
  const fresh: OfflineOperation = { ...input, id: uid('op'), createdAt: new Date().toISOString(), status: 'pending', attempts: 0 };
  await saveList(KEYS.ops, [fresh, ...list].slice(0, MAX_OPS));
  return fresh;
}
export async function updateOp(id: string, patch: Partial<OfflineOperation>): Promise<void> {
  const list = await listOps();
  const idx = list.findIndex(o => o.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], ...patch }; await saveList(KEYS.ops, list); }
}
export async function deleteOp(id: string): Promise<void> {
  const list = await listOps();
  await saveList(KEYS.ops, list.filter(o => o.id !== id));
}
export async function clearSynced(): Promise<number> {
  const list = await listOps();
  const remaining = list.filter(o => o.status !== 'synced');
  await saveList(KEYS.ops, remaining);
  return list.length - remaining.length;
}

// ── Sync runner ──────────────────────────────────────────────────────────
// DEMO-ONLY: Bu fonksiyon GERÇEK sunucu senkronu DEĞİLDİR. Yalnız yerel demo
// kuyruğu (offline_ops_v1) üzerinde çalışır ve pending → synced olarak işaretler
// (forceFail/forceConflict mock bayrakları hariç); Supabase'e HİÇBİR çağrı yapmaz.
// Gerçek offline→online senkron için: services/data/syncDrain.ts → drainSyncQueue().
export async function runSync(): Promise<SyncLogEntry> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const list = await listOps();
  let succeeded = 0, failed = 0, conflicts = 0;
  for (const op of list) {
    if (op.status === 'synced') continue;
    op.attempts = (op.attempts || 0) + 1;
    if (op.payload?.forceConflict) { op.status = 'conflict'; op.conflictRemote = op.payload?.remote || { note: 'Sunucudaki son sürüm' }; conflicts++; continue; }
    if (op.payload?.forceFail) { op.status = 'failed'; op.lastError = 'Mock: sunucu hatası'; failed++; continue; }
    op.status = 'synced'; op.syncedAt = new Date().toISOString(); succeeded++;
  }
  await saveList(KEYS.ops, list);
  const finishedAt = new Date().toISOString();
  const status: SyncLogEntry['status'] = failed > 0 ? (succeeded > 0 ? 'partial' : 'failed') : 'success';
  const entry: SyncLogEntry = {
    id: uid('sync'), startedAt, finishedAt, durationMs: Date.now() - t0,
    ops: succeeded + failed + conflicts, succeeded, failed, conflicts, status,
  };
  const log = await listSyncLog();
  await saveList(KEYS.sync, [entry, ...log].slice(0, MAX_SYNC_LOG));
  return entry;
}

export async function resolveConflict(opId: string, choose: 'local' | 'remote'): Promise<void> {
  const list = await listOps();
  const idx = list.findIndex(o => o.id === opId);
  if (idx < 0) return;
  const op = list[idx];
  if (choose === 'remote') {
    op.payload = { ...(op.conflictRemote || {}) };
  }
  op.status = 'pending';
  op.conflictRemote = undefined;
  op.lastError = undefined;
  await saveList(KEYS.ops, list);
}

// ── Sync log ─────────────────────────────────────────────
export async function listSyncLog(): Promise<SyncLogEntry[]> { return loadList<SyncLogEntry>(KEYS.sync); }
export async function clearSyncLog(): Promise<void> { await AsyncStorage.removeItem(KEYS.sync); }

// ── Favorites ────────────────────────────────────────────
const DEFAULT_FAVORITES: OfflineFavorite[] = [
  { id: 'fav_wo', label: 'İş Emirleri', icon: 'construct-outline', color: '#0ea5e9', route: 'WorkOrders', order: 0 },
  { id: 'fav_tasks', label: 'Görevlerim', icon: 'list-outline', color: '#22c55e', route: 'Tasks', order: 1 },
  { id: 'fav_stock', label: 'Stok', icon: 'cube-outline', color: '#f59e0b', route: 'Materials', order: 2 },
  { id: 'fav_map', label: 'Harita', icon: 'map-outline', color: '#06b6d4', route: 'Map', order: 3 },
];

export async function listFavorites(): Promise<OfflineFavorite[]> {
  const stored = await loadList<OfflineFavorite>(KEYS.fav);
  if (stored.length === 0) {
    await saveList(KEYS.fav, DEFAULT_FAVORITES);
    return DEFAULT_FAVORITES;
  }
  return stored.sort((a, b) => a.order - b.order);
}
export async function saveFavorite(f: Omit<OfflineFavorite, 'id' | 'order'> & { id?: string; order?: number }): Promise<OfflineFavorite> {
  const list = await listFavorites();
  if (f.id) {
    const idx = list.findIndex(x => x.id === f.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...f, id: f.id }; await saveList(KEYS.fav, list); return list[idx]; }
  }
  const fresh: OfflineFavorite = { ...(f as any), id: uid('fav'), order: f.order ?? list.length };
  await saveList(KEYS.fav, [...list, fresh]);
  return fresh;
}
export async function deleteFavorite(id: string): Promise<void> {
  const list = await listFavorites();
  await saveList(KEYS.fav, list.filter(f => f.id !== id));
}
export async function resetFavorites(): Promise<void> {
  await saveList(KEYS.fav, DEFAULT_FAVORITES);
}

// ── Connectivity ─────────────────────────────────────────
export async function listConnectivity(): Promise<ConnectivitySample[]> { return loadList<ConnectivitySample>(KEYS.conn); }
export async function recordConnectivity(sample: Omit<ConnectivitySample, 'at'>): Promise<void> {
  const list = await listConnectivity();
  const fresh: ConnectivitySample = { ...sample, at: new Date().toISOString() };
  await saveList(KEYS.conn, [fresh, ...list].slice(0, MAX_CONN));
}

// ── Field UI prefs ───────────────────────────────────────
const DEFAULT_PREFS: FieldUiPrefs = {
  mode: 'auto', oneHanded: false, bigButtons: true,
  lowBandwidth: false, showGpsAccuracy: true, batterySaver: false,
  updatedAt: new Date().toISOString(),
};

export async function getFieldPrefs(): Promise<FieldUiPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.prefs);
    return raw ? JSON.parse(raw) : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}
export async function saveFieldPrefs(prefs: Partial<FieldUiPrefs>): Promise<FieldUiPrefs> {
  const current = await getFieldPrefs();
  const next: FieldUiPrefs = { ...current, ...prefs, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEYS.prefs, JSON.stringify(next));
  return next;
}
