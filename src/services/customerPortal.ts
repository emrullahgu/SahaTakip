// Faz 48 — Customer Portal 2.0 service
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
const iso = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

// ---------- Dashboard ----------
const SEED_DASH: CpDashboardSummary = {
  customerId: 'c1', customerName: 'Ankara OSB Tekstil',
  openJobs: 3, pendingQuotes: 2, unreadDocs: 5, outstandingBalance: 12450.50, satisfactionScore: 4.6,
  lastVisit: iso(-1),
};
export const getCpDashboard = async (): Promise<CpDashboardSummary> => {
  const raw = await AsyncStorage.getItem(K.dash);
  if (!raw) { await AsyncStorage.setItem(K.dash, JSON.stringify(SEED_DASH)); return SEED_DASH; }
  try { return JSON.parse(raw); } catch { return SEED_DASH; }
};

// ---------- Quotes ----------
const SEED_QUOTES: CpQuoteCard[] = [
  { id: 'q1', number: 'TKL-2024-018', title: 'Trafo bakım + sigorta yenileme', total: 18500, validUntil: iso(15), status: 'pending', sentAt: iso(-2) },
  { id: 'q2', number: 'TKL-2024-019', title: 'GES inverter değişimi', total: 32400, validUntil: iso(20), status: 'pending', sentAt: iso(-4) },
  { id: 'q3', number: 'TKL-2024-015', title: 'Pano modernizasyonu', total: 14200, validUntil: iso(-5), status: 'approved', sentAt: iso(-12), customerComment: 'Onaylandı, başlayabilirsiniz.' },
  { id: 'q4', number: 'TKL-2024-014', title: 'Termal kamera taraması', total: 4800, validUntil: iso(-8), status: 'rejected', sentAt: iso(-14), customerComment: 'Bu yıl bütçemizde yok.' },
];
export const listCpQuotes = async (): Promise<CpQuoteCard[]> => {
  const raw = await AsyncStorage.getItem(K.quotes);
  if (!raw) { await AsyncStorage.setItem(K.quotes, JSON.stringify(SEED_QUOTES)); return SEED_QUOTES; }
  try { return JSON.parse(raw); } catch { return SEED_QUOTES; }
};
export const updateCpQuoteStatus = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
  const list = await listCpQuotes();
  const next = list.map(q => q.id === id ? { ...q, status, customerComment: comment } : q);
  await AsyncStorage.setItem(K.quotes, JSON.stringify(next));
};

// ---------- Work Orders ----------
const SEED_WO: CpWorkOrderProgress[] = [
  { id: 'w1', number: 'IE-2024-082', title: 'Aylık trafo bakımı', status: 'in_progress', progressPct: 65, assignedTo: 'Ali Yılmaz', scheduledAt: iso(0), location: 'Ana TR-001',
    steps: [{ label: 'Yola çıkıldı', done: true }, { label: 'Sahaya varış', done: true }, { label: 'Bakım uygulanıyor', done: true }, { label: 'Test', done: false }, { label: 'Rapor', done: false }] },
  { id: 'w2', number: 'IE-2024-083', title: 'Pano kontrol', status: 'planned', progressPct: 0, assignedTo: 'Ayşe Kaya', scheduledAt: iso(2), location: 'Pano PN-014',
    steps: [{ label: 'Planlandı', done: true }, { label: 'Yola çıkış', done: false }, { label: 'Saha', done: false }, { label: 'Rapor', done: false }] },
  { id: 'w3', number: 'IE-2024-079', title: 'GES inverter onarımı', status: 'awaiting_signature', progressPct: 95, assignedTo: 'Hakan Çelik', scheduledAt: iso(-1), location: 'GES Saha',
    steps: [{ label: 'Saha', done: true }, { label: 'Onarım', done: true }, { label: 'Test', done: true }, { label: 'İmza bekleniyor', done: false }] },
];
export const listCpWorkOrders = async (): Promise<CpWorkOrderProgress[]> => {
  const raw = await AsyncStorage.getItem(K.wo);
  if (!raw) { await AsyncStorage.setItem(K.wo, JSON.stringify(SEED_WO)); return SEED_WO; }
  try { return JSON.parse(raw); } catch { return SEED_WO; }
};

