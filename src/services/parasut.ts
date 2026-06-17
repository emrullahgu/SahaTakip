// services/parasut.ts — Paraşüt (muhasebe) entegrasyonu, İSTEMCİ tarafı.
// TÜM çağrılar parasut-proxy edge fonksiyonu üzerinden gider; client_id/secret
// İSTEMCİDE TUTULMAZ. Varsayılan SALT-OKUNUR: fatura/cari/ürün/harcama görüntülenir,
// fatura KESİLMEZ (çift kilit: bu istemci toggle'ı + sunucu PARASUT_INVOICING_ENABLED).

import { supabase } from './supabase';

const FN = 'parasut-proxy';
const SETTINGS_KEY = 'parasut_settings';

export interface ParasutSettings {
  enabled: boolean;          // entegrasyon aktif mi (okuma)
  invoicingEnabled: boolean; // fatura kesme (POST) aktif mi — varsayılan false
  updatedAt?: string;
}

const DEFAULT_SETTINGS: ParasutSettings = { enabled: false, invoicingEnabled: false };

// ── Slim tipler (JSON:API attributes düzleştirilir) ──────────────────────────
export interface ParasutInvoice {
  id: string;
  no?: string;
  date?: string;
  dueDate?: string;
  total?: number;
  remaining?: number;
  status?: string;
  description?: string;
}
export interface ParasutBill {
  id: string;
  date?: string;
  total?: number;
  description?: string;
  status?: string;
}
export interface ParasutProduct {
  id: string;
  name?: string;
  code?: string;
  listPrice?: number;
  vatRate?: number;
  unit?: string;
}
export interface ParasutContact {
  id: string;
  name?: string;
  email?: string;
  taxNumber?: string;
  balance?: number;
}

type Op = 'list' | 'show' | 'create';
interface CallBody {
  resource: 'sales_invoices' | 'purchase_bills' | 'products' | 'contacts';
  op: Op;
  id?: string;
  query?: Record<string, string>;
  payload?: unknown;
}

async function call(body: CallBody): Promise<any> {
  const { data, error } = await supabase.functions.invoke(FN, { body });
  if (error) {
    // edge fonksiyonu JSON gövdesinde { error } döndürür; mesajı ortaya çıkar.
    const msg = (error as any)?.context?.error || (error as any)?.message || 'Paraşüt çağrısı başarısız';
    throw new Error(String(msg));
  }
  if (data && typeof data === 'object' && 'error' in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return data;
}

const num = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function mapRows<T>(resp: any, mapper: (id: string, a: any) => T): T[] {
  const rows = Array.isArray(resp?.data) ? resp.data : [];
  return rows.map((r: any) => mapper(String(r.id), r.attributes ?? {}));
}

// ── Ayarlar (app_settings 'parasut_settings' — SIR İÇERMEZ, sadece toggle) ────
export async function loadParasutSettings(): Promise<ParasutSettings> {
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
    const v = data?.value as Partial<ParasutSettings> | undefined;
    if (!v) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...v };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveParasutSettings(s: Partial<ParasutSettings>): Promise<ParasutSettings> {
  const next: ParasutSettings = { ...DEFAULT_SETTINGS, ...(await loadParasutSettings()), ...s, updatedAt: new Date().toISOString() };
  try {
    const { data: userRes } = await supabase.auth.getUser();
    await supabase
      .from('app_settings')
      .upsert({ key: SETTINGS_KEY, value: next, updated_by: userRes?.user?.id ?? null, updated_at: next.updatedAt }, { onConflict: 'key' });
  } catch {
    // RLS reddi (non-admin) — sessiz geç.
  }
  return next;
}

export async function isParasutEnabled(): Promise<boolean> {
  return (await loadParasutSettings()).enabled;
}

// ── OKUMA fonksiyonları ──────────────────────────────────────────────────────
export async function listSalesInvoices(query: Record<string, string> = { 'page[size]': '25' }): Promise<ParasutInvoice[]> {
  const resp = await call({ resource: 'sales_invoices', op: 'list', query });
  return mapRows<ParasutInvoice>(resp, (id, a) => ({
    id,
    no: a.invoice_no ?? a.no,
    date: a.issue_date,
    dueDate: a.due_date,
    total: num(a.net_total ?? a.gross_total),
    remaining: num(a.remaining),
    status: a.payment_status ?? a.item_type,
    description: a.description,
  }));
}

export async function listPurchaseBills(query: Record<string, string> = { 'page[size]': '25' }): Promise<ParasutBill[]> {
  const resp = await call({ resource: 'purchase_bills', op: 'list', query });
  return mapRows<ParasutBill>(resp, (id, a) => ({
    id,
    date: a.issue_date,
    total: num(a.net_total ?? a.gross_total),
    description: a.description,
    status: a.payment_status,
  }));
}

/** Harcamalar = purchase_bills (Paraşüt'te gider faturaları). */
export const listExpenses = listPurchaseBills;

export async function listProducts(query: Record<string, string> = { 'page[size]': '50' }): Promise<ParasutProduct[]> {
  const resp = await call({ resource: 'products', op: 'list', query });
  return mapRows<ParasutProduct>(resp, (id, a) => ({
    id,
    name: a.name,
    code: a.code,
    listPrice: num(a.list_price),
    vatRate: num(a.vat_rate),
    unit: a.unit,
  }));
}

export async function listContacts(query: Record<string, string> = { 'page[size]': '50' }): Promise<ParasutContact[]> {
  const resp = await call({ resource: 'contacts', op: 'list', query });
  return mapRows<ParasutContact>(resp, (id, a) => ({
    id,
    name: a.name,
    email: a.email,
    taxNumber: a.tax_number,
    balance: num(a.balance),
  }));
}

/** Bağlantı testi — tek kayıt çeker; başarısızsa hata fırlatır. */
export async function testParasutConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await call({ resource: 'contacts', op: 'list', query: { 'page[size]': '1' } });
    return { ok: true, message: 'Paraşüt bağlantısı başarılı.' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Bağlantı başarısız.' };
  }
}

// ── YAZMA (fatura kesme) — ÇİFT KİLİT arkasında ──────────────────────────────
export async function createSalesInvoice(payload: unknown): Promise<any> {
  const s = await loadParasutSettings();
  if (!s.invoicingEnabled) {
    throw new Error('Fatura kesme KAPALI (Ayarlar > Paraşüt). Sistem oturana kadar kapalı tutuluyor.');
  }
  // Sunucu ayrıca PARASUT_INVOICING_ENABLED secret'ı ile ikinci kez korur.
  return call({ resource: 'sales_invoices', op: 'create', payload });
}
