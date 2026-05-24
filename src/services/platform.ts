// platform.ts — Faz 40 servis (Çoklu Firma / Modül / Lisans / Bakım)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Tenant, TenantMember, TenantSetting, AppModule, PackageDefinition,
  LicenseRecord, UsageMetric, DbIndexHint, ArchivePolicy, ArchiveJob,
  PlatformBackup, RestoreTest, SystemHealthCheck, MaintenanceWindow,
  PackagePlan, TenantStatus, SystemHealthStatus,
} from '../types';

const K = {
  tenants: 'pf_tenants_v1', members: 'pf_members_v1', settings: 'pf_settings_v1',
  modules: 'pf_modules_v1', packages: 'pf_packages_v1', licenses: 'pf_licenses_v1',
  usage: 'pf_usage_v1', idx: 'pf_idx_v1', arcPol: 'pf_arcpol_v1', arcJobs: 'pf_arcjobs_v1',
  backups: 'pf_backups_v1', restore: 'pf_restore_v1', health: 'pf_health_v1', maint: 'pf_maint_v1',
  current: 'pf_current_tenant_v1',
};

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
async function load<T>(k: string): Promise<T[]> { const r = await AsyncStorage.getItem(k); return r ? JSON.parse(r) : []; }
async function save<T>(k: string, v: T[]) { await AsyncStorage.setItem(k, JSON.stringify(v)); }

export const PLAN_LABEL: Record<PackagePlan, string> = { starter: 'Başlangıç', pro: 'Pro', enterprise: 'Kurumsal' };
export const PLAN_COLOR: Record<PackagePlan, string> = { starter: '#64748b', pro: '#0ea5e9', enterprise: '#a855f7' };
export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = { active: 'Aktif', trial: 'Deneme', suspended: 'Askıda', expired: 'Süresi Doldu' };
export const TENANT_STATUS_COLOR: Record<TenantStatus, string> = { active: '#22c55e', trial: '#0ea5e9', suspended: '#f59e0b', expired: '#ef4444' };
export const HEALTH_COLOR: Record<SystemHealthStatus, string> = { ok: '#22c55e', warn: '#f59e0b', down: '#ef4444' };
export const HEALTH_LABEL: Record<SystemHealthStatus, string> = { ok: 'Sağlıklı', warn: 'Uyarı', down: 'Çökmüş' };
export const COMPONENT_LABEL: Record<SystemHealthCheck['component'], string> = {
  database: 'Veritabanı', storage: 'Depolama', auth: 'Kimlik', jobs: 'Görevler', notifications: 'Bildirim', integrations: 'Entegrasyon',
};

// Tenants
async function seedTenants(): Promise<Tenant[]> {
  const list = await load<Tenant>(K.tenants);
  if (list.length) return list;
  const seed: Tenant[] = [
    { id: 't1', name: 'Demo Firma A.Ş.', plan: 'pro', status: 'active', createdAt: now(), memberCount: 8, storageMb: 240, isCurrent: true },
    { id: 't2', name: 'Test Mühendislik Ltd.', plan: 'starter', status: 'trial', createdAt: now(), memberCount: 3, storageMb: 80, expiresAt: new Date(Date.now() + 14 * 86400000).toISOString() },
  ];
  await save(K.tenants, seed);
  await AsyncStorage.setItem(K.current, 't1');
  return seed;
}
export async function listTenants() { return seedTenants(); }
export async function getCurrentTenantId() { return (await AsyncStorage.getItem(K.current)) || 't1'; }
export async function setCurrentTenant(id: string) {
  await AsyncStorage.setItem(K.current, id);
  const list = await load<Tenant>(K.tenants);
  await save(K.tenants, list.map(t => ({ ...t, isCurrent: t.id === id })));
}
export async function saveTenant(t: Partial<Tenant>) {
  const list = await load<Tenant>(K.tenants);
  if (t.id) {
    const idx = list.findIndex(x => x.id === t.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...t }; await save(K.tenants, list); return list[idx]; }
  }
  const created: Tenant = { id: uid(), name: t.name || 'Yeni Firma', plan: t.plan || 'starter', status: t.status || 'trial', createdAt: now(), memberCount: 1, storageMb: 0, expiresAt: t.expiresAt };
  list.push(created); await save(K.tenants, list); return created;
}
export async function deleteTenant(id: string) {
  const list = await load<Tenant>(K.tenants);
  await save(K.tenants, list.filter(t => t.id !== id));
}

