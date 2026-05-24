// Faz 39 — Kurumsal Entegrasyonlar servisi (mock/local) — POZ-DEV-451..
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ErpVendor, IntegrationStatus, ErpConnection, ErpSyncJob, ErpEntityKind, SyncDirection,
  ErpCustomerMapping, ErpStockMapping, ErpInvoiceDraft, QuoteOrderConversion,
  CrmConnection, CrmProvider, IntegrationWebhook, WebhookDelivery,
  IntegrationApiKey, ApiUsageLog, IntegrationErrorLog, IntegrationHealth,
} from '../types';

const K = {
  conn: 'erp_conn_v1',
  jobs: 'erp_jobs_v1',
  cust: 'erp_customers_v1',
  stock: 'erp_stock_v1',
  inv: 'erp_invoices_v1',
  ord: 'erp_quote_orders_v1',
  crm: 'int_crm_v1',
  wh: 'int_wh_v1',
  whd: 'int_whd_v1',
  ak: 'int_ak_v1',
  akl: 'int_akl_v1',
  err: 'int_errs_v1',
  hl: 'int_health_v1',
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => new Date().toISOString();
const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]) => arr[rand(arr.length)];

async function load<T>(key: string): Promise<T[]> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function save<T>(key: string, list: T[]) { await AsyncStorage.setItem(key, JSON.stringify(list)); }

export const ERP_VENDOR_LABEL: Record<ErpVendor, string> = { logo: 'Logo', mikro: 'Mikro', netsis: 'Netsis', custom: 'Özel' };
export const ERP_VENDOR_COLOR: Record<ErpVendor, string> = { logo: '#ef4444', mikro: '#0ea5e9', netsis: '#22c55e', custom: '#a855f7' };
export const STATUS_LABEL: Record<IntegrationStatus, string> = { connected: 'Bağlı', disconnected: 'Bağlı değil', error: 'Hata', pending: 'Beklemede' };
export const STATUS_COLOR: Record<IntegrationStatus, string> = { connected: '#22c55e', disconnected: '#64748b', error: '#ef4444', pending: '#f59e0b' };
export const ENTITY_LABEL: Record<ErpEntityKind, string> = { customer: 'Cari', stock: 'Stok', invoice: 'Fatura', order: 'Sipariş' };
export const DIRECTION_LABEL: Record<SyncDirection, string> = { pull: 'Çekme', push: 'Gönderme', bidirectional: 'İki yönlü' };
export const CRM_LABEL: Record<CrmProvider, string> = { hubspot: 'HubSpot', salesforce: 'Salesforce', zoho: 'Zoho', pipedrive: 'Pipedrive', custom: 'Özel' };
export const SEVERITY_COLOR = { info: '#0ea5e9', warning: '#f59e0b', error: '#ef4444', critical: '#dc2626' } as const;

// ---------- ERP Connections ----------
async function ensureSeedConn() {
  const list = await load<ErpConnection>(K.conn);
  if (list.length) return list;
  const seed: ErpConnection[] = [
    { id: uid(), vendor: 'logo', name: 'Logo Tiger 3', baseUrl: 'https://logo.local/api', status: 'connected', lastSyncAt: now(), createdAt: now() },
    { id: uid(), vendor: 'mikro', name: 'Mikro Fly', baseUrl: 'https://mikro.local/api', status: 'pending', createdAt: now() },
    { id: uid(), vendor: 'netsis', name: 'Netsis ERP', baseUrl: 'https://netsis.local/api', status: 'error', lastError: 'Yetkilendirme hatası', createdAt: now() },
  ];
  await save(K.conn, seed); return seed;
}
export async function listConnections(): Promise<ErpConnection[]> { return ensureSeedConn(); }
export async function saveConnection(c: Partial<ErpConnection>): Promise<ErpConnection> {
  const list = await ensureSeedConn();
  if (c.id) {
    const i = list.findIndex(x => x.id === c.id);
    if (i >= 0) { list[i] = { ...list[i], ...c } as ErpConnection; await save(K.conn, list); return list[i]; }
  }
  const created: ErpConnection = {
    id: uid(),
    vendor: c.vendor || 'custom',
    name: c.name || 'Yeni Bağlantı',
    baseUrl: c.baseUrl,
    apiKey: c.apiKey,
    status: c.status || 'pending',
    createdAt: now(),
  };
  list.unshift(created); await save(K.conn, list); return created;
}
export async function deleteConnection(id: string) {
  const list = await load<ErpConnection>(K.conn);
  await save(K.conn, list.filter(x => x.id !== id));
}
export async function testConnection(id: string): Promise<IntegrationStatus> {
  const list = await load<ErpConnection>(K.conn);
  const i = list.findIndex(x => x.id === id);
  if (i < 0) return 'error';
  const ok = Math.random() > 0.25;
  list[i] = { ...list[i], status: ok ? 'connected' : 'error', lastSyncAt: now(), lastError: ok ? undefined : 'Bağlantı başarısız' };
  await save(K.conn, list); return list[i].status;
}

