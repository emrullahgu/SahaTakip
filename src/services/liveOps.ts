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
  const t = now();
  return [
    { id: 'e1', kind: 'personnel', name: 'Ahmet Y.', lat: 41.015, lng: 28.979, status: 'Görevde', lastSeen: t },
    { id: 'e2', kind: 'personnel', name: 'Mehmet K.', lat: 41.024, lng: 29.011, status: 'Müsait', lastSeen: t },
    { id: 'e3', kind: 'personnel', name: 'Selim T.', lat: 40.998, lng: 28.952, status: 'Molada', lastSeen: t },
    { id: 'e4', kind: 'vehicle', name: 'Servis-1 (34ABC123)', lat: 41.018, lng: 28.985, status: 'Aktif', lastSeen: t },
    { id: 'e5', kind: 'vehicle', name: 'Servis-2 (34XYZ456)', lat: 41.010, lng: 29.005, status: 'Garaj', lastSeen: t },
    { id: 'e6', kind: 'job', name: 'JOB-1042 Akın Otomotiv', lat: 41.020, lng: 28.990, status: 'Açık', lastSeen: t },
    { id: 'e7', kind: 'job', name: 'JOB-1043 Beta Tekstil', lat: 41.025, lng: 29.020, status: 'Devam', lastSeen: t },
    { id: 'e8', kind: 'site', name: 'Cem Mobilya Tesisi', lat: 41.005, lng: 28.965, lastSeen: t },
    { id: 'e9', kind: 'site', name: 'Demir Plastik Fabrika', lat: 41.030, lng: 29.030, lastSeen: t },
  ];
}
export async function listEntities(): Promise<LiveOpsEntity[]> {
  const cur = await get<LiveOpsEntity[] | null>(K.entities, null);
  if (cur) return cur;
  const s = await seedEntities(); await set(K.entities, s); return s;
}

// === Heatmap ===
async function seedHeat(): Promise<JobHeatPoint[]> {
  return [
    { id: 'h1', lat: 41.015, lng: 28.979, intensity: 9, region: 'Beyoğlu', jobCount: 18 },
    { id: 'h2', lat: 41.040, lng: 29.030, intensity: 7, region: 'Kadıköy', jobCount: 14 },
    { id: 'h3', lat: 40.995, lng: 28.860, intensity: 5, region: 'Bakırköy', jobCount: 10 },
    { id: 'h4', lat: 41.072, lng: 29.020, intensity: 8, region: 'Sarıyer', jobCount: 16 },
    { id: 'h5', lat: 40.985, lng: 29.050, intensity: 4, region: 'Maltepe', jobCount: 8 },
    { id: 'h6', lat: 41.050, lng: 28.900, intensity: 6, region: 'Şişli', jobCount: 12 },
  ];
}
export async function listHeat(): Promise<JobHeatPoint[]> {
  const cur = await get<JobHeatPoint[] | null>(K.heat, null);
  if (cur) return cur;
  const s = await seedHeat(); await set(K.heat, s); return s;
}

