// integrations service — Supabase bağlı; AsyncStorage offline cache olarak kullanılır
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { ApiKey, ApiKeyScope, ErpAdapter, ErpProvider, ImportError, ImportResult, ImportType, Webhook, WebhookEvent } from '../types';

const KEY_API = '@SahaTakip:api_keys';
const KEY_WH = '@SahaTakip:webhooks';
const KEY_ERP = '@SahaTakip:erp_adapters';
const KEY_IMPORTS = '@SahaTakip:import_history';

// ---- snake/camel mappers ----
function apiKeyFromRow(r: any): ApiKey {
  return { id: r.id, label: r.label, key: r.key, scopes: r.scopes || [], active: !!r.active, createdAt: r.created_at, lastUsedAt: r.last_used_at || undefined, expiresAt: r.expires_at || undefined };
}
function apiKeyToRow(k: ApiKey) {
  return { id: k.id, label: k.label, key: k.key, scopes: k.scopes, active: k.active, created_at: k.createdAt, last_used_at: k.lastUsedAt || null, expires_at: k.expiresAt || null };
}
function webhookFromRow(r: any): Webhook {
  return { id: r.id, label: r.label, url: r.url, events: r.events || [], secret: r.secret || undefined, active: !!r.active, createdAt: r.created_at, lastDeliveryAt: r.last_delivery_at || undefined, lastStatus: r.last_status || undefined, lastError: r.last_error || undefined };
}
function webhookToRow(w: Webhook) {
  return { id: w.id, label: w.label, url: w.url, events: w.events, secret: w.secret || null, active: w.active, created_at: w.createdAt, last_delivery_at: w.lastDeliveryAt || null, last_status: w.lastStatus || null, last_error: w.lastError || null };
}
function erpFromRow(r: any): ErpAdapter {
  return { id: r.id, provider: r.provider, label: r.label, baseUrl: r.base_url || undefined, apiKey: r.api_key || undefined, username: r.username || undefined, active: !!r.active, syncCustomers: !!r.sync_customers, syncInvoices: !!r.sync_invoices, syncProducts: !!r.sync_products, createdAt: r.created_at, lastSyncAt: r.last_sync_at || undefined, lastSyncStatus: r.last_sync_status || undefined };
}
function erpToRow(a: ErpAdapter) {
  return { id: a.id, provider: a.provider, label: a.label, base_url: a.baseUrl || null, api_key: a.apiKey || null, username: a.username || null, active: a.active, sync_customers: a.syncCustomers, sync_invoices: a.syncInvoices, sync_products: a.syncProducts, created_at: a.createdAt, last_sync_at: a.lastSyncAt || null, last_sync_status: a.lastSyncStatus || null };
}
function importFromRow(r: any): ImportResult {
  return { type: r.type, rowsTotal: r.rows_total, rowsImported: r.rows_imported, rowsSkipped: r.rows_skipped, errors: r.errors || [], importedAt: r.imported_at };
}

export const SCOPE_LABEL_TR: Record<ApiKeyScope, string> = {
  read: 'Okuma',
  write: 'Yazma',
  admin: 'Yönetici',
};

export const WEBHOOK_EVENT_LABEL: Record<WebhookEvent, string> = {
  'work_order.created': 'İş emri oluşturuldu',
  'work_order.completed': 'İş emri tamamlandı',
  'quote.created': 'Teklif oluşturuldu',
  'quote.accepted': 'Teklif kabul edildi',
  'quote.rejected': 'Teklif reddedildi',
  'payment.received': 'Tahsilat alındı',
  'inspection.failed': 'Denetim başarısız',
  'anomaly.detected': 'Anomali tespit edildi',
};

export const WEBHOOK_EVENTS: WebhookEvent[] = Object.keys(WEBHOOK_EVENT_LABEL) as WebhookEvent[];

export const ERP_PROVIDER_LABEL: Record<ErpProvider, string> = {
  logo: 'Logo',
  netsis: 'Netsis',
  mikro: 'Mikro',
  custom: 'Özel',
};

export const ERP_PROVIDER_COLOR: Record<ErpProvider, string> = {
  logo: '#dc2626',
  netsis: '#0ea5e9',
  mikro: '#16a34a',
  custom: '#8b5cf6',
};

function rid(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).slice(2, 10);
}

