// Faz 48 — Customer Portal 2.0 service
// Sahte seed kaldirildi: gercek tablolar olustukca quotes/work_orders/customers/payments tablolarindan
// musteri scope'lu olarak okunacak. Su an icin bos liste/default doner.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CpDashboardSummary, CpQuoteCard, CpWorkOrderProgress, CpServiceRequest,
  CpDocumentItem, CpSatisfactionEntry, CpNotification, CpBrandingConfig,
  CpShareLinkSecurityPolicy, CpWoStatus, CpRequestUrgency, CpRequestStatus, CpDocumentKind,
} from '../types';

const K = {
  dash: 'cp_dash_v1', quotes: 'cp_quotes_v1', wo: 'cp_wo_v1', req: 'cp_req_v1',
  docs: 'cp_docs_v1', sat: 'cp_sat_v1', notif: 'cp_notif_v1',
  brand: 'cp_brand_v1', sec: 'cp_sec_v1',
};
const now = () => new Date().toISOString();

async function loadList<T>(key: string): Promise<T[]> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function loadObj<T>(key: string, fb: T): Promise<T> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : fb; } catch { return fb; }
}

// ---------- Dashboard ----------
const DEFAULT_DASH: CpDashboardSummary = {
  customerId: '', customerName: '',
  openJobs: 0, pendingQuotes: 0, unreadDocs: 0, outstandingBalance: 0, satisfactionScore: 0,
  lastVisit: '',
};
export const getCpDashboard = async (): Promise<CpDashboardSummary> => loadObj(K.dash, DEFAULT_DASH);

// ---------- Quotes ----------
export const listCpQuotes = async (): Promise<CpQuoteCard[]> => loadList<CpQuoteCard>(K.quotes);
export const updateCpQuoteStatus = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
  const list = await listCpQuotes();
  const next = list.map(q => q.id === id ? { ...q, status, customerComment: comment } : q);
  await AsyncStorage.setItem(K.quotes, JSON.stringify(next));
};

// ---------- Work Orders ----------
export const listCpWorkOrders = async (): Promise<CpWorkOrderProgress[]> => loadList<CpWorkOrderProgress>(K.wo);

// ---------- Service Requests ----------
export const listCpRequests = async (): Promise<CpServiceRequest[]> => loadList<CpServiceRequest>(K.req);
export const createCpRequest = async (data: { title: string; description: string; urgency: CpRequestUrgency }) => {
  const list = await listCpRequests();
  const r: CpServiceRequest = { id: 'r' + Date.now(), status: 'new', createdAt: now(), ...data };
  const next = [r, ...list];
  await AsyncStorage.setItem(K.req, JSON.stringify(next));
  return r;
};

// ---------- Documents ----------
export const listCpDocuments = async (): Promise<CpDocumentItem[]> => loadList<CpDocumentItem>(K.docs);

// ---------- Satisfaction ----------
export const listCpSatisfaction = async (): Promise<CpSatisfactionEntry[]> => loadList<CpSatisfactionEntry>(K.sat);

// ---------- Notifications ----------
export const listCpNotifications = async (): Promise<CpNotification[]> => loadList<CpNotification>(K.notif);
export const markCpNotificationRead = async (id: string) => {
  const list = await listCpNotifications();
  await AsyncStorage.setItem(K.notif, JSON.stringify(list.map(n => n.id === id ? { ...n, read: true } : n)));
};

// ---------- Branding ----------
const DEFAULT_BRAND: CpBrandingConfig = {
  brandName: 'SahaTakip Müşteri Portalı',
  primaryColor: '#0ea5e9',
  secondaryColor: '#22c55e',
  logoEmoji: '⚡',
  greeting: 'Hoş geldiniz.',
  footerText: '© SahaTakip',
};
export const getCpBranding = async (): Promise<CpBrandingConfig> => loadObj(K.brand, DEFAULT_BRAND);
export const updateCpBranding = async (b: CpBrandingConfig) => AsyncStorage.setItem(K.brand, JSON.stringify(b));

// ---------- Security ----------
const DEFAULT_SEC: CpShareLinkSecurityPolicy = {
  defaultExpiryHours: 72, requirePassword: false, watermarkPdfs: true, logAllAccess: true,
  maxDownloads: 10, ipRestriction: false,
  recentLogs: [],
};
export const getCpSecurity = async (): Promise<CpShareLinkSecurityPolicy> => loadObj(K.sec, DEFAULT_SEC);
export const updateCpSecurity = async (s: CpShareLinkSecurityPolicy) => AsyncStorage.setItem(K.sec, JSON.stringify(s));

// ---------- Labels & colors ----------
export const CP_WO_LABEL: Record<CpWoStatus, string> = {
  planned: 'Planlandı', in_progress: 'Sahada', completed: 'Tamamlandı', awaiting_signature: 'İmza Bekleniyor',
};
export const CP_WO_COLOR: Record<CpWoStatus, string> = {
  planned: '#64748b', in_progress: '#0ea5e9', completed: '#22c55e', awaiting_signature: '#f59e0b',
};
export const CP_URG_LABEL: Record<CpRequestUrgency, string> = {
  low: 'Düşük', normal: 'Normal', high: 'Yüksek', critical: 'Kritik',
};
export const CP_URG_COLOR: Record<CpRequestUrgency, string> = {
  low: '#22c55e', normal: '#0ea5e9', high: '#f59e0b', critical: '#ef4444',
};
export const CP_REQ_STATUS_LABEL: Record<CpRequestStatus, string> = {
  new: 'Yeni', in_review: 'İnceleniyor', scheduled: 'Planlandı', closed: 'Kapandı',
};
export const CP_REQ_STATUS_COLOR: Record<CpRequestStatus, string> = {
  new: '#f59e0b', in_review: '#0ea5e9', scheduled: '#a855f7', closed: '#64748b',
};
export const CP_DOC_LABEL: Record<CpDocumentKind, string> = {
  quote: 'Teklif', invoice: 'Fatura', report: 'Rapor', photo: 'Fotoğraf', contract: 'Sözleşme', certificate: 'Sertifika',
};
export const CP_DOC_ICON: Record<CpDocumentKind, string> = {
  quote: 'document-text', invoice: 'receipt', report: 'document', photo: 'image', contract: 'reader', certificate: 'ribbon',
};
export const CP_DOC_COLOR: Record<CpDocumentKind, string> = {
  quote: '#0ea5e9', invoice: '#f59e0b', report: '#22c55e', photo: '#a855f7', contract: '#8b5cf6', certificate: '#facc15',
};
export const CP_NOTIF_ICON: Record<CpNotification['category'], string> = {
  quote: 'document-text', workorder: 'construct', invoice: 'receipt', report: 'document', system: 'cog',
};
export const CP_NOTIF_COLOR: Record<CpNotification['category'], string> = {
  quote: '#0ea5e9', workorder: '#22c55e', invoice: '#f59e0b', report: '#a855f7', system: '#64748b',
};
