// Faz 44 — Live Ops Servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LiveOpsEntity, JobHeatPoint, PersonnelAvailabilityRecord, SmartRouteSuggestion,
  EtaEstimateRecord, RouteDeviationAlert, SiteEventLog, TeamPerformanceStat,
  OperationReplayFrame, PersonnelLiveStatus, LiveOpsEntityKind,
} from '../types';

const K = {
  entities: 'lo_entities_v1',
  heat: 'lo_heat_v1',
  personnel: 'lo_personnel_v1',
  routes: 'lo_routes_v1',
  eta: 'lo_eta_v1',
  devs: 'lo_devs_v1',
  events: 'lo_events_v1',
  perf: 'lo_perf_v1',
  replay: 'lo_replay_v1',
};

export const ENTITY_COLOR: Record<LiveOpsEntityKind, string> = { personnel: '#0ea5e9', vehicle: '#f59e0b', job: '#ef4444', site: '#8b5cf6' };
export const ENTITY_ICON: Record<LiveOpsEntityKind, string> = { personnel: 'person', vehicle: 'car', job: 'briefcase', site: 'business' };
export const ENTITY_LABEL: Record<LiveOpsEntityKind, string> = { personnel: 'Personel', vehicle: 'Araç', job: 'İş Emri', site: 'Saha' };
export const STATUS_COLOR: Record<PersonnelLiveStatus, string> = { available: '#22c55e', on_job: '#0ea5e9', break: '#f59e0b', offline: '#64748b' };
export const STATUS_LABEL: Record<PersonnelLiveStatus, string> = { available: 'Müsait', on_job: 'Görevde', break: 'Molada', offline: 'Çevrimdışı' };

const get = async <T,>(k: string, fb: T): Promise<T> => { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const set = async (k: string, v: unknown) => { try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
const now = () => new Date().toISOString();

// === Entities (live map) ===
async function seedEntities(): Promise<LiveOpsEntity[]> {
  return [];
}
export async function listEntities(): Promise<LiveOpsEntity[]> {
  const cur = await get<LiveOpsEntity[] | null>(K.entities, null);
  if (cur) return cur;
  const s = await seedEntities(); await set(K.entities, s); return s;
}

// === Heatmap ===
async function seedHeat(): Promise<JobHeatPoint[]> {
  return [];
}
export async function listHeat(): Promise<JobHeatPoint[]> {
  const cur = await get<JobHeatPoint[] | null>(K.heat, null);
  if (cur) return cur;
  const s = await seedHeat(); await set(K.heat, s); return s;
}

// === Personnel Availability ===
async function seedPersonnel(): Promise<PersonnelAvailabilityRecord[]> {
  return [];
}
export async function listPersonnel(): Promise<PersonnelAvailabilityRecord[]> {
  const cur = await get<PersonnelAvailabilityRecord[] | null>(K.personnel, null);
  if (cur) return cur;
  const s = await seedPersonnel(); await set(K.personnel, s); return s;
}
export async function setPersonnelStatus(id: string, status: PersonnelLiveStatus): Promise<void> {
  const list = await listPersonnel();
  await set(K.personnel, list.map(p => p.id === id ? { ...p, status, since: now() } : p));
}

// === Smart Route ===
async function seedRoutes(): Promise<SmartRouteSuggestion[]> {
  return [];
}
export async function listRoutes(): Promise<SmartRouteSuggestion[]> {
  const cur = await get<SmartRouteSuggestion[] | null>(K.routes, null);
  if (cur) return cur;
  const s = await seedRoutes(); await set(K.routes, s); return s;
}
export async function generateRoute(personnelName: string, stopCount: number = 3): Promise<SmartRouteSuggestion> {
  const list = await listRoutes();
  const customers = ['Akın Otomotiv', 'Beta Tekstil', 'Cem Mobilya', 'Demir Plastik', 'Eko Tekstil', 'Fenix Sanayi'];
  const regions = ['Beyoğlu', 'Kadıköy', 'Sarıyer', 'Şişli', 'Maltepe', 'Bakırköy'];
  const stops = Array.from({ length: stopCount }, (_, i) => {
    const dist = 5 + Math.random() * 15;
    return { jobId: `JOB-${1100 + i + Math.floor(Math.random() * 50)}`, customerName: customers[Math.floor(Math.random() * customers.length)], address: regions[Math.floor(Math.random() * regions.length)], etaMin: Math.round(15 + dist * 2.5), distanceKm: Math.round(dist * 10) / 10 };
  });
  const totalKm = Math.round(stops.reduce((s, x) => s + x.distanceKm, 0) * 10) / 10;
  const totalMin = stops.reduce((s, x) => s + x.etaMin, 0);
  const baseline = Math.round(totalMin * 1.4);
  const item: SmartRouteSuggestion = { id: uid('rt'), personnelName, stops, totalKm, totalMin, optimizedFrom: baseline, savingsMin: baseline - totalMin, createdAt: now() };
  await set(K.routes, [item, ...list].slice(0, 50));
  return item;
}

// === ETA ===
async function seedEta(): Promise<EtaEstimateRecord[]> {
  return [];
}
export async function listEta(): Promise<EtaEstimateRecord[]> {
  const cur = await get<EtaEstimateRecord[] | null>(K.eta, null);
  if (cur) return cur;
  const s = await seedEta(); await set(K.eta, s); return s;
}
export async function calculateEta(fromLabel: string, toLabel: string, distanceKm: number): Promise<EtaEstimateRecord> {
  const list = await listEta();
  const baseMin = Math.round(distanceKm * 2.2);
  const hour = new Date().getHours();
  const isRush = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  const trafficMin = Math.round(baseMin * (isRush ? 0.6 : 0.25));
  const item: EtaEstimateRecord = { id: uid('eta'), fromLabel, toLabel, distanceKm, baseMin, trafficMin, etaMin: baseMin + trafficMin, createdAt: now() };
  await set(K.eta, [item, ...list].slice(0, 50));
  return item;
}

// === Route Deviations ===
async function seedDevs(): Promise<RouteDeviationAlert[]> {
  return [];
}
export async function listDeviations(): Promise<RouteDeviationAlert[]> {
  const cur = await get<RouteDeviationAlert[] | null>(K.devs, null);
  if (cur) return cur;
  const s = await seedDevs(); await set(K.devs, s); return s;
}
export async function resolveDeviation(id: string): Promise<void> {
  const list = await listDeviations();
  await set(K.devs, list.map(d => d.id === id ? { ...d, resolved: true } : d));
}

// === Site Events ===
async function seedEvents(): Promise<SiteEventLog[]> {
  return [];
}
export async function listEvents(): Promise<SiteEventLog[]> {
  const cur = await get<SiteEventLog[] | null>(K.events, null);
  if (cur) return cur;
  const s = await seedEvents(); await set(K.events, s); return s;
}

// === Team Performance ===
async function seedPerf(): Promise<TeamPerformanceStat[]> {
  return [];
}
export async function listPerf(): Promise<TeamPerformanceStat[]> {
  const cur = await get<TeamPerformanceStat[] | null>(K.perf, null);
  if (cur) return cur;
  const s = await seedPerf(); await set(K.perf, s); return s;
}

// === Operation Replay ===
async function seedReplay(): Promise<OperationReplayFrame[]> {
  return [];
}
export async function listReplay(): Promise<OperationReplayFrame[]> {
  const cur = await get<OperationReplayFrame[] | null>(K.replay, null);
  if (cur) return cur;
  const s = await seedReplay(); await set(K.replay, s); return s;
}
