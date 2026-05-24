// customerExperience.ts — POZ-DEV-391 Faz 37 müşteri portalı + paylaşım + memnuniyet
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PortalUser, PortalUserStatus, ShareLink, ShareLinkResource, ShareLinkAccessLog,
  QuoteApprovalRecord, QuoteApprovalDecision,
  CustomerComment, SatisfactionSurvey, SurveyStatus,
  CustomerNotificationPref, AutoReportSchedule,
} from '../types';

const KEYS = {
  portal: 'cx_portal_users_v1',
  links: 'cx_share_links_v1',
  linkLog: 'cx_share_link_logs_v1',
  approvals: 'cx_quote_approvals_v1',
  comments: 'cx_customer_comments_v1',
  surveys: 'cx_satisfaction_surveys_v1',
  notif: 'cx_customer_notif_prefs_v1',
  reports: 'cx_auto_reports_v1',
};

function uid(p: string): string { return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
function token(): string { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); }

async function loadList<T>(key: string): Promise<T[]> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; }
}
async function saveList<T>(key: string, list: T[]): Promise<void> { await AsyncStorage.setItem(key, JSON.stringify(list)); }

// ── Portal users ─────────────────────────────────────────
export const PORTAL_STATUS_LABEL: Record<PortalUserStatus, string> = {
  active: 'Aktif', invited: 'Davet Edildi', suspended: 'Askıya Alındı',
};
export const PORTAL_STATUS_COLOR: Record<PortalUserStatus, string> = {
  active: '#22c55e', invited: '#0ea5e9', suspended: '#ef4444',
};

export async function listPortalUsers(): Promise<PortalUser[]> { return loadList<PortalUser>(KEYS.portal); }
export async function getPortalUser(id: string): Promise<PortalUser | undefined> {
  return (await listPortalUsers()).find(u => u.id === id);
}
export async function savePortalUser(u: Omit<PortalUser, 'id' | 'invitedAt' | 'status'> & { id?: string; status?: PortalUserStatus }): Promise<PortalUser> {
  const list = await listPortalUsers();
  if (u.id) {
    const idx = list.findIndex(x => x.id === u.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...u, id: u.id }; await saveList(KEYS.portal, list); return list[idx]; }
  }
  const fresh: PortalUser = { ...(u as any), id: uid('pu'), invitedAt: new Date().toISOString(), status: u.status || 'invited' };
  await saveList(KEYS.portal, [fresh, ...list]);
  return fresh;
}
export async function deletePortalUser(id: string): Promise<void> {
  const list = await listPortalUsers();
  await saveList(KEYS.portal, list.filter(u => u.id !== id));
}
export async function setPortalUserStatus(id: string, status: PortalUserStatus): Promise<void> {
  const list = await listPortalUsers();
  const idx = list.findIndex(u => u.id === id);
  if (idx >= 0) { list[idx].status = status; await saveList(KEYS.portal, list); }
}

// ── Share links ──────────────────────────────────────────
export const LINK_RESOURCE_LABEL: Record<ShareLinkResource, string> = {
  quote: 'Teklif', work_order: 'İş Emri', report: 'Rapor', document: 'Belge',
};
export const LINK_RESOURCE_COLOR: Record<ShareLinkResource, string> = {
  quote: '#22c55e', work_order: '#0ea5e9', report: '#a855f7', document: '#f59e0b',
};

