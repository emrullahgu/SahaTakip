// integrations service — POZ-DEV-101..104
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiKey, ApiKeyScope, ErpAdapter, ErpProvider, ImportError, ImportResult, ImportType, Webhook, WebhookEvent } from '../types';

const KEY_API = '@SahaTakip:api_keys';
const KEY_WH = '@SahaTakip:webhooks';
const KEY_ERP = '@SahaTakip:erp_adapters';
const KEY_IMPORTS = '@SahaTakip:import_history';

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
  try { const raw = await AsyncStorage.getItem(KEY_API); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveApiKeys(list: ApiKey[]): Promise<void> { await AsyncStorage.setItem(KEY_API, JSON.stringify(list)); }
export async function createApiKey(input: { label: string; scopes: ApiKeyScope[]; expiresAt?: string }): Promise<ApiKey> {
  const k: ApiKey = { id: rid('ak'), key: makeKey(), label: input.label, scopes: input.scopes, expiresAt: input.expiresAt, active: true, createdAt: new Date().toISOString() };
  const list = await listApiKeys();
  list.unshift(k);
  await saveApiKeys(list);
  return k;
}
export async function revokeApiKey(id: string): Promise<void> {
  const list = await listApiKeys();
  const next = list.map(k => k.id === id ? { ...k, active: false } : k);
  await saveApiKeys(next);
}
export async function deleteApiKey(id: string): Promise<void> {
  const list = await listApiKeys();
  await saveApiKeys(list.filter(k => k.id !== id));
}

// ---- Webhook CRUD ----
export async function listWebhooks(): Promise<Webhook[]> {
  try { const raw = await AsyncStorage.getItem(KEY_WH); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveWebhooks(list: Webhook[]): Promise<void> { await AsyncStorage.setItem(KEY_WH, JSON.stringify(list)); }
export async function upsertWebhook(w: Webhook): Promise<void> {
  const list = await listWebhooks();
  const idx = list.findIndex(x => x.id === w.id);
  if (idx >= 0) list[idx] = w; else list.unshift(w);
  await saveWebhooks(list);
}
export async function deleteWebhook(id: string): Promise<void> {
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
  try { const raw = await AsyncStorage.getItem(KEY_ERP); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveErpAdapters(list: ErpAdapter[]): Promise<void> { await AsyncStorage.setItem(KEY_ERP, JSON.stringify(list)); }
export async function upsertErpAdapter(a: ErpAdapter): Promise<void> {
  const list = await listErpAdapters();
  const idx = list.findIndex(x => x.id === a.id);
  if (idx >= 0) list[idx] = a; else list.unshift(a);
  await saveErpAdapters(list);
}
export async function deleteErpAdapter(id: string): Promise<void> {
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
  const list = await listErpAdapters();
  const next = list.map(a => a.id === id ? { ...a, lastSyncAt: new Date().toISOString(), lastSyncStatus: 'success' as const } : a);
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
  try { const raw = await AsyncStorage.getItem(KEY_IMPORTS); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function saveImportResult(r: ImportResult): Promise<void> {
  const list = await listImportHistory();
  list.unshift(r);
  await AsyncStorage.setItem(KEY_IMPORTS, JSON.stringify(list.slice(0, 30)));
}
