// Faz 46 — Equipment & Maintenance service
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  EqAsset, EqAssetType, EqAssetStatus, EqMaintenanceRecord, EqMaintenanceKind,
  EqFaultRecord, EqFaultSeverity, EqMaintenancePlan, EqCostStat, EqServiceCardEvent,
} from '../types';

const K = {
  assets: 'eq_assets_v1',
  maint: 'eq_maint_v1',
  fault: 'eq_fault_v1',
  plans: 'eq_plans_v1',
};

export const EQ_TYPE_LABEL: Record<EqAssetType, string> = {
  transformer: 'Trafo', panel: 'Pano', meter: 'Sayaç', inverter: 'İnverter',
  ups: 'UPS', generator: 'Jeneratör', compensation: 'Kompanzasyon', cable: 'Kablo', other: 'Diğer',
};
export const EQ_TYPE_ICON: Record<EqAssetType, string> = {
  transformer: 'flash', panel: 'grid', meter: 'speedometer', inverter: 'sync',
  ups: 'battery-charging', generator: 'cog', compensation: 'analytics', cable: 'git-network', other: 'cube',
};
export const EQ_TYPE_COLOR: Record<EqAssetType, string> = {
  transformer: '#f59e0b', panel: '#0ea5e9', meter: '#22c55e', inverter: '#8b5cf6',
  ups: '#06b6d4', generator: '#ef4444', compensation: '#a855f7', cable: '#64748b', other: '#94a3b8',
};
export const EQ_STATUS_LABEL: Record<EqAssetStatus, string> = {
  active: 'Aktif', maintenance: 'Bakımda', broken: 'Arızalı', retired: 'Emekli',
};
export const EQ_STATUS_COLOR: Record<EqAssetStatus, string> = {
  active: '#22c55e', maintenance: '#f59e0b', broken: '#ef4444', retired: '#64748b',
};
export const EQ_MAINT_LABEL: Record<EqMaintenanceKind, string> = {
  periodic: 'Periyodik', breakdown: 'Arıza', inspection: 'Muayene',
};
export const EQ_MAINT_COLOR: Record<EqMaintenanceKind, string> = {
  periodic: '#0ea5e9', breakdown: '#ef4444', inspection: '#a855f7',
};
export const EQ_FAULT_COLOR: Record<EqFaultSeverity, string> = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
};

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const SEED_ASSETS: EqAsset[] = [];

export const listEqAssets = async (): Promise<EqAsset[]> => {
  const raw = await AsyncStorage.getItem(K.assets);
  if (!raw) { await AsyncStorage.setItem(K.assets, JSON.stringify(SEED_ASSETS)); return SEED_ASSETS; }
  try { return JSON.parse(raw); } catch { return SEED_ASSETS; }
};
export const saveEqAssets = async (l: EqAsset[]) => AsyncStorage.setItem(K.assets, JSON.stringify(l));
export const createEqAsset = async (a: Omit<EqAsset, 'id' | 'qrPayload' | 'code'> & { code?: string }) => {
  const list = await listEqAssets();
  const id = 'ea' + Date.now();
  const code = a.code || `${a.type.slice(0, 2).toUpperCase()}-${String(list.length + 1).padStart(3, '0')}`;
  const fresh: EqAsset = { ...a, id, code, qrPayload: `sahatakip://eq/${id}` };
  const next = [fresh, ...list];
  await saveEqAssets(next);
  return fresh;
};
export const updateEqAssetStatus = async (id: string, status: EqAssetStatus) => {
  const list = await listEqAssets();
  const next = list.map(x => x.id === id ? { ...x, status } : x);
  await saveEqAssets(next);
  return next;
};
export const deleteEqAsset = async (id: string) => {
  const list = await listEqAssets();
  const next = list.filter(x => x.id !== id);
  await saveEqAssets(next);
  return next;
};

const SEED_MAINT: EqMaintenanceRecord[] = [];

export const listEqMaintenance = async (): Promise<EqMaintenanceRecord[]> => {
  const raw = await AsyncStorage.getItem(K.maint);
  if (!raw) { await AsyncStorage.setItem(K.maint, JSON.stringify(SEED_MAINT)); return SEED_MAINT; }
  try { return JSON.parse(raw); } catch { return SEED_MAINT; }
};
export const createEqMaintenance = async (m: Omit<EqMaintenanceRecord, 'id'>) => {
  const list = await listEqMaintenance();
  const fresh: EqMaintenanceRecord = { ...m, id: 'em' + Date.now() };
  const next = [fresh, ...list];
  await AsyncStorage.setItem(K.maint, JSON.stringify(next));
  return fresh;
};
export const deleteEqMaintenance = async (id: string) => {
  const list = await listEqMaintenance();
  const next = list.filter(x => x.id !== id);
  await AsyncStorage.setItem(K.maint, JSON.stringify(next));
  return next;
};