// ---------- ERP Sync Jobs ----------
export async function listSyncJobs(): Promise<ErpSyncJob[]> { return load<ErpSyncJob>(K.jobs); }
export async function startSyncJob(connectionId: string, entity: ErpEntityKind, direction: SyncDirection = 'pull'): Promise<ErpSyncJob> {
  const conns = await load<ErpConnection>(K.conn);
  const conn = conns.find(c => c.id === connectionId);
  const total = 20 + rand(80);
  const fail = rand(5);
  const ok = total - fail;
  const job: ErpSyncJob = {
    id: uid(), connectionId, vendor: conn?.vendor || 'custom', entity, direction,
    status: 'success',
    startedAt: now(), finishedAt: now(),
    itemsTotal: total, itemsOk: ok, itemsFail: fail,
    errorMessage: fail > 0 ? `${fail} satır eşleşmedi` : undefined,
  };
  const list = await load<ErpSyncJob>(K.jobs);
  list.unshift(job);
  await save(K.jobs, list.slice(0, 200));
  return job;
}

// ---------- ERP Customer Mapping ----------
async function ensureSeedCust() {
  const list = await load<ErpCustomerMapping>(K.cust);
  if (list.length) return list;
  const names = ['ABC Soğutma', 'Mavi Tesisat', 'Akın Endüstri', 'Yıldız Otomasyon', 'Demir Bakım', 'Çelik Klima'];
  const seed: ErpCustomerMapping[] = names.map((n, i) => ({
    id: uid(), vendor: pick<ErpVendor>(['logo', 'mikro', 'netsis']),
    externalCode: `CARI-${1000 + i}`, localCustomerId: `cust-${i + 1}`,
    customerName: n, syncedAt: now(),
  }));
  await save(K.cust, seed); return seed;
}
export async function listErpCustomers(): Promise<ErpCustomerMapping[]> { return ensureSeedCust(); }
export async function resetErpCustomers() { await AsyncStorage.removeItem(K.cust); }

// ---------- ERP Stock Mapping ----------
async function ensureSeedStock() {
  const list = await load<ErpStockMapping>(K.stock);
  if (list.length) return list;
  const items = [
    { sku: 'KMP-01', name: 'Kompresör 5HP', unit: 'adet' },
    { sku: 'GAZ-R32', name: 'Soğutucu R32', unit: 'kg' },
    { sku: 'BAK-1/2', name: 'Bakır Boru 1/2"', unit: 'm' },
    { sku: 'FAN-12', name: 'Fan Motoru 12"', unit: 'adet' },
    { sku: 'FILT-30', name: 'Hava Filtresi 30x30', unit: 'adet' },
  ];
  const seed: ErpStockMapping[] = items.map((it, i) => ({
    id: uid(), vendor: pick<ErpVendor>(['logo', 'mikro', 'netsis']),
    externalCode: `STK-${2000 + i}`, sku: it.sku, name: it.name, unit: it.unit,
    stockQty: 5 + rand(200), unitPrice: 100 + rand(5000), syncedAt: now(),
  }));
  await save(K.stock, seed); return seed;
}
export async function listErpStock(): Promise<ErpStockMapping[]> { return ensureSeedStock(); }
export async function resetErpStock() { await AsyncStorage.removeItem(K.stock); }