// Members
async function seedMembers(): Promise<TenantMember[]> {
  const list = await load<TenantMember>(K.members);
  if (list.length) return list;
  const seed: TenantMember[] = [
    { id: uid(), tenantId: 't1', email: 'owner@demo.com', role: 'owner', joinedAt: now() },
    { id: uid(), tenantId: 't1', email: 'admin@demo.com', role: 'admin', joinedAt: now() },
    { id: uid(), tenantId: 't1', email: 'manager@demo.com', role: 'manager', joinedAt: now() },
    { id: uid(), tenantId: 't2', email: 'demo@test.com', role: 'owner', joinedAt: now() },
  ];
  await save(K.members, seed); return seed;
}
export async function listMembers(tenantId?: string) {
  const all = await seedMembers();
  return tenantId ? all.filter(m => m.tenantId === tenantId) : all;
}
export async function addMember(tenantId: string, email: string, role: TenantMember['role']) {
  const list = await seedMembers();
  list.push({ id: uid(), tenantId, email, role, joinedAt: now() });
  await save(K.members, list);
}
export async function removeMember(id: string) {
  const list = await load<TenantMember>(K.members);
  await save(K.members, list.filter(m => m.id !== id));
}

// Settings
const DEFAULT_SETTING_KEYS = ['currency', 'timezone', 'language', 'invoice_prefix', 'allow_offline_login'];
async function seedSettings(tenantId: string): Promise<TenantSetting[]> {
  const all = await load<TenantSetting>(K.settings);
  if (all.some(s => s.tenantId === tenantId)) return all.filter(s => s.tenantId === tenantId);
  const defaults: TenantSetting[] = DEFAULT_SETTING_KEYS.map(key => ({
    id: uid(), tenantId, key, updatedAt: now(),
    value: key === 'currency' ? 'TRY' : key === 'timezone' ? 'Europe/Istanbul' : key === 'language' ? 'tr' : key === 'invoice_prefix' ? 'INV-' : 'false',
  }));
  await save(K.settings, [...all, ...defaults]);
  return defaults;
}
export async function listSettings(tenantId: string) { return seedSettings(tenantId); }
export async function updateSetting(id: string, value: string) {
  const list = await load<TenantSetting>(K.settings);
  const idx = list.findIndex(s => s.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], value, updatedAt: now() }; await save(K.settings, list); }
}

// Modules
async function seedModules(): Promise<AppModule[]> {
  const list = await load<AppModule>(K.modules);
  if (list.length) return list;
  const seed: AppModule[] = [
    { id: uid(), code: 'workorders', name: 'İş Emirleri', category: 'core', enabled: true, requiredPlan: 'starter' },
    { id: uid(), code: 'quotes', name: 'Teklifler', category: 'core', enabled: true, requiredPlan: 'starter' },
    { id: uid(), code: 'finance', name: 'Finans / Gider', category: 'finance', enabled: true, requiredPlan: 'starter' },
    { id: uid(), code: 'invoicing', name: 'Faturalama', category: 'finance', enabled: true, requiredPlan: 'pro' },
    { id: uid(), code: 'route_optimization', name: 'Rota Optimizasyonu', category: 'field', enabled: true, requiredPlan: 'pro' },
    { id: uid(), code: 'bi', name: 'BI & Raporlar', category: 'analytics', enabled: true, requiredPlan: 'pro' },
    { id: uid(), code: 'erp', name: 'ERP Entegrasyonu', category: 'integration', enabled: false, requiredPlan: 'enterprise' },
    { id: uid(), code: 'crm', name: 'CRM Entegrasyonu', category: 'integration', enabled: false, requiredPlan: 'enterprise' },
    { id: uid(), code: 'webhooks', name: 'Webhook', category: 'integration', enabled: true, requiredPlan: 'pro' },
    { id: uid(), code: 'multi_tenant', name: 'Çoklu Firma', category: 'core', enabled: true, requiredPlan: 'enterprise' },
  ];
  await save(K.modules, seed); return seed;
}
export async function listModules() { return seedModules(); }
export async function toggleModule(id: string) {
  const list = await load<AppModule>(K.modules);
  const idx = list.findIndex(m => m.id === id);
  if (idx >= 0) { list[idx].enabled = !list[idx].enabled; await save(K.modules, list); }
}