function makeKey(): string {
  // sk_live_<32 hex>
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return 'sk_live_' + hex;
}

// ---- ApiKey CRUD ----
export async function listApiKeys(): Promise<ApiKey[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(apiKeyFromRow);
        await AsyncStorage.setItem(KEY_API, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try { const raw = await AsyncStorage.getItem(KEY_API); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveApiKeys(list: ApiKey[]): Promise<void> { await AsyncStorage.setItem(KEY_API, JSON.stringify(list)); }
export async function createApiKey(input: { label: string; scopes: ApiKeyScope[]; expiresAt?: string }): Promise<ApiKey> {
  const k: ApiKey = { id: rid('ak'), key: makeKey(), label: input.label, scopes: input.scopes, expiresAt: input.expiresAt, active: true, createdAt: new Date().toISOString() };
  if (SUPABASE_CONFIGURED) {
    try { await supabase.from('api_keys').insert(apiKeyToRow(k)); } catch { /* offline */ }
  }
  const list = await listApiKeys();
  const next = [k, ...list.filter(x => x.id !== k.id)];
  await saveApiKeys(next);
  return k;
}
export async function revokeApiKey(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('api_keys').update({ active: false }).eq('id', id); } catch { /* offline */ } }
  const list = await listApiKeys();
  const next = list.map(k => k.id === id ? { ...k, active: false } : k);
  await saveApiKeys(next);
}
export async function deleteApiKey(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('api_keys').delete().eq('id', id); } catch { /* offline */ } }
  const list = await listApiKeys();
  await saveApiKeys(list.filter(k => k.id !== id));
}

// ---- Webhook CRUD ----
export async function listWebhooks(): Promise<Webhook[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(webhookFromRow);
        await AsyncStorage.setItem(KEY_WH, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try { const raw = await AsyncStorage.getItem(KEY_WH); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveWebhooks(list: Webhook[]): Promise<void> { await AsyncStorage.setItem(KEY_WH, JSON.stringify(list)); }
export async function upsertWebhook(w: Webhook): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('webhooks').upsert(webhookToRow(w)); } catch { /* offline */ } }
  const list = await listWebhooks();
  const idx = list.findIndex(x => x.id === w.id);
  if (idx >= 0) list[idx] = w; else list.unshift(w);
  await saveWebhooks(list);
}
export async function deleteWebhook(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('webhooks').delete().eq('id', id); } catch { /* offline */ } }
  const list = await listWebhooks();
  await saveWebhooks(list.filter(w => w.id !== id));
}
export function makeWebhook(input: { label: string; url: string; events: WebhookEvent[]; secret?: string }): Webhook {
  return { id: rid('wh'), label: input.label, url: input.url, events: input.events, secret: input.secret, active: true, createdAt: new Date().toISOString() };
}

export async function testWebhook(w: Webhook): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const body = JSON.stringify({ event: 'ping', testedAt: new Date().toISOString(), label: w.label });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (w.secret) headers['X-SahaTakip-Secret'] = w.secret;
    const res = await fetch(w.url, { method: 'POST', headers, body });
    const updated: Webhook = { ...w, lastDeliveryAt: new Date().toISOString(), lastStatus: res.ok ? 'success' : 'failed', lastError: res.ok ? undefined : `HTTP ${res.status}` };
    await upsertWebhook(updated);
    return { ok: res.ok, status: res.status };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const updated: Webhook = { ...w, lastDeliveryAt: new Date().toISOString(), lastStatus: 'failed', lastError: msg };
    await upsertWebhook(updated);
    return { ok: false, error: msg };
  }
}

// ---- ERP Adapter CRUD ----
export async function listErpAdapters(): Promise<ErpAdapter[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('erp_adapters').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(erpFromRow);
        await AsyncStorage.setItem(KEY_ERP, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try { const raw = await AsyncStorage.getItem(KEY_ERP); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveErpAdapters(list: ErpAdapter[]): Promise<void> { await AsyncStorage.setItem(KEY_ERP, JSON.stringify(list)); }
export async function upsertErpAdapter(a: ErpAdapter): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('erp_adapters').upsert(erpToRow(a)); } catch { /* offline */ } }
  const list = await listErpAdapters();
  const idx = list.findIndex(x => x.id === a.id);
  if (idx >= 0) list[idx] = a; else list.unshift(a);
  await saveErpAdapters(list);
}
export async function deleteErpAdapter(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) { try { await supabase.from('erp_adapters').delete().eq('id', id); } catch { /* offline */ } }
  const list = await listErpAdapters();
  await saveErpAdapters(list.filter(a => a.id !== id));
}
export function makeErpAdapter(input: { provider: ErpProvider; label: string; baseUrl?: string; apiKey?: string; username?: string }): ErpAdapter {
  return {
    id: rid('erp'),
    provider: input.provider,
    label: input.label,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    username: input.username,
    active: true,
    syncCustomers: true,
    syncInvoices: true,
    syncProducts: false,
    createdAt: new Date().toISOString(),
  };
}

