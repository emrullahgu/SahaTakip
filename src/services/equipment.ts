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

const SEED_ASSETS: EqAsset[] = [
  { id: 'ea1', code: 'TR-001', type: 'transformer', name: 'Ana Trafo 1', customerName: 'Ankara OSB Tekstil', location: 'Ankara OSB / Trafo Odası', brand: 'ABB', model: 'IZ-630', serialNo: 'TR2023001', capacity: '630 kVA', installedAt: daysAgo(720), warrantyUntil: daysFromNow(180), serviceUntil: daysFromNow(60), status: 'active', qrPayload: 'sahatakip://eq/ea1' },
  { id: 'ea2', code: 'PN-014', type: 'panel', name: 'Üretim Pano A', customerName: 'İzmir Lojistik Deposu', location: 'İzmir Aliağa / Üretim', brand: 'Schneider', model: 'Prisma P', serialNo: 'PN2024014', capacity: '400 A', installedAt: daysAgo(420), warrantyUntil: daysFromNow(45), status: 'active', qrPayload: 'sahatakip://eq/ea2' },
  { id: 'ea3', code: 'IN-021', type: 'inverter', name: 'GES İnverter 1', customerName: 'Konya GES Sahası', location: 'Konya / Saha 1', brand: 'Huawei', model: 'SUN2000-100KTL', serialNo: 'IN20240021', capacity: '100 kW', installedAt: daysAgo(180), warrantyUntil: daysFromNow(550), serviceUntil: daysFromNow(10), status: 'maintenance', qrPayload: 'sahatakip://eq/ea3' },
  { id: 'ea4', code: 'GN-007', type: 'generator', name: 'Yedek Jeneratör', customerName: 'Bursa Otomotiv', location: 'Bursa / Yedek Enerji Odası', brand: 'Caterpillar', model: 'C18', serialNo: 'GN20210007', capacity: '500 kVA', installedAt: daysAgo(1200), warrantyUntil: daysAgo(60), status: 'broken', qrPayload: 'sahatakip://eq/ea4' },
  { id: 'ea5', code: 'MT-103', type: 'meter', name: 'Ana Sayaç', customerName: 'Eskişehir Cam Sanayi', location: 'Eskişehir / Giriş', brand: 'Iskra', model: 'MT880', serialNo: 'MT2022103', installedAt: daysAgo(620), warrantyUntil: daysFromNow(380), status: 'active', qrPayload: 'sahatakip://eq/ea5' },
  { id: 'ea6', code: 'KP-009', type: 'compensation', name: 'Reaktif Kompanzasyon', customerName: 'Adana Mermer Fabrikası', location: 'Adana / Üretim', brand: 'Entes', model: 'RGN-12', serialNo: 'KP20230009', capacity: '12 step', installedAt: daysAgo(540), warrantyUntil: daysFromNow(220), status: 'active', qrPayload: 'sahatakip://eq/ea6' },
];

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

const SEED_MAINT: EqMaintenanceRecord[] = [
  { id: 'em1', assetId: 'ea1', kind: 'periodic', performedAt: daysAgo(60), performedBy: 'Ali Yılmaz', description: 'Yıllık trafo bakımı, yağ analizi', cost: 4500, parts: ['Yağ', 'Conta'], nextDueAt: daysFromNow(305) },
  { id: 'em2', assetId: 'ea2', kind: 'inspection', performedAt: daysAgo(30), performedBy: 'Ayşe Kaya', description: 'Termal kamera ölçümü', cost: 800 },
  { id: 'em3', assetId: 'ea3', kind: 'breakdown', performedAt: daysAgo(15), performedBy: 'Hakan Çelik', description: 'String arızası, kart değişimi', cost: 2200, parts: ['MPPT kartı'] },
  { id: 'em4', assetId: 'ea4', kind: 'periodic', performedAt: daysAgo(120), performedBy: 'Mehmet Demir', description: 'Yağ ve filtre değişimi', cost: 3100, parts: ['Motor yağı', 'Yağ filtresi', 'Hava filtresi'] },
  { id: 'em5', assetId: 'ea1', kind: 'inspection', performedAt: daysAgo(5), performedBy: 'Ali Yılmaz', description: 'Sıcaklık kontrolü', cost: 350 },
];

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

const SEED_FAULT: EqFaultRecord[] = [
  { id: 'ef1', assetId: 'ea4', occurredAt: daysAgo(40), severity: 'critical', description: 'Yakıt pompası arızası', downtimeHours: 18, resolvedAt: daysAgo(38), resolution: 'Pompa değişimi', cost: 8500 },
  { id: 'ef2', assetId: 'ea3', occurredAt: daysAgo(15), severity: 'medium', description: 'Bir string üretmiyor', downtimeHours: 6, resolvedAt: daysAgo(15), resolution: 'MPPT kartı değişimi', cost: 2200 },
  { id: 'ef3', assetId: 'ea2', occurredAt: daysAgo(80), severity: 'low', description: 'Termik atması', downtimeHours: 1, resolvedAt: daysAgo(80), resolution: 'Termik ayarlandı', cost: 0 },
  { id: 'ef4', assetId: 'ea4', occurredAt: daysAgo(5), severity: 'high', description: 'Soğutma suyu kaçağı', downtimeHours: 12, cost: 4200 },
];

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

const SEED_PLANS: EqMaintenancePlan[] = [
  { id: 'ep1', assetId: 'ea1', taskDescription: 'Yıllık trafo bakımı', intervalDays: 365, nextDueAt: daysFromNow(305), lastPerformedAt: daysAgo(60), owner: 'Ali Yılmaz' },
  { id: 'ep2', assetId: 'ea2', taskDescription: 'Termal kamera taraması', intervalDays: 180, nextDueAt: daysFromNow(15), lastPerformedAt: daysAgo(165), owner: 'Ayşe Kaya' },
  { id: 'ep3', assetId: 'ea3', taskDescription: 'GES inverter modül kontrolü', intervalDays: 90, nextDueAt: daysFromNow(-3), lastPerformedAt: daysAgo(93), owner: 'Hakan Çelik' },
  { id: 'ep4', assetId: 'ea4', taskDescription: 'Jeneratör yakıt sistemi', intervalDays: 120, nextDueAt: daysFromNow(7), lastPerformedAt: daysAgo(113), owner: 'Mehmet Demir' },
  { id: 'ep5', assetId: 'ea6', taskDescription: 'Kompanzasyon step kontrolü', intervalDays: 60, nextDueAt: daysFromNow(45), lastPerformedAt: daysAgo(15), owner: 'Selin Acar' },
];

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