// Packages
export const PACKAGE_DEFINITIONS: PackageDefinition[] = [
  { id: 'starter', name: 'Başlangıç', monthlyPrice: 199, maxUsers: 5, maxStorageMb: 500, modules: ['workorders', 'quotes', 'finance'] },
  { id: 'pro', name: 'Pro', monthlyPrice: 599, maxUsers: 20, maxStorageMb: 5000, modules: ['workorders', 'quotes', 'finance', 'invoicing', 'route_optimization', 'bi', 'webhooks'] },
  { id: 'enterprise', name: 'Kurumsal', monthlyPrice: 1499, maxUsers: 9999, maxStorageMb: 100000, modules: ['workorders', 'quotes', 'finance', 'invoicing', 'route_optimization', 'bi', 'webhooks', 'erp', 'crm', 'multi_tenant'] },
];
export async function getCurrentPackage(): Promise<PackagePlan> {
  const t = (await listTenants()).find(x => x.isCurrent);
  return t?.plan || 'starter';
}

// Licenses
async function seedLicenses(): Promise<LicenseRecord[]> {
  const list = await load<LicenseRecord>(K.licenses);
  if (list.length) return list;
  const seed: LicenseRecord[] = [
    { id: uid(), tenantId: 't1', plan: 'pro', seats: 20, startsAt: now(), endsAt: new Date(Date.now() + 365 * 86400000).toISOString(), active: true },
    { id: uid(), tenantId: 't2', plan: 'starter', seats: 5, startsAt: now(), endsAt: new Date(Date.now() + 14 * 86400000).toISOString(), active: true },
  ];
  await save(K.licenses, seed); return seed;
}
export async function listLicenses() { return seedLicenses(); }

// Usage limits
async function seedUsage(): Promise<UsageMetric[]> {
  const list = await load<UsageMetric>(K.usage);
  if (list.length) return list;
  const seed: UsageMetric[] = [
    { id: uid(), metric: 'users', current: 8, limit: 20 },
    { id: uid(), metric: 'storage_mb', current: 240, limit: 5000 },
    { id: uid(), metric: 'api_calls', current: 1248, limit: 50000, resetAt: new Date(Date.now() + 30 * 86400000).toISOString() },
    { id: uid(), metric: 'workorders', current: 327, limit: 5000 },
    { id: uid(), metric: 'sms', current: 84, limit: 500, resetAt: new Date(Date.now() + 30 * 86400000).toISOString() },
  ];
  await save(K.usage, seed); return seed;
}
export async function listUsage() { return seedUsage(); }
export const USAGE_LABEL: Record<UsageMetric['metric'], string> = {
  users: 'Kullanıcı', storage_mb: 'Depolama (MB)', api_calls: 'API Çağrısı', workorders: 'İş Emri', sms: 'SMS',
};

// DB Index hints
async function seedIdx(): Promise<DbIndexHint[]> {
  const list = await load<DbIndexHint>(K.idx);
  if (list.length) return list;
  const seed: DbIndexHint[] = [
    { id: uid(), table: 'workorders', column: 'customer_id', suggested: true, rowCount: 12450, estimatedGainPct: 65, applied: false },
    { id: uid(), table: 'services', column: 'created_at', suggested: true, rowCount: 8932, estimatedGainPct: 42, applied: true },
    { id: uid(), table: 'quotes', column: 'status', suggested: true, rowCount: 3421, estimatedGainPct: 28, applied: false },
    { id: uid(), table: 'expenses', column: 'category_id', suggested: true, rowCount: 6210, estimatedGainPct: 35, applied: false },
    { id: uid(), table: 'customers', column: 'phone', suggested: false, rowCount: 1840, estimatedGainPct: 15, applied: false },
  ];
  await save(K.idx, seed); return seed;
}
export async function listIndexHints() { return seedIdx(); }
export async function applyIndex(id: string) {
  const list = await load<DbIndexHint>(K.idx);
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) { list[idx].applied = true; await save(K.idx, list); }
}