export async function mockSyncErp(id: string): Promise<{ ok: boolean }> {
  const now = new Date().toISOString();
  if (SUPABASE_CONFIGURED) {
    try { await supabase.from('erp_adapters').update({ last_sync_at: now, last_sync_status: 'success' }).eq('id', id); } catch { /* offline */ }
  }
  const list = await listErpAdapters();
  const next = list.map(a => a.id === id ? { ...a, lastSyncAt: now, lastSyncStatus: 'success' as const } : a);
  await saveErpAdapters(next);
  return { ok: true };
}

// ---- Excel/CSV Import ----
export interface ImportFieldSpec { key: string; label: string; required?: boolean }

export const IMPORT_FIELDS: Record<ImportType, ImportFieldSpec[]> = {
  customers: [
    { key: 'shortName', label: 'Kısa Ad', required: true },
    { key: 'title', label: 'Unvan' },
    { key: 'taxNumber', label: 'Vergi No' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'E-posta' },
    { key: 'city', label: 'Şehir' },
  ],
  poz: [
    { key: 'pozId', label: 'POZ Kodu', required: true },
    { key: 'name', label: 'İş Tanımı', required: true },
    { key: 'unit', label: 'Birim', required: true },
    { key: 'unitPrice', label: 'Birim Fiyat', required: true },
  ],
  employees: [
    { key: 'name', label: 'Ad Soyad', required: true },
    { key: 'role', label: 'Görev' },
    { key: 'monthlyWage', label: 'Aylık Ücret' },
    { key: 'dailyRate', label: 'Günlük Yevmiye' },
  ],
};

export function parseCsvOrTsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
  return { headers, rows };
}

export function validateImport(type: ImportType, headers: string[], rows: string[][]): ImportResult {
  const spec = IMPORT_FIELDS[type];
  const errors: ImportError[] = [];
  const hIdx: Record<string, number> = {};
  for (const f of spec) {
    const idx = headers.findIndex(h => h.toLowerCase() === f.key.toLowerCase() || h.toLowerCase() === f.label.toLowerCase());
    if (idx >= 0) hIdx[f.key] = idx;
    else if (f.required) errors.push({ row: 0, message: `Zorunlu sütun yok: ${f.label} (${f.key})` });
  }
  let imported = 0; let skipped = 0;
  rows.forEach((r, i) => {
    let ok = true;
    for (const f of spec) {
      if (f.required) {
        const v = r[hIdx[f.key]];
        if (!v || v.trim() === '') {
          errors.push({ row: i + 2, message: `${f.label} boş` });
          ok = false;
          break;
        }
      }
    }
    if (ok) imported++; else skipped++;
  });
  return { type, rowsTotal: rows.length, rowsImported: imported, rowsSkipped: skipped, errors: errors.slice(0, 50), importedAt: new Date().toISOString() };
}

export async function listImportHistory(): Promise<ImportResult[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('import_history').select('*').order('imported_at', { ascending: false }).limit(30);
      if (!error && data) {
        const list = data.map(importFromRow);
        await AsyncStorage.setItem(KEY_IMPORTS, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try { const raw = await AsyncStorage.getItem(KEY_IMPORTS); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveImportResult(r: ImportResult): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    try {
      await supabase.from('import_history').insert({
        type: r.type, rows_total: r.rowsTotal, rows_imported: r.rowsImported,
        rows_skipped: r.rowsSkipped, errors: r.errors, imported_at: r.importedAt,
      });
    } catch { /* offline */ }
  }
  const list = await listImportHistory();
  list.unshift(r);
  await AsyncStorage.setItem(KEY_IMPORTS, JSON.stringify(list.slice(0, 30)));
}
