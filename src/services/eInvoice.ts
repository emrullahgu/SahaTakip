// eInvoice.ts — POZ-DEV-082
// E-Fatura entegrasyon arayüzü. Config + queue + Edge Function göndergeci.
// Gerçek gönderim: supabase functions deploy einvoice-submit
//   body: { provider, config, invoice }

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EInvoiceConfig,
  EInvoiceProvider,
  EInvoiceRecord,
  EInvoiceStatus,
  Payment,
} from '../types';
import { supabase, SUPABASE_CONFIGURED, getCurrentUser } from './supabase';

const CONFIG_KEY = '@SahaTakip:einvoice_config';
const QUEUE_KEY = '@SahaTakip:einvoice_records';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function recFromRow(r: any): EInvoiceRecord {
  return {
    id: r.id,
    paymentId: r.payment_id || undefined,
    workOrderId: r.work_order_id || undefined,
    customerId: r.customer_id || undefined,
    customerName: r.customer_name,
    customerVkn: r.customer_vkn || undefined,
    total: Number(r.total) || 0,
    vat: Number(r.vat) || 0,
    status: r.status,
    externalId: r.external_id || undefined,
    errorMessage: r.error_message || undefined,
    pdfUri: r.pdf_uri || undefined,
    createdAt: r.created_at,
    sentAt: r.sent_at || undefined,
  } as EInvoiceRecord;
}
function recToRow(r: EInvoiceRecord) {
  return {
    payment_id: uuidOrNull(r.paymentId),
    work_order_id: uuidOrNull(r.workOrderId),
    customer_id: uuidOrNull(r.customerId),
    customer_name: r.customerName,
    customer_vkn: r.customerVkn || null,
    total: r.total,
    vat: r.vat || 0,
    status: r.status,
    external_id: r.externalId || null,
    error_message: r.errorMessage || null,
    pdf_uri: r.pdfUri || null,
    created_at: r.createdAt,
    sent_at: r.sentAt || null,
  };
}

const DEFAULT_CONFIG: EInvoiceConfig = {
  provider: 'manual',
  enabled: false,
  testMode: true,
};

export async function loadConfig(): Promise<EInvoiceConfig> {
  if (SUPABASE_CONFIGURED) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { data, error } = await supabase.from('einvoice_config').select('*').eq('user_id', user.id).maybeSingle();
        if (!error && data) {
          const cfg: EInvoiceConfig = {
            provider: data.provider,
            enabled: !!data.enabled,
            testMode: !!data.test_mode,
            apiUrl: data.api_url || undefined,
            username: data.username || undefined,
            vknTckn: data.vkn_tckn || undefined,
            companyTitle: data.company_title || undefined,
            prefix: data.prefix || undefined,
            updatedAt: data.updated_at || undefined,
          } as EInvoiceConfig;
          await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
          return cfg;
        }
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<EInvoiceConfig>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(cfg: EInvoiceConfig): Promise<EInvoiceConfig> {
  const next: EInvoiceConfig = { ...cfg, updatedAt: new Date().toISOString() };
  if (SUPABASE_CONFIGURED) {
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase.from('einvoice_config').upsert({
          user_id: user.id,
          provider: next.provider,
          enabled: next.enabled,
          test_mode: next.testMode,
          api_url: next.apiUrl || null,
          username: next.username || null,
          vkn_tckn: next.vknTckn || null,
          company_title: next.companyTitle || null,
          prefix: next.prefix || null,
          updated_at: next.updatedAt,
        });
      }
    } catch { /* offline */ }
  }
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  return next;
}

function rid(): string {
  return 'einv_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function listRecords(): Promise<EInvoiceRecord[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('einvoice_records').select('*').order('created_at', { ascending: false }).limit(500);
      if (!error && data) {
        const list = data.map(recFromRow);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EInvoiceRecord[];
  } catch {
    return [];
  }
}

async function saveAll(items: EInvoiceRecord[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function queueFromPayment(p: Payment, customerVkn?: string): Promise<EInvoiceRecord> {
  const all = await listRecords();
  const vat = p.vatRate ? (p.amount * p.vatRate) / (100 + p.vatRate) : 0;
  let rec: EInvoiceRecord = {
    id: rid(),
    paymentId: p.id,
    workOrderId: p.workOrderId,
    customerId: p.customerId,
    customerName: p.customerName,
    customerVkn,
    total: p.amount,
    vat,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('einvoice_records').insert(recToRow(rec)).select().single();
      if (!error && data) rec = recFromRow(data);
    } catch { /* offline */ }
  }
  await saveAll([rec, ...all]);
  return rec;
}

export async function updateRecord(
  id: string,
  patch: Partial<EInvoiceRecord>,
): Promise<EInvoiceRecord | null> {
  const all = await listRecords();
  let updated: EInvoiceRecord | null = null;
  const next = all.map(r => {
    if (r.id !== id) return r;
    updated = { ...r, ...patch };
    return updated;
  });
  if (updated && SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try {
      const row: any = recToRow(updated);
      delete row.created_at;
      await supabase.from('einvoice_records').update(row).eq('id', id);
    } catch { /* offline */ }
  }
  if (updated) await saveAll(next);
  return updated;
}

export async function deleteRecord(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('einvoice_records').delete().eq('id', id); } catch { /* offline */ }
  }
  const all = await listRecords();
  await saveAll(all.filter(r => r.id !== id));
}

export async function submitRecord(
  rec: EInvoiceRecord,
): Promise<{ ok: boolean; status: EInvoiceStatus; message?: string; externalId?: string }> {
  const config = await loadConfig();
  if (!config.enabled) {
    return { ok: false, status: 'error', message: 'E-Fatura entegrasyonu kapalı.' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('einvoice-submit', {
      body: { provider: config.provider, config, invoice: rec },
    });
    if (error) {
      await updateRecord(rec.id, { status: 'error', errorMessage: error.message });
      return { ok: false, status: 'error', message: error.message };
    }
    const result = (data ?? {}) as { externalId?: string; status?: EInvoiceStatus };
    const newStatus: EInvoiceStatus = result.status ?? 'sent';
    await updateRecord(rec.id, {
      status: newStatus,
      externalId: result.externalId,
      sentAt: new Date().toISOString(),
      errorMessage: undefined,
    });
    return { ok: true, status: newStatus, externalId: result.externalId };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateRecord(rec.id, { status: 'error', errorMessage: msg });
    return { ok: false, status: 'error', message: msg };
  }
}

export const E_INVOICE_PROVIDERS: { value: EInvoiceProvider; label: string }[] = [
  { value: 'logo', label: 'Logo e-Fatura' },
  { value: 'mikro', label: 'Mikro e-Fatura' },
  { value: 'nesbilgi', label: 'NES Bilgi (Nilvera)' },
  { value: 'foriba', label: 'Foriba' },
  { value: 'manual', label: 'Manuel (Test)' },
  { value: 'other', label: 'Diğer' },
];

export const E_INVOICE_STATUS_LABEL: Record<EInvoiceStatus, string> = {
  draft: 'Taslak',
  queued: 'Kuyrukta',
  sent: 'Gönderildi',
  accepted: 'Kabul',
  rejected: 'Red',
  error: 'Hata',
};