// Archive
async function seedArcPol(): Promise<ArchivePolicy[]> {
  const list = await load<ArchivePolicy>(K.arcPol);
  if (list.length) return list;
  const seed: ArchivePolicy[] = [
    { id: uid(), entity: 'workorders', olderThanDays: 365, active: true, archivedCount: 1240, lastRunAt: now() },
    { id: uid(), entity: 'services', olderThanDays: 365, active: true, archivedCount: 892, lastRunAt: now() },
    { id: uid(), entity: 'quotes', olderThanDays: 730, active: false, archivedCount: 0 },
    { id: uid(), entity: 'expenses', olderThanDays: 1095, active: true, archivedCount: 312, lastRunAt: now() },
    { id: uid(), entity: 'logs', olderThanDays: 90, active: true, archivedCount: 5420, lastRunAt: now() },
  ];
  await save(K.arcPol, seed); return seed;
}
export async function listArchivePolicies() { return seedArcPol(); }
export async function toggleArchivePolicy(id: string) {
  const list = await load<ArchivePolicy>(K.arcPol);
  const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) { list[idx].active = !list[idx].active; await save(K.arcPol, list); }
}
export async function updateArchiveDays(id: string, days: number) {
  const list = await load<ArchivePolicy>(K.arcPol);
  const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) { list[idx].olderThanDays = days; await save(K.arcPol, list); }
}
export async function runArchiveJob(entity: ArchivePolicy['entity']): Promise<ArchiveJob> {
  const list = await load<ArchiveJob>(K.arcJobs);
  const moved = Math.floor(Math.random() * 200) + 10;
  const job: ArchiveJob = { id: uid(), entity, movedCount: moved, startedAt: now(), finishedAt: now(), status: 'success' };
  list.unshift(job); await save(K.arcJobs, list);
  // update policy stats
  const pol = await load<ArchivePolicy>(K.arcPol);
  const pi = pol.findIndex(p => p.entity === entity);
  if (pi >= 0) { pol[pi].archivedCount += moved; pol[pi].lastRunAt = now(); await save(K.arcPol, pol); }
  return job;
}
export async function listArchiveJobs() { return load<ArchiveJob>(K.arcJobs); }
export const ENTITY_LABEL: Record<ArchivePolicy['entity'], string> = {
  workorders: 'İş Emirleri', services: 'Servisler', quotes: 'Teklifler', expenses: 'Giderler', logs: 'Log Kayıtları',
};

// Backups
async function seedBackups(): Promise<PlatformBackup[]> {
  const list = await load<PlatformBackup>(K.backups);
  if (list.length) return list;
  const seed: PlatformBackup[] = Array.from({ length: 7 }).map((_, i) => ({
    id: uid(),
    startedAt: new Date(Date.now() - i * 86400000).toISOString(),
    finishedAt: new Date(Date.now() - i * 86400000 + 240000).toISOString(),
    sizeMb: 120 + Math.floor(Math.random() * 80),
    status: (i === 3 ? 'failed' : 'success') as PlatformBackup['status'],
    location: (i % 2 === 0 ? 'cloud' : 'local') as PlatformBackup['location'],
    errorMessage: i === 3 ? 'S3 yükleme zaman aşımı' : undefined,
  }));
  await save(K.backups, seed); return seed;
}
export async function listBackups() { return seedBackups(); }
export async function triggerBackup(): Promise<PlatformBackup> {
  const list = await load<PlatformBackup>(K.backups);
  const ok = Math.random() > 0.15;
  const rec: PlatformBackup = {
    id: uid(), startedAt: now(), finishedAt: now(),
    sizeMb: 130 + Math.floor(Math.random() * 60),
    status: ok ? 'success' : 'failed', location: 'cloud',
    errorMessage: ok ? undefined : 'Sıkıştırma hatası',
  };
  list.unshift(rec); await save(K.backups, list); return rec;
}