// ---------- Service Requests ----------
const SEED_REQ: CpServiceRequest[] = [
  { id: 'r1', title: 'Pano arızası', description: 'Üretim hattında ana pano arıza veriyor.', urgency: 'critical', status: 'in_review', createdAt: iso(-1) },
  { id: 'r2', title: 'Periyodik bakım talebi', description: 'Bu ay trafo bakımı planlanmalı.', urgency: 'normal', status: 'scheduled', createdAt: iso(-3), scheduledAt: iso(5) },
  { id: 'r3', title: 'Sayaç okuma anomalisi', description: 'Bu ay tüketim normalin %30 üstünde.', urgency: 'high', status: 'closed', createdAt: iso(-10), closedAt: iso(-7) },
];
export const listCpRequests = async (): Promise<CpServiceRequest[]> => {
  const raw = await AsyncStorage.getItem(K.req);
  if (!raw) { await AsyncStorage.setItem(K.req, JSON.stringify(SEED_REQ)); return SEED_REQ; }
  try { return JSON.parse(raw); } catch { return SEED_REQ; }
};
export const createCpRequest = async (data: { title: string; description: string; urgency: CpRequestUrgency }) => {
  const list = await listCpRequests();
  const r: CpServiceRequest = { id: 'r' + Date.now(), status: 'new', createdAt: now(), ...data };
  const next = [r, ...list];
  await AsyncStorage.setItem(K.req, JSON.stringify(next));
  return r;
};

// ---------- Documents ----------
const SEED_DOCS: CpDocumentItem[] = [
  { id: 'd1', kind: 'invoice', title: 'Fatura - Aralık 2024', sizeKb: 142, uploadedAt: iso(-1), unread: true },
  { id: 'd2', kind: 'report', title: 'Aylık bakım raporu', sizeKb: 856, uploadedAt: iso(-3), unread: true },
  { id: 'd3', kind: 'quote', title: 'TKL-2024-019 GES inverter', sizeKb: 232, uploadedAt: iso(-4), unread: true },
  { id: 'd4', kind: 'photo', title: 'Saha fotoğrafları (12)', sizeKb: 4320, uploadedAt: iso(-5), unread: false },
  { id: 'd5', kind: 'certificate', title: 'Topraklama ölçüm sertifikası', sizeKb: 89, uploadedAt: iso(-15), unread: false },
  { id: 'd6', kind: 'contract', title: 'Yıllık servis sözleşmesi 2024', sizeKb: 412, uploadedAt: iso(-30), unread: false },
  { id: 'd7', kind: 'invoice', title: 'Fatura - Kasım 2024', sizeKb: 138, uploadedAt: iso(-32), unread: true },
  { id: 'd8', kind: 'report', title: 'Termal kamera tarama', sizeKb: 1240, uploadedAt: iso(-45), unread: true },
];
export const listCpDocuments = async (): Promise<CpDocumentItem[]> => {
  const raw = await AsyncStorage.getItem(K.docs);
  if (!raw) { await AsyncStorage.setItem(K.docs, JSON.stringify(SEED_DOCS)); return SEED_DOCS; }
  try { return JSON.parse(raw); } catch { return SEED_DOCS; }
};

// ---------- Satisfaction ----------
const SEED_SAT: CpSatisfactionEntry[] = [
  { id: 's1', workOrderTitle: 'Trafo bakımı Kasım', rating: 5, comment: 'Çok hızlı ve düzenli çalıştılar.', createdAt: iso(-5), category: 'praise' },
  { id: 's2', workOrderTitle: 'GES temizliği', rating: 4, comment: 'Genel olarak iyi, raporlama gecikti.', createdAt: iso(-12), category: 'neutral' },
  { id: 's3', workOrderTitle: 'Acil arıza müdahalesi', rating: 2, comment: '2 saatten geç geldiler, faturalama sorunlu.', createdAt: iso(-20), category: 'complaint' },
  { id: 's4', workOrderTitle: 'Pano kontrolü', rating: 5, comment: 'Mükemmel.', createdAt: iso(-30), category: 'praise' },
  { id: 's5', workOrderTitle: 'Sayaç okuma', rating: 5, createdAt: iso(-40), category: 'praise' },
];
export const listCpSatisfaction = async (): Promise<CpSatisfactionEntry[]> => {
  const raw = await AsyncStorage.getItem(K.sat);
  if (!raw) { await AsyncStorage.setItem(K.sat, JSON.stringify(SEED_SAT)); return SEED_SAT; }
  try { return JSON.parse(raw); } catch { return SEED_SAT; }
};