// ---------- Invoice Drafts ----------
export async function listInvoiceDrafts(): Promise<ErpInvoiceDraft[]> { return load<ErpInvoiceDraft>(K.inv); }
export async function createInvoiceDraft(payload: Partial<ErpInvoiceDraft>): Promise<ErpInvoiceDraft> {
  const list = await load<ErpInvoiceDraft>(K.inv);
  const inv: ErpInvoiceDraft = {
    id: uid(), vendor: payload.vendor || 'logo',
    customerCode: payload.customerCode || `CARI-${1000 + rand(50)}`,
    customerName: payload.customerName || 'Müşteri',
    totalAmount: payload.totalAmount ?? 1000 + rand(50000),
    currency: payload.currency || 'TRY',
    status: 'draft',
    lineCount: payload.lineCount ?? 1 + rand(8),
    createdAt: now(),
  };
  list.unshift(inv); await save(K.inv, list.slice(0, 200)); return inv;
}
export async function sendInvoiceDraft(id: string) {
  const list = await load<ErpInvoiceDraft>(K.inv);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], status: Math.random() > 0.2 ? 'sent' : 'rejected', externalId: `EXT-${rand(99999)}` };
    await save(K.inv, list);
  }
}

// ---------- Quote → Order ----------
export async function listQuoteOrders(): Promise<QuoteOrderConversion[]> { return load<QuoteOrderConversion>(K.ord); }
export async function convertQuoteToOrder(quoteId: string, customerName: string, amount: number, vendor: ErpVendor = 'logo'): Promise<QuoteOrderConversion> {
  const list = await load<QuoteOrderConversion>(K.ord);
  const conv: QuoteOrderConversion = {
    id: uid(), quoteId, customerName,
    orderNumber: `ORD-${10000 + rand(89999)}`,
    totalAmount: amount, vendor, createdAt: now(),
    status: Math.random() > 0.15 ? 'created' : 'failed',
  };
  list.unshift(conv); await save(K.ord, list.slice(0, 200)); return conv;
}

// ---------- CRM ----------
async function ensureSeedCrm() {
  const list = await load<CrmConnection>(K.crm);
  if (list.length) return list;
  const seed: CrmConnection[] = [
    { id: uid(), provider: 'hubspot', name: 'HubSpot Marketing', status: 'connected', lastSyncAt: now(), importedContacts: 124 },
    { id: uid(), provider: 'salesforce', name: 'Salesforce CRM', status: 'pending', importedContacts: 0 },
  ];
  await save(K.crm, seed); return seed;
}
export async function listCrmConnections(): Promise<CrmConnection[]> { return ensureSeedCrm(); }
export async function saveCrmConnection(c: Partial<CrmConnection>): Promise<CrmConnection> {
  const list = await ensureSeedCrm();
  if (c.id) {
    const i = list.findIndex(x => x.id === c.id);
    if (i >= 0) { list[i] = { ...list[i], ...c } as CrmConnection; await save(K.crm, list); return list[i]; }
  }
  const created: CrmConnection = {
    id: uid(), provider: c.provider || 'custom', name: c.name || 'CRM',
    apiKey: c.apiKey, status: c.status || 'pending', importedContacts: 0,
  };
  list.unshift(created); await save(K.crm, list); return created;
}
export async function deleteCrmConnection(id: string) {
  const list = await load<CrmConnection>(K.crm);
  await save(K.crm, list.filter(x => x.id !== id));
}
export async function importCrmContacts(id: string) {
  const list = await load<CrmConnection>(K.crm);
  const i = list.findIndex(x => x.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], status: 'connected', lastSyncAt: now(), importedContacts: list[i].importedContacts + 10 + rand(40) };
  await save(K.crm, list);
}