export async function listShareLinks(): Promise<ShareLink[]> { return loadList<ShareLink>(KEYS.links); }
export async function getShareLink(id: string): Promise<ShareLink | undefined> {
  return (await listShareLinks()).find(l => l.id === id);
}
export async function saveShareLink(l: Omit<ShareLink, 'id' | 'createdAt' | 'opens' | 'status' | 'token'> & { id?: string; opens?: number; status?: ShareLink['status']; token?: string }): Promise<ShareLink> {
  const list = await listShareLinks();
  if (l.id) {
    const idx = list.findIndex(x => x.id === l.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...l, id: l.id }; await saveList(KEYS.links, list); return list[idx]; }
  }
  const fresh: ShareLink = { ...(l as any), id: uid('lnk'), token: l.token || token(), createdAt: new Date().toISOString(), opens: l.opens ?? 0, status: l.status || 'active' };
  await saveList(KEYS.links, [fresh, ...list]);
  return fresh;
}
export async function revokeShareLink(id: string): Promise<void> {
  const list = await listShareLinks();
  const idx = list.findIndex(l => l.id === id);
  if (idx >= 0) { list[idx].status = 'revoked'; await saveList(KEYS.links, list); }
}
export async function deleteShareLink(id: string): Promise<void> {
  const list = await listShareLinks();
  await saveList(KEYS.links, list.filter(l => l.id !== id));
}
export async function recordShareLinkAccess(linkId: string, result: ShareLinkAccessLog['result'], note?: string): Promise<void> {
  const log = await loadList<ShareLinkAccessLog>(KEYS.linkLog);
  const fresh: ShareLinkAccessLog = { id: uid('lal'), linkId, occurredAt: new Date().toISOString(), result, note };
  await saveList(KEYS.linkLog, [fresh, ...log].slice(0, 500));
  if (result === 'opened') {
    const list = await listShareLinks();
    const idx = list.findIndex(l => l.id === linkId);
    if (idx >= 0) { list[idx].opens = (list[idx].opens || 0) + 1; await saveList(KEYS.links, list); }
  }
}
export async function listShareLinkLogs(linkId?: string): Promise<ShareLinkAccessLog[]> {
  const all = await loadList<ShareLinkAccessLog>(KEYS.linkLog);
  return linkId ? all.filter(l => l.linkId === linkId) : all;
}

// ── Quote approvals (portal) ─────────────────────────────
export const APPROVAL_DECISION_LABEL: Record<QuoteApprovalDecision, string> = {
  approved: 'Onaylandı', rejected: 'Reddedildi', revision_requested: 'Revizyon İstendi',
};
export const APPROVAL_DECISION_COLOR: Record<QuoteApprovalDecision, string> = {
  approved: '#22c55e', rejected: '#ef4444', revision_requested: '#f59e0b',
};

export async function listQuoteApprovals(quoteId?: string): Promise<QuoteApprovalRecord[]> {
  const all = await loadList<QuoteApprovalRecord>(KEYS.approvals);
  return quoteId ? all.filter(a => a.quoteId === quoteId) : all;
}
export async function recordQuoteApproval(input: Omit<QuoteApprovalRecord, 'id' | 'decidedAt'>): Promise<QuoteApprovalRecord> {
  const list = await loadList<QuoteApprovalRecord>(KEYS.approvals);
  const fresh: QuoteApprovalRecord = { ...input, id: uid('qap'), decidedAt: new Date().toISOString() };
  await saveList(KEYS.approvals, [fresh, ...list]);
  return fresh;
}

// ── Comments ─────────────────────────────────────────────
export async function listComments(customerId?: string): Promise<CustomerComment[]> {
  const all = await loadList<CustomerComment>(KEYS.comments);
  return customerId ? all.filter(c => c.customerId === customerId) : all;
}
export async function saveComment(c: Omit<CustomerComment, 'id' | 'createdAt'>): Promise<CustomerComment> {
  const list = await loadList<CustomerComment>(KEYS.comments);
  const fresh: CustomerComment = { ...c, id: uid('cmt'), createdAt: new Date().toISOString() };
  await saveList(KEYS.comments, [fresh, ...list]);
  return fresh;
}
export async function resolveComment(id: string, resolved: boolean): Promise<void> {
  const list = await loadList<CustomerComment>(KEYS.comments);
  const idx = list.findIndex(c => c.id === id);
  if (idx >= 0) { list[idx].resolved = resolved; await saveList(KEYS.comments, list); }
}
export async function deleteComment(id: string): Promise<void> {
  const list = await loadList<CustomerComment>(KEYS.comments);
  await saveList(KEYS.comments, list.filter(c => c.id !== id));
}

