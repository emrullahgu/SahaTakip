// governance.ts — POZ-DEV-341 Yetkilendirme, denetim ve kurumsal yönetim veri katmanı
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Department, Region, Permission, UserRoleExt, PermissionResource, PermissionAction,
  ApprovalRequest, ApprovalKind, ApprovalStatus,
  AuditLogEntry, AuditAction, SessionLog, KvkkAccessLog, KvkkAccessKind,
} from '../types';

const KEYS = {
  dept: 'gov_departments_v1',
  reg: 'gov_regions_v1',
  perm: 'gov_permissions_v1',
  apr: 'gov_approvals_v1',
  aud: 'gov_audit_v1',
  ses: 'gov_sessions_v1',
  kvkk: 'gov_kvkk_v1',
};

function uid(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

async function loadList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

async function saveList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ── Departments ─────────────────────────────────────────
export async function listDepartments(): Promise<Department[]> { return loadList<Department>(KEYS.dept); }
export async function saveDepartment(d: Omit<Department, 'id' | 'createdAt'> & { id?: string }): Promise<Department> {
  const list = await listDepartments();
  if (d.id) {
    const idx = list.findIndex(x => x.id === d.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...d, id: d.id }; await saveList(KEYS.dept, list); return list[idx]; }
  }
  const fresh: Department = { ...(d as any), id: uid('dept'), createdAt: new Date().toISOString() };
  await saveList(KEYS.dept, [fresh, ...list]);
  return fresh;
}
export async function deleteDepartment(id: string): Promise<void> {
  const list = await listDepartments();
  await saveList(KEYS.dept, list.filter(d => d.id !== id));
}

// ── Regions ─────────────────────────────────────────────
export async function listRegions(): Promise<Region[]> { return loadList<Region>(KEYS.reg); }
export async function saveRegion(r: Omit<Region, 'id' | 'createdAt'> & { id?: string }): Promise<Region> {
  const list = await listRegions();
  if (r.id) {
    const idx = list.findIndex(x => x.id === r.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...r, id: r.id }; await saveList(KEYS.reg, list); return list[idx]; }
  }
  const fresh: Region = { ...(r as any), id: uid('reg'), createdAt: new Date().toISOString() };
  await saveList(KEYS.reg, [fresh, ...list]);
  return fresh;
}
export async function deleteRegion(id: string): Promise<void> {
  const list = await listRegions();
  await saveList(KEYS.reg, list.filter(d => d.id !== id));
}

// ── Permissions (role matrix) ───────────────────────────
export const ROLES: UserRoleExt[] = ['admin', 'manager', 'engineer', 'field', 'finance', 'sales', 'viewer'];
export const ROLE_LABEL: Record<UserRoleExt, string> = {
  admin: 'Admin', manager: 'Yönetici', engineer: 'Mühendis', field: 'Saha',
  finance: 'Finans', sales: 'Satış', viewer: 'Görüntüleyici',
};
export const ROLE_COLOR: Record<UserRoleExt, string> = {
  admin: '#ef4444', manager: '#8b5cf6', engineer: '#0ea5e9', field: '#f59e0b',
  finance: '#22c55e', sales: '#ec4899', viewer: '#64748b',
};

export const RESOURCES: PermissionResource[] = [
  'customer', 'work_order', 'quote', 'task', 'material', 'vehicle',
  'payroll', 'timesheet', 'osos', 'finance', 'report', 'user',
  'feedback', 'crash', 'release', 'audit', 'system',
];
export const RESOURCE_LABEL: Record<PermissionResource, string> = {
  customer: 'Müşteri', work_order: 'İş Emri', quote: 'Teklif', task: 'Görev',
  material: 'Malzeme', vehicle: 'Araç', payroll: 'Bordro', timesheet: 'Puantaj',
  osos: 'OSOS', finance: 'Finans', report: 'Rapor', user: 'Kullanıcı',
  feedback: 'Geri Bildirim', crash: 'Crash', release: 'Sürüm', audit: 'Audit', system: 'Sistem',
};

export const ACTIONS: PermissionAction[] = ['view', 'create', 'update', 'delete', 'approve', 'export'];
export const ACTION_LABEL: Record<PermissionAction, string> = {
  view: 'Gör', create: 'Oluştur', update: 'Güncelle', delete: 'Sil', approve: 'Onayla', export: 'Dışa Aktar',
};

function defaultAllowed(role: UserRoleExt, resource: PermissionResource, action: PermissionAction): boolean {
  if (role === 'admin') return true;
  if (role === 'viewer') return action === 'view';
  if (role === 'manager') return action !== 'delete' || ['customer', 'task', 'work_order'].includes(resource);
  if (role === 'finance') return resource === 'payroll' || resource === 'finance' || (action === 'view');
  if (role === 'sales') return resource === 'customer' || resource === 'quote' || action === 'view';
  if (role === 'engineer') return ['work_order', 'task', 'material', 'vehicle', 'customer', 'quote'].includes(resource) && action !== 'delete';
  if (role === 'field') return ['work_order', 'task', 'material'].includes(resource) && (action === 'view' || action === 'update');
  return false;
}