const SEED_FAULT: EqFaultRecord[] = [];

export const listEqFaults = async (): Promise<EqFaultRecord[]> => {
  const raw = await AsyncStorage.getItem(K.fault);
  if (!raw) { await AsyncStorage.setItem(K.fault, JSON.stringify(SEED_FAULT)); return SEED_FAULT; }
  try { return JSON.parse(raw); } catch { return SEED_FAULT; }
};
export const createEqFault = async (f: Omit<EqFaultRecord, 'id'>) => {
  const list = await listEqFaults();
  const fresh: EqFaultRecord = { ...f, id: 'ef' + Date.now() };
  const next = [fresh, ...list];
  await AsyncStorage.setItem(K.fault, JSON.stringify(next));
  return fresh;
};
export const deleteEqFault = async (id: string) => {
  const list = await listEqFaults();
  const next = list.filter(x => x.id !== id);
  await AsyncStorage.setItem(K.fault, JSON.stringify(next));
  return next;
};

const SEED_PLANS: EqMaintenancePlan[] = [];

export const listEqPlans = async (): Promise<EqMaintenancePlan[]> => {
  const raw = await AsyncStorage.getItem(K.plans);
  if (!raw) { await AsyncStorage.setItem(K.plans, JSON.stringify(SEED_PLANS)); return SEED_PLANS; }
  try { return JSON.parse(raw); } catch { return SEED_PLANS; }
};
export const createEqPlan = async (p: Omit<EqMaintenancePlan, 'id'>) => {
  const list = await listEqPlans();
  const fresh: EqMaintenancePlan = { ...p, id: 'ep' + Date.now() };
  const next = [fresh, ...list];
  await AsyncStorage.setItem(K.plans, JSON.stringify(next));
  return fresh;
};
export const deleteEqPlan = async (id: string) => {
  const list = await listEqPlans();
  const next = list.filter(x => x.id !== id);
  await AsyncStorage.setItem(K.plans, JSON.stringify(next));
  return next;
};

export const upcomingEqPlans = async (withinDays = 30): Promise<EqMaintenancePlan[]> => {
  const all = await listEqPlans();
  const cutoff = Date.now() + withinDays * 86400000;
  return all.filter(p => new Date(p.nextDueAt).getTime() <= cutoff)
    .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
};

export const computeEqCostStats = async (): Promise<EqCostStat[]> => {
  const [assets, maint, faults] = await Promise.all([listEqAssets(), listEqMaintenance(), listEqFaults()]);
  return assets.map(a => {
    const ms = maint.filter(m => m.assetId === a.id);
    const fs = faults.filter(f => f.assetId === a.id);
    return {
      assetId: a.id,
      assetName: `${a.code} · ${a.name}`,
      assetType: a.type,
      totalMaintenanceCost: ms.reduce((s, x) => s + x.cost, 0),
      totalFaultCost: fs.reduce((s, x) => s + x.cost, 0),
      totalDowntimeHours: fs.reduce((s, x) => s + x.downtimeHours, 0),
      maintenanceCount: ms.length,
      faultCount: fs.length,
    };
  }).sort((a, b) => (b.totalMaintenanceCost + b.totalFaultCost) - (a.totalMaintenanceCost + a.totalFaultCost));
};

export const buildEqServiceCard = async (assetId: string): Promise<EqServiceCardEvent[]> => {
  const [assets, maint, faults] = await Promise.all([listEqAssets(), listEqMaintenance(), listEqFaults()]);
  const a = assets.find(x => x.id === assetId);
  const events: EqServiceCardEvent[] = [];
  if (a) {
    events.push({ id: 'install_' + a.id, assetId, kind: 'install', label: `Kurulum: ${a.brand} ${a.model}`, at: a.installedAt, by: 'Saha Ekibi' });
    if (a.warrantyUntil) {
      const expired = new Date(a.warrantyUntil).getTime() < Date.now();
      events.push({ id: 'warr_' + a.id, assetId, kind: 'warranty', label: expired ? `Garanti süresi doldu` : `Garanti bitiş: ${new Date(a.warrantyUntil).toLocaleDateString('tr-TR')}`, at: a.warrantyUntil });
    }
  }
  maint.filter(m => m.assetId === assetId).forEach(m => {
    events.push({ id: m.id, assetId, kind: m.kind === 'inspection' ? 'inspection' : 'maintenance', label: `${EQ_MAINT_LABEL[m.kind]}: ${m.description}`, at: m.performedAt, by: m.performedBy, cost: m.cost });
  });
  faults.filter(f => f.assetId === assetId).forEach(f => {
    events.push({ id: f.id, assetId, kind: 'fault', label: `Arıza (${f.severity}): ${f.description}`, at: f.occurredAt, cost: f.cost });
  });
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
};
