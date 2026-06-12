// assets.ts — POZ-DEV-086 Cihaz/ekipman geçmişi (asset tracking)
// Supabase + AsyncStorage cache. customerName/siteName local-only.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset, AssetType } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { auditRepo } from './data/auditRepo';

const KEY = '@SahaTakip:assets';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function fromRow(r: any, prev?: Asset): Asset {
  return {
    id: r.id,
    code: r.code ?? undefined,
    name: r.name ?? '',
    type: r.type,
    customerId: r.customer_id ?? undefined,
    customerName: prev?.customerName,
    siteId: r.site_id ?? undefined,
    siteName: prev?.siteName,
    serialNo: r.serial_no ?? undefined,
    manufacturer: r.manufacturer ?? undefined,
    model: r.model ?? undefined,
    power: r.power ?? undefined,
    installDate: r.install_date ?? undefined,
    warrantyEnd: r.warranty_end ?? undefined,
    location: r.location ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(a: Asset): Record<string, any> {
  const row: Record<string, any> = {
    code: a.code ?? null,
    name: a.name,
    type: a.type,
    customer_id: uuidOrNull(a.customerId),
    site_id: uuidOrNull(a.siteId),
    serial_no: a.serialNo ?? null,
    manufacturer: a.manufacturer ?? null,
    model: a.model ?? null,
    power: a.power ?? null,
    install_date: a.installDate ?? null,
    warranty_end: a.warrantyEnd ?? null,
    location: a.location ?? null,
    notes: a.notes ?? null,
  };
  if (UUID_RE.test(a.id)) row.id = a.id;
  return row;
}

function rid(): string {
  return 'asset_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export async function listAssets(): Promise<Asset[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const cacheRaw = await AsyncStorage.getItem(KEY);
        const cache: Asset[] = cacheRaw ? JSON.parse(cacheRaw) : [];
        const cacheById = new Map(cache.map(c => [c.id, c]));
        const list = data.map((r: any) => fromRow(r, cacheById.get(r.id)));
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Asset[]) : [];
  } catch {
    return [];
  }
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  const all = await listAssets();
  return all.find(a => a.id === id);
}

export async function createAsset(input: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> {
  let next: Asset = { ...input, id: rid(), createdAt: new Date().toISOString() };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('assets').insert(toRow(next)).select().single();
      if (!error && data) next = fromRow(data, next);
    } catch { /* keep local */ }
  }
  const all = await listAssets();
  all.unshift(next);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  void auditRepo.logCurrent({ action: 'asset.create', tableName: 'assets', refId: next.id, meta: { type: next.type, name: (next as any).name } });
  return next;
}

export async function updateAsset(id: string, patch: Partial<Asset>): Promise<Asset | undefined> {
  const all = await listAssets();
  const i = all.findIndex(a => a.id === id);
  if (i < 0) return undefined;
  let merged: Asset = { ...all[i], ...patch, id: all[i].id };
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .update(toRow(merged))
        .eq('id', id)
        .select()
        .single();
      if (!error && data) merged = fromRow(data, merged);
    } catch { /* ignore */ }
  }
  all[i] = merged;
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  void auditRepo.logCurrent({ action: 'asset.update', tableName: 'assets', refId: id });
  return all[i];
}

export async function deleteAsset(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('assets').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listAssets();
  const next = all.filter(a => a.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  void auditRepo.logCurrent({ action: 'asset.delete', tableName: 'assets', refId: id });
}

export async function listByCustomer(customerId: string): Promise<Asset[]> {
  const all = await listAssets();
  return all.filter(a => a.customerId === customerId);
}

export async function findByCode(code: string): Promise<Asset | undefined> {
  const all = await listAssets();
  return all.find(a => a.code === code);
}

export const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'meter', label: 'Sayaç', icon: 'speedometer-outline' },
  { value: 'panel', label: 'Pano', icon: 'grid-outline' },
  { value: 'transformer', label: 'Trafo', icon: 'flash-outline' },
  { value: 'ges_inverter', label: 'GES Inverter', icon: 'sunny-outline' },
  { value: 'ges_panel', label: 'GES Panel', icon: 'sunny-outline' },
  { value: 'compensation', label: 'Kompanzasyon', icon: 'pulse-outline' },
  { value: 'machine', label: 'Makine', icon: 'cog-outline' },
  { value: 'other', label: 'Diğer', icon: 'cube-outline' },
];

export const ASSET_TYPE_LABEL: Record<AssetType, string> = ASSET_TYPES.reduce(
  (acc, t) => { acc[t.value] = t.label; return acc; },
  {} as Record<AssetType, string>,
);