export async function listPermissions(): Promise<Permission[]> {
  const stored = await loadList<Permission>(KEYS.perm);
  if (stored.length > 0) return stored;
  // seed full matrix
  const seed: Permission[] = [];
  for (const role of ROLES) {
    for (const res of RESOURCES) {
      for (const act of ACTIONS) {
        seed.push({ id: uid('perm'), role, resource: res, action: act, allowed: defaultAllowed(role, res, act) });
      }
    }
  }
  await saveList(KEYS.perm, seed);
  return seed;
}

export async function setPermission(role: UserRoleExt, resource: PermissionResource, action: PermissionAction, allowed: boolean): Promise<void> {
  const list = await listPermissions();
  const idx = list.findIndex(p => p.role === role && p.resource === resource && p.action === action);
  if (idx >= 0) list[idx].allowed = allowed;
  else list.push({ id: uid('perm'), role, resource, action, allowed });
  await saveList(KEYS.perm, list);
}

export async function resetPermissions(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.perm);
}

// ── Approvals ───────────────────────────────────────────
export const APPROVAL_KIND_LABEL: Record<ApprovalKind, string> = {
  delete: 'Silme Onayı', discount: 'İskonto', bulk_assign: 'Toplu Atama',
  payroll: 'Bordro', data_export: 'Veri Dışa Aktarım', permission_change: 'Yetki Değişimi', other: 'Diğer',
};
export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi', expired: 'Süresi Doldu',
};
export const APPROVAL_STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', expired: '#64748b',
};

export async function listApprovals(): Promise<ApprovalRequest[]> { return loadList<ApprovalRequest>(KEYS.apr); }
export async function getApproval(id: string): Promise<ApprovalRequest | undefined> {
  return (await listApprovals()).find(a => a.id === id);
}
export async function createApproval(input: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>): Promise<ApprovalRequest> {
  const list = await listApprovals();
  const fresh: ApprovalRequest = { ...input, id: uid('apr'), createdAt: new Date().toISOString(), status: 'pending' };
  await saveList(KEYS.apr, [fresh, ...list]);
  return fresh;
}
export async function decideApproval(id: string, status: 'approved' | 'rejected', decidedBy?: string, note?: string): Promise<void> {
  const list = await listApprovals();
  const idx = list.findIndex(a => a.id === id);
  if (idx >= 0) {
    list[idx].status = status;
    list[idx].decidedAt = new Date().toISOString();
    list[idx].decidedBy = decidedBy;
    list[idx].decisionNote = note;
    await saveList(KEYS.apr, list);
  }
}

// ── Audit Log ───────────────────────────────────────────
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  create: 'Oluştur', update: 'Güncelle', delete: 'Sil', login: 'Giriş',
  logout: 'Çıkış', export: 'Dışa Aktarım', view_sensitive: 'Hassas Veri', permission_change: 'Yetki Değişimi',
};
export const AUDIT_ACTION_COLOR: Record<AuditAction, string> = {
  create: '#22c55e', update: '#0ea5e9', delete: '#ef4444', login: '#8b5cf6',
  logout: '#64748b', export: '#f59e0b', view_sensitive: '#ec4899', permission_change: '#a855f7',
};

export async function listAudit(): Promise<AuditLogEntry[]> { return loadList<AuditLogEntry>(KEYS.aud); }
export async function getAuditEntry(id: string): Promise<AuditLogEntry | undefined> {
  return (await listAudit()).find(a => a.id === id);
}
export async function recordAudit(input: Omit<AuditLogEntry, 'id' | 'occurredAt'>): Promise<AuditLogEntry> {
  const list = await listAudit();
  const fresh: AuditLogEntry = { ...input, id: uid('aud'), occurredAt: new Date().toISOString() };
  const updated = [fresh, ...list].slice(0, 1000);
  await saveList(KEYS.aud, updated);
  return fresh;
}
export async function clearAudit(): Promise<void> { await AsyncStorage.removeItem(KEYS.aud); }

// ── Sessions ────────────────────────────────────────────
export async function listSessions(): Promise<SessionLog[]> { return loadList<SessionLog>(KEYS.ses); }
export async function recordSession(input: Omit<SessionLog, 'id'> & { id?: string }): Promise<SessionLog> {
  const list = await listSessions();
  if (input.id) {
    const idx = list.findIndex(s => s.id === input.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...input, id: input.id }; await saveList(KEYS.ses, list); return list[idx]; }
  }
  const fresh: SessionLog = { ...(input as any), id: uid('ses') };
  await saveList(KEYS.ses, [fresh, ...list]);
  return fresh;
}

// ── KVKK access ─────────────────────────────────────────
export const KVKK_KIND_LABEL: Record<KvkkAccessKind, string> = {
  view: 'Görüntüleme', export: 'Dışa Aktarım', share: 'Paylaşım', delete: 'Silme',
};
export const KVKK_KIND_COLOR: Record<KvkkAccessKind, string> = {
  view: '#0ea5e9', export: '#f59e0b', share: '#a855f7', delete: '#ef4444',
};

export async function listKvkk(): Promise<KvkkAccessLog[]> { return loadList<KvkkAccessLog>(KEYS.kvkk); }
export async function recordKvkk(input: Omit<KvkkAccessLog, 'id' | 'occurredAt'>): Promise<KvkkAccessLog> {
  const list = await listKvkk();
  const fresh: KvkkAccessLog = { ...input, id: uid('kvkk'), occurredAt: new Date().toISOString() };
  await saveList(KEYS.kvkk, [fresh, ...list]);
  return fresh;
}