// ---------- Webhooks ----------
const WH_EVENTS = ['quote.created', 'workorder.completed', 'invoice.sent', 'customer.updated', 'payment.received'];
export const WEBHOOK_EVENTS = WH_EVENTS;

async function ensureSeedWh() {
  const list = await load<IntegrationWebhook>(K.wh);
  if (list.length) return list;
  const seed: IntegrationWebhook[] = [
    { id: uid(), name: 'Slack Bildirimi', url: 'https://hooks.slack.com/test', event: 'workorder.completed', isActive: true, createdAt: now(), failureCount: 0 },
    { id: uid(), name: 'CRM Sync', url: 'https://crm.example.com/hook', event: 'customer.updated', isActive: true, createdAt: now(), failureCount: 2 },
  ];
  await save(K.wh, seed); return seed;
}
export async function listWebhooksV2(): Promise<IntegrationWebhook[]> { return ensureSeedWh(); }
export async function saveWebhookV2(w: Partial<IntegrationWebhook>): Promise<IntegrationWebhook> {
  const list = await ensureSeedWh();
  if (w.id) {
    const i = list.findIndex(x => x.id === w.id);
    if (i >= 0) { list[i] = { ...list[i], ...w } as IntegrationWebhook; await save(K.wh, list); return list[i]; }
  }
  const created: IntegrationWebhook = {
    id: uid(), name: w.name || 'Yeni Webhook', url: w.url || 'https://', event: w.event || WH_EVENTS[0],
    secret: w.secret, isActive: w.isActive ?? true, createdAt: now(), failureCount: 0,
  };
  list.unshift(created); await save(K.wh, list); return created;
}
export async function deleteWebhookV2(id: string) {
  const list = await load<IntegrationWebhook>(K.wh);
  await save(K.wh, list.filter(x => x.id !== id));
}
export async function toggleWebhookV2(id: string) {
  const list = await load<IntegrationWebhook>(K.wh);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) { list[i] = { ...list[i], isActive: !list[i].isActive }; await save(K.wh, list); }
}
export async function triggerWebhookV2(id: string): Promise<WebhookDelivery> {
  const ws = await load<IntegrationWebhook>(K.wh);
  const w = ws.find(x => x.id === id);
  const ok = Math.random() > 0.2;
  const delivery: WebhookDelivery = {
    id: uid(), webhookId: id, event: w?.event || 'unknown',
    payload: JSON.stringify({ test: true, ts: Date.now() }),
    httpStatus: ok ? 200 : 500,
    responseBody: ok ? 'OK' : 'Internal Server Error',
    durationMs: 50 + rand(500),
    deliveredAt: now(), success: ok,
  };
  const dlist = await load<WebhookDelivery>(K.whd);
  dlist.unshift(delivery);
  await save(K.whd, dlist.slice(0, 300));
  if (w) {
    const i = ws.findIndex(x => x.id === id);
    ws[i] = { ...w, lastTriggeredAt: now(), failureCount: ok ? w.failureCount : w.failureCount + 1 };
    await save(K.wh, ws);
  }
  return delivery;
}
export async function listWebhookDeliveriesV2(webhookId?: string): Promise<WebhookDelivery[]> {
  const all = await load<WebhookDelivery>(K.whd);
  return webhookId ? all.filter(d => d.webhookId === webhookId) : all;
}

// ---------- API Keys ----------
async function ensureSeedApiKeys() {
  const list = await load<IntegrationApiKey>(K.ak);
  if (list.length) return list;
  const seed: IntegrationApiKey[] = [
    { id: uid(), name: 'Mobile App', key: 'sk_' + uid().slice(0, 24), scopes: ['read', 'write'], createdAt: now(), isActive: true, usageCount: 124, lastUsedAt: now() },
    { id: uid(), name: 'External Integration', key: 'sk_' + uid().slice(0, 24), scopes: ['read'], createdAt: now(), isActive: true, usageCount: 12 },
  ];
  await save(K.ak, seed); return seed;
}
export async function listApiKeysV2(): Promise<IntegrationApiKey[]> { return ensureSeedApiKeys(); }
export async function createApiKeyV2(name: string, scopes: string[]): Promise<IntegrationApiKey> {
  const list = await ensureSeedApiKeys();
  const k: IntegrationApiKey = { id: uid(), name, key: 'sk_' + uid() + uid().slice(0, 8), scopes, createdAt: now(), isActive: true, usageCount: 0 };
  list.unshift(k); await save(K.ak, list); return k;
}
export async function revokeApiKeyV2(id: string) {
  const list = await load<IntegrationApiKey>(K.ak);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) { list[i] = { ...list[i], isActive: false }; await save(K.ak, list); }
}
export async function deleteApiKeyV2(id: string) {
  const list = await load<IntegrationApiKey>(K.ak);
  await save(K.ak, list.filter(x => x.id !== id));
}