// ---------- Notifications ----------
const SEED_NOTIF: CpNotification[] = [
  { id: 'n1', category: 'quote', title: 'Yeni teklif aldınız', body: 'TKL-2024-019 GES inverter değişimi', read: false, createdAt: iso(-1) },
  { id: 'n2', category: 'workorder', title: 'İş emri başladı', body: 'IE-2024-082 trafo bakımı sahada.', read: false, createdAt: iso(0) },
  { id: 'n3', category: 'invoice', title: 'Yeni fatura', body: 'Aralık 2024 faturanız hazırlandı.', read: false, createdAt: iso(-1) },
  { id: 'n4', category: 'report', title: 'Aylık rapor hazır', body: 'Kasım 2024 servis raporunuz.', read: true, createdAt: iso(-3) },
  { id: 'n5', category: 'system', title: 'Şifre değişikliği', body: 'Hesap şifreniz başarıyla değiştirildi.', read: true, createdAt: iso(-10) },
];
export const listCpNotifications = async (): Promise<CpNotification[]> => {
  const raw = await AsyncStorage.getItem(K.notif);
  if (!raw) { await AsyncStorage.setItem(K.notif, JSON.stringify(SEED_NOTIF)); return SEED_NOTIF; }
  try { return JSON.parse(raw); } catch { return SEED_NOTIF; }
};
export const markCpNotificationRead = async (id: string) => {
  const list = await listCpNotifications();
  await AsyncStorage.setItem(K.notif, JSON.stringify(list.map(n => n.id === id ? { ...n, read: true } : n)));
};

// ---------- Branding ----------
const SEED_BRAND: CpBrandingConfig = {
  brandName: 'SahaTakip Müşteri Portalı',
  primaryColor: '#0ea5e9',
  secondaryColor: '#22c55e',
  logoEmoji: '⚡',
  greeting: 'Hoş geldiniz, sahanız bizim önceliğimiz.',
  footerText: '© 2024 SahaTakip · Tüm hakları saklıdır.',
};
export const getCpBranding = async (): Promise<CpBrandingConfig> => {
  const raw = await AsyncStorage.getItem(K.brand);
  if (!raw) { await AsyncStorage.setItem(K.brand, JSON.stringify(SEED_BRAND)); return SEED_BRAND; }
  try { return JSON.parse(raw); } catch { return SEED_BRAND; }
};
export const updateCpBranding = async (b: CpBrandingConfig) => AsyncStorage.setItem(K.brand, JSON.stringify(b));

// ---------- Security ----------
const SEED_SEC: CpShareLinkSecurityPolicy = {
  defaultExpiryHours: 72, requirePassword: false, watermarkPdfs: true, logAllAccess: true,
  maxDownloads: 10, ipRestriction: false,
  recentLogs: [
    { id: 'l1', resource: 'TKL-2024-019', viewerIp: '85.97.x.x', at: iso(-0.04), action: 'view' },
    { id: 'l2', resource: 'TKL-2024-019', viewerIp: '85.97.x.x', at: iso(-0.05), action: 'download' },
    { id: 'l3', resource: 'IE-2024-082 raporu', viewerIp: '188.45.x.x', at: iso(-1), action: 'view' },
    { id: 'l4', resource: 'Fatura Kasım 2024', viewerIp: '94.123.x.x', at: iso(-2), action: 'fail' },
    { id: 'l5', resource: 'Bakım raporu Ekim', viewerIp: '85.97.x.x', at: iso(-5), action: 'view' },
  ],
};
export const getCpSecurity = async (): Promise<CpShareLinkSecurityPolicy> => {
  const raw = await AsyncStorage.getItem(K.sec);
  if (!raw) { await AsyncStorage.setItem(K.sec, JSON.stringify(SEED_SEC)); return SEED_SEC; }
  try { return JSON.parse(raw); } catch { return SEED_SEC; }
};
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
