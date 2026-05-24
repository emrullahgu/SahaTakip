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
import { supabase } from './supabase';

const CONFIG_KEY = '@SahaTakip:einvoice_config';
const QUEUE_KEY = '@SahaTakip:einvoice_records';

const DEFAULT_CONFIG: EInvoiceConfig = {
  provider: 'manual',
  enabled: false,
  testMode: true,
};

export async function loadConfig(): Promise<EInvoiceConfig> {
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
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  return next;
}

function rid(): string {
  return 'einv_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function listRecords(): Promise<EInvoiceRecord[]> {
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
  const rec: EInvoiceRecord = {
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
  if (updated) await saveAll(next);
  return updated;
}

export async function deleteRecord(id: string): Promise<void> {
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