// === Personnel Availability ===
async function seedPersonnel(): Promise<PersonnelAvailabilityRecord[]> {
  const t = Date.now();
  return [
    { id: 'p1', name: 'Ahmet Yılmaz', status: 'on_job', since: new Date(t - 3600000).toISOString(), currentJobId: 'JOB-1042', currentCustomer: 'Akın Otomotiv' },
    { id: 'p2', name: 'Mehmet Kaya', status: 'available', since: new Date(t - 900000).toISOString() },
    { id: 'p3', name: 'Selim Tunç', status: 'break', since: new Date(t - 1500000).toISOString() },
    { id: 'p4', name: 'Burak Demir', status: 'on_job', since: new Date(t - 7200000).toISOString(), currentJobId: 'JOB-1043', currentCustomer: 'Beta Tekstil' },
    { id: 'p5', name: 'Cem Aksoy', status: 'offline', since: new Date(t - 14400000).toISOString() },
    { id: 'p6', name: 'Erkan Şahin', status: 'available', since: new Date(t - 600000).toISOString() },
  ];
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
  return [
    { id: uid('rt'), personnelName: 'Ahmet Yılmaz', stops: [
      { jobId: 'JOB-1042', customerName: 'Akın Otomotiv', address: 'Beyoğlu', etaMin: 25, distanceKm: 8.5 },
      { jobId: 'JOB-1045', customerName: 'Demir Plastik', address: 'Sarıyer', etaMin: 35, distanceKm: 14.2 },
      { jobId: 'JOB-1048', customerName: 'Eko Tekstil', address: 'Şişli', etaMin: 22, distanceKm: 6.8 },
    ], totalKm: 29.5, totalMin: 82, optimizedFrom: 115, savingsMin: 33, createdAt: now() },
  ];
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
  return [
    { id: uid('eta'), fromLabel: 'Merkez Ofis', toLabel: 'Akın Otomotiv', distanceKm: 8.5, baseMin: 18, trafficMin: 12, etaMin: 30, createdAt: now() },
    { id: uid('eta'), fromLabel: 'Servis-2', toLabel: 'Beta Tekstil', distanceKm: 14.2, baseMin: 25, trafficMin: 8, etaMin: 33, createdAt: new Date(Date.now() - 1800000).toISOString() },
  ];
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
  return [
    { id: uid('dv'), personnelName: 'Ahmet Yılmaz', deviationKm: 2.4, expectedRoute: 'JOB-1042 rota', lastKnown: 'Beyoğlu/Tarlabaşı', alertAt: new Date(Date.now() - 900000).toISOString(), resolved: false },
    { id: uid('dv'), personnelName: 'Mehmet Kaya', deviationKm: 0.8, expectedRoute: 'JOB-1045 rota', lastKnown: 'Şişli', alertAt: new Date(Date.now() - 3600000).toISOString(), resolved: true },
  ];
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
  const t = Date.now();
  return [
    { id: uid('se'), personnelName: 'Ahmet Yılmaz', customerName: 'Akın Otomotiv', kind: 'arrival', at: new Date(t - 5400000).toISOString(), jobId: 'JOB-1042' },
    { id: uid('se'), personnelName: 'Mehmet Kaya', customerName: 'Beta Tekstil', kind: 'arrival', at: new Date(t - 4200000).toISOString(), jobId: 'JOB-1043' },
    { id: uid('se'), personnelName: 'Mehmet Kaya', customerName: 'Beta Tekstil', kind: 'departure', at: new Date(t - 600000).toISOString(), jobId: 'JOB-1043' },
    { id: uid('se'), personnelName: 'Burak Demir', customerName: 'Cem Mobilya', kind: 'arrival', at: new Date(t - 1800000).toISOString(), jobId: 'JOB-1044' },
  ];
}
export async function listEvents(): Promise<SiteEventLog[]> {
  const cur = await get<SiteEventLog[] | null>(K.events, null);
  if (cur) return cur;
  const s = await seedEvents(); await set(K.events, s); return s;
}

// === Team Performance ===
async function seedPerf(): Promise<TeamPerformanceStat[]> {
  return [
    { id: 'tm1', teamName: 'Anadolu Yakası', jobsToday: 18, onTimeRate: 92, avgKm: 24.5, score: 88 },
    { id: 'tm2', teamName: 'Avrupa Yakası', jobsToday: 22, onTimeRate: 85, avgKm: 28.2, score: 82 },
    { id: 'tm3', teamName: 'Mobil Acil', jobsToday: 8, onTimeRate: 97, avgKm: 18.5, score: 94 },
    { id: 'tm4', teamName: 'Trafo Bakım', jobsToday: 6, onTimeRate: 78, avgKm: 42.0, score: 71 },
  ];
}
export async function listPerf(): Promise<TeamPerformanceStat[]> {
  const cur = await get<TeamPerformanceStat[] | null>(K.perf, null);
  if (cur) return cur;
  const s = await seedPerf(); await set(K.perf, s); return s;
}

// === Operation Replay ===
async function seedReplay(): Promise<OperationReplayFrame[]> {
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  const frames: OperationReplayFrame[] = [];
  for (let i = 0; i < 10; i++) {
    const ts = new Date(today.getTime() + i * 3600000);
    frames.push({
      id: `frm-${i}`,
      timestamp: ts.toISOString(),
      positions: [
        { name: 'Ahmet Y.', lat: 41.015 + i * 0.002, lng: 28.979 + i * 0.003 },
        { name: 'Mehmet K.', lat: 41.024 - i * 0.001, lng: 29.011 + i * 0.002 },
        { name: 'Burak D.', lat: 41.000 + i * 0.003, lng: 28.965 + i * 0.001 },
      ],
    });
  }
  return frames;
}
export async function listReplay(): Promise<OperationReplayFrame[]> {
  const cur = await get<OperationReplayFrame[] | null>(K.replay, null);
  if (cur) return cur;
  const s = await seedReplay(); await set(K.replay, s); return s;
}