// ---------- API Usage Logs ----------
async function ensureSeedApiLogs() {
  const list = await load<ApiUsageLog>(K.akl);
  if (list.length) return list;
  const endpoints = ['/api/quotes', '/api/workorders', '/api/customers', '/api/invoices', '/api/stock'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const seed: ApiUsageLog[] = Array.from({ length: 40 }, () => ({
    id: uid(),
    endpoint: pick(endpoints),
    method: pick(methods),
    statusCode: Math.random() > 0.1 ? 200 : pick([400, 401, 404, 500]),
    durationMs: 20 + rand(800),
    ip: `192.168.${rand(255)}.${rand(255)}`,
    occurredAt: new Date(Date.now() - rand(7 * 86400000)).toISOString(),
  }));
  await save(K.akl, seed); return seed;
}
export async function listApiUsageLogs(): Promise<ApiUsageLog[]> { return ensureSeedApiLogs(); }
export async function resetApiUsageLogs() { await AsyncStorage.removeItem(K.akl); }

// ---------- Integration Errors ----------
async function ensureSeedErrors() {
  const list = await load<IntegrationErrorLog>(K.err);
  if (list.length) return list;
  const sources = ['Logo ERP', 'Mikro ERP', 'HubSpot CRM', 'IntegrationWebhook: Slack', 'Stripe API'];
  const messages = ['Bağlantı zaman aşımı', 'Yetkilendirme hatası', 'Veri formatı hatalı', 'Servis 5xx yanıtladı', 'Hız sınırı aşıldı'];
  const sevs = ['info', 'warning', 'error', 'critical'] as const;
  const seed: IntegrationErrorLog[] = Array.from({ length: 12 }, () => ({
    id: uid(), source: pick([...sources]), message: pick([...messages]),
    severity: pick([...sevs]),
    occurredAt: new Date(Date.now() - rand(14 * 86400000)).toISOString(),
    resolved: Math.random() > 0.5,
  }));
  await save(K.err, seed); return seed;
}
export async function listIntegrationErrors(): Promise<IntegrationErrorLog[]> { return ensureSeedErrors(); }
export async function resolveIntegrationError(id: string) {
  const list = await load<IntegrationErrorLog>(K.err);
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) { list[i] = { ...list[i], resolved: true }; await save(K.err, list); }
}
export async function resetIntegrationErrors() { await AsyncStorage.removeItem(K.err); }

// ---------- Health ----------
export async function listIntegrationHealth(): Promise<IntegrationHealth[]> {
  const list = await load<IntegrationHealth>(K.hl);
  if (list.length) return list;
  const services = ['Logo ERP', 'Mikro ERP', 'Netsis ERP', 'HubSpot CRM', 'Salesforce CRM', 'Stripe', 'SMS Gateway', 'E-posta Servisi'];
  const statuses: IntegrationStatus[] = ['connected', 'connected', 'connected', 'error', 'pending'];
  const seed: IntegrationHealth[] = services.map(s => ({
    id: uid(), service: s,
    status: pick(statuses),
    latencyMs: 50 + rand(800),
    uptimePct: 90 + rand(10),
    checkedAt: now(),
  }));
  await save(K.hl, seed); return seed;
}
export async function refreshHealth() {
  await AsyncStorage.removeItem(K.hl);
  return listIntegrationHealth();
}