// Restore tests
async function seedRestore(): Promise<RestoreTest[]> {
  const list = await load<RestoreTest>(K.restore);
  if (list.length) return list;
  const backups = await seedBackups();
  const seed: RestoreTest[] = backups.slice(0, 3).map((b, i) => ({
    id: uid(), backupId: b.id,
    runAt: new Date(Date.now() - i * 7 * 86400000).toISOString(),
    durationSec: 45 + Math.floor(Math.random() * 60),
    success: i !== 1,
    message: i === 1 ? 'Şema uyumsuzluğu uyarısı' : 'OK',
  }));
  await save(K.restore, seed); return seed;
}
export async function listRestoreTests() { return seedRestore(); }
export async function runRestoreTest(backupId: string): Promise<RestoreTest> {
  const list = await load<RestoreTest>(K.restore);
  const ok = Math.random() > 0.2;
  const t: RestoreTest = { id: uid(), backupId, runAt: now(), durationSec: 30 + Math.floor(Math.random() * 90), success: ok, message: ok ? 'OK' : 'Hata: tabloya erişilemedi' };
  list.unshift(t); await save(K.restore, list); return t;
}

// System Health
async function seedHealth(): Promise<SystemHealthCheck[]> {
  const list = await load<SystemHealthCheck>(K.health);
  if (list.length) return list;
  const comps: SystemHealthCheck['component'][] = ['database', 'storage', 'auth', 'jobs', 'notifications', 'integrations'];
  const seed: SystemHealthCheck[] = comps.map(c => ({
    id: uid(), component: c, status: 'ok', latencyMs: 20 + Math.floor(Math.random() * 80), checkedAt: now(), message: 'Çalışıyor',
  }));
  await save(K.health, seed); return seed;
}
export async function listSystemHealth() { return seedHealth(); }
export async function refreshSystemHealth() {
  const list = await load<SystemHealthCheck>(K.health);
  const updated = list.map(c => {
    const r = Math.random();
    const status: SystemHealthStatus = r > 0.9 ? 'down' : r > 0.75 ? 'warn' : 'ok';
    return { ...c, status, latencyMs: 20 + Math.floor(Math.random() * 120), checkedAt: now(), message: status === 'ok' ? 'Çalışıyor' : status === 'warn' ? 'Yüksek gecikme' : 'Servis yanıt vermiyor' };
  });
  await save(K.health, updated); return updated;
}

// Maintenance
export async function listMaintenance() { return load<MaintenanceWindow>(K.maint); }
export async function saveMaintenance(m: Partial<MaintenanceWindow>): Promise<MaintenanceWindow> {
  const list = await load<MaintenanceWindow>(K.maint);
  if (m.id) {
    const idx = list.findIndex(x => x.id === m.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...m }; await save(K.maint, list); return list[idx]; }
  }
  const created: MaintenanceWindow = {
    id: uid(), title: m.title || 'Bakım Penceresi',
    startsAt: m.startsAt || now(),
    endsAt: m.endsAt || new Date(Date.now() + 60 * 60000).toISOString(),
    message: m.message || 'Sistem bakımdadır.',
    active: m.active ?? true, affectsAll: m.affectsAll ?? true,
  };
  list.unshift(created); await save(K.maint, list); return created;
}
export async function toggleMaintenance(id: string) {
  const list = await load<MaintenanceWindow>(K.maint);
  const idx = list.findIndex(m => m.id === id);
  if (idx >= 0) { list[idx].active = !list[idx].active; await save(K.maint, list); }
}
export async function deleteMaintenance(id: string) {
  const list = await load<MaintenanceWindow>(K.maint);
  await save(K.maint, list.filter(m => m.id !== id));
}