// ── Satisfaction surveys ─────────────────────────────────
export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  draft: 'Taslak', sent: 'Gönderildi', completed: 'Tamamlandı', declined: 'Reddedildi',
};
export const SURVEY_STATUS_COLOR: Record<SurveyStatus, string> = {
  draft: '#64748b', sent: '#0ea5e9', completed: '#22c55e', declined: '#ef4444',
};

export async function listSurveys(): Promise<SatisfactionSurvey[]> { return loadList<SatisfactionSurvey>(KEYS.surveys); }
export async function getSurvey(id: string): Promise<SatisfactionSurvey | undefined> {
  return (await listSurveys()).find(s => s.id === id);
}
export async function saveSurvey(s: Omit<SatisfactionSurvey, 'id' | 'sentAt' | 'status'> & { id?: string; status?: SurveyStatus; sentAt?: string }): Promise<SatisfactionSurvey> {
  const list = await listSurveys();
  if (s.id) {
    const idx = list.findIndex(x => x.id === s.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...s, id: s.id }; await saveList(KEYS.surveys, list); return list[idx]; }
  }
  const fresh: SatisfactionSurvey = { ...(s as any), id: uid('sv'), sentAt: s.sentAt || new Date().toISOString(), status: s.status || 'sent' };
  await saveList(KEYS.surveys, [fresh, ...list]);
  return fresh;
}
export async function completeSurvey(id: string, patch: Partial<SatisfactionSurvey>): Promise<void> {
  const list = await listSurveys();
  const idx = list.findIndex(s => s.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, status: 'completed', completedAt: new Date().toISOString() };
    await saveList(KEYS.surveys, list);
  }
}

// ── Notification prefs ───────────────────────────────────
const DEFAULT_NOTIF: Omit<CustomerNotificationPref, 'customerId' | 'updatedAt'> = {
  emailEnabled: true, smsEnabled: false, whatsappEnabled: false, pushEnabled: true,
  monthlyReport: true, serviceCompleted: true, quoteSent: true, paymentReminder: true,
};

export async function getCustomerNotifPref(customerId: string): Promise<CustomerNotificationPref> {
  const all = await loadList<CustomerNotificationPref>(KEYS.notif);
  const found = all.find(p => p.customerId === customerId);
  return found || { customerId, ...DEFAULT_NOTIF, updatedAt: new Date().toISOString() };
}
export async function saveCustomerNotifPref(pref: CustomerNotificationPref): Promise<void> {
  const all = await loadList<CustomerNotificationPref>(KEYS.notif);
  const idx = all.findIndex(p => p.customerId === pref.customerId);
  const next: CustomerNotificationPref = { ...pref, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = next; else all.push(next);
  await saveList(KEYS.notif, all);
}

// ── Auto reports ─────────────────────────────────────────
export const CADENCE_LABEL: Record<AutoReportSchedule['cadence'], string> = {
  weekly: 'Haftalık', monthly: 'Aylık', quarterly: 'Çeyreklik',
};
export const REPORT_KIND_LABEL: Record<AutoReportSchedule['reportKind'], string> = {
  summary: 'Genel Özet', work_orders: 'İş Emirleri', finance: 'Finans', sla: 'SLA',
};

export async function listAutoReports(): Promise<AutoReportSchedule[]> { return loadList<AutoReportSchedule>(KEYS.reports); }
export async function saveAutoReport(r: Omit<AutoReportSchedule, 'id'> & { id?: string }): Promise<AutoReportSchedule> {
  const list = await listAutoReports();
  if (r.id) {
    const idx = list.findIndex(x => x.id === r.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...r, id: r.id }; await saveList(KEYS.reports, list); return list[idx]; }
  }
  const fresh: AutoReportSchedule = { ...(r as any), id: uid('ar') };
  await saveList(KEYS.reports, [fresh, ...list]);
  return fresh;
}
export async function deleteAutoReport(id: string): Promise<void> {
  const list = await listAutoReports();
  await saveList(KEYS.reports, list.filter(r => r.id !== id));
}
export async function toggleAutoReport(id: string): Promise<void> {
  const list = await listAutoReports();
  const idx = list.findIndex(r => r.id === id);
  if (idx >= 0) { list[idx].enabled = !list[idx].enabled; await saveList(KEYS.reports, list); }
}
