// payments.ts — POZ-DEV-078, 080
// Tahsilat CRUD + müşteri bakiye hesabı.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  CustomerBalance,
  Customer,
  WorkOrder,
  Quote,
} from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { auditRepo } from './data/auditRepo';

const KEY = '@SahaTakip:payments';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }

function fromRow(r: any): Payment {
  return {
    id: r.id,
    customerId: r.customer_id ?? '',
    customerName: r.customer_name ?? '',
    workOrderId: r.work_order_id ?? undefined,
    quoteId: r.quote_id ?? undefined,
    amount: Number(r.amount ?? 0),
    currency: r.currency ?? 'TRY',
    method: r.method,
    status: r.status,
    receivedAt: r.received_at,
    receivedBy: r.received_by_name ?? undefined,
    receivedById: r.received_by ?? undefined,
    receiptNo: r.receipt_no ?? undefined,
    vatRate: r.vat_rate == null ? undefined : Number(r.vat_rate),
    note: r.note ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(p: Payment): Record<string, any> {
  const row: Record<string, any> = {
    customer_id: uuidOrNull(p.customerId),
    customer_name: p.customerName,
    work_order_id: uuidOrNull(p.workOrderId),
    quote_id: uuidOrNull(p.quoteId),
    amount: p.amount,
    currency: p.currency ?? 'TRY',
    method: p.method,
    status: p.status,
    received_at: p.receivedAt,
    received_by: uuidOrNull(p.receivedById),
    received_by_name: p.receivedBy ?? null,
    receipt_no: p.receiptNo ?? null,
    vat_rate: p.vatRate ?? null,
    note: p.note ?? null,
  };
  if (UUID_RE.test(p.id)) row.id = p.id;
  return row;
}

function rid(): string {
  return 'pay_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function listPayments(): Promise<Payment[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('received_at', { ascending: false });
      if (!error && data) {
        const list = data.map(fromRow);
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Payment[];
  } catch {
    return [];
  }
}

async function saveAll(items: Payment[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function getPayment(id: string): Promise<Payment | null> {
  const all = await listPayments();
  return all.find(p => p.id === id) ?? null;
}

export async function createPayment(
  data: Omit<Payment, 'id' | 'createdAt'> & { id?: string },
): Promise<Payment> {
  const all = await listPayments();
  let next: Payment = {
    ...data,
    id: data.id ?? rid(),
    createdAt: new Date().toISOString(),
    currency: data.currency ?? 'TRY',
    receiptNo: data.receiptNo ?? autoReceiptNo(all),
  };
  if (SUPABASE_CONFIGURED) {
    // DÜRÜSTLÜK (Req#3): DB reddederse (RLS/constraint/ağ) HATA FIRLAT — önceden hata yutulup
    // yerel kayıt + "Tahsilat kaydedildi" gösteriliyordu; sonraki listPayments() sunucudan
    // taze çekince yerel kayıt KALICI siliniyordu (finansal veri sessiz kaybı).
    const { data: row, error } = await supabase
      .from('payments')
      .insert(toRow(next))
      .select()
      .single();
    if (error) throw new Error(`Tahsilat kaydedilemedi: ${error.message}`);
    if (row) next = fromRow(row);
  }
  await saveAll([next, ...all]);
  void auditRepo.logCurrent({ action: 'payment.create', tableName: 'payments', refId: next.id, meta: { amount: next.amount, method: next.method, status: next.status, customerId: next.customerId } });
  return next;
}

export async function updatePayment(
  id: string,
  patch: Partial<Omit<Payment, 'id' | 'createdAt'>>,
): Promise<Payment | null> {
  const all = await listPayments();
  let updated: Payment | null = null;
  const next = all.map(p => {
    if (p.id !== id) return p;
    updated = { ...p, ...patch };
    return updated;
  });
  if (updated && SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    // DÜRÜSTLÜK (Req#3): hata yutulmaz — DB reddederse fırlat (yerel güncelleme sunucudan
    // taze çekildiğinde geri alınıp sessizce kaybolmasın).
    const { data: row, error } = await supabase
      .from('payments')
      .update(toRow(updated))
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Tahsilat güncellenemedi: ${error.message}`);
    if (row) {
      updated = fromRow(row);
      const idx = next.findIndex(p => p.id === id);
      if (idx >= 0) next[idx] = updated;
    }
  }
  if (updated) {
    await saveAll(next);
    void auditRepo.logCurrent({ action: 'payment.update', tableName: 'payments', refId: id, meta: { amount: updated.amount, status: updated.status, method: updated.method } });
  }
  return updated;
}

export async function deletePayment(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    // DÜRÜSTLÜK: silme reddedilirse (RLS/yetki) fırlat — yerelden silinip sunucuda kalan
    // kayıt sonraki fetch'te geri gelip "silindi" yalanını açığa çıkarmasın.
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw new Error(`Tahsilat silinemedi: ${error.message}`);
  }
  const all = await listPayments();
  await saveAll(all.filter(p => p.id !== id));
  void auditRepo.logCurrent({ action: 'payment.delete', tableName: 'payments', refId: id });
}

export async function listByCustomer(customerId: string): Promise<Payment[]> {
  const all = await listPayments();
  return all.filter(p => p.customerId === customerId);
}

export async function listByWorkOrder(workOrderId: string): Promise<Payment[]> {
  const all = await listPayments();
  return all.filter(p => p.workOrderId === workOrderId);
}

export async function listByEmployee(employeeId: string): Promise<Payment[]> {
  const all = await listPayments();
  return all.filter(p => p.receivedById === employeeId);
}

function autoReceiptNo(existing: Payment[]): string {
  const year = new Date().getFullYear();
  const prefix = `MBZ-${year}-`;
  const max = existing
    .map(p => p.receiptNo ?? '')
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.slice(prefix.length), 10))
    .filter(n => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

// ------------- Balance computation -------------

function isInvoicedWO(w: WorkOrder): boolean {
  return w.status === 'Faturalandırıldı' || w.status === 'Tamamlandı';
}

function quoteInvoiced(q: Quote): boolean {
  // Defansif: Quote shape projeye göre değişebilir.
  const status = (q as unknown as { status?: string }).status;
  return status === 'Kabul Edildi' || status === 'Faturalandırıldı';
}

function quoteAmount(q: Quote): number {
  const any = q as unknown as { total?: number; amount?: number; grandTotal?: number };
  return Number(any.total ?? any.amount ?? any.grandTotal ?? 0) || 0;
}

export async function computeCustomerBalances(
  customers: Customer[],
  workOrders: WorkOrder[],
  quotes: Quote[],
): Promise<CustomerBalance[]> {
  const payments = await listPayments();
  return customers.map(c => {
    const wos = workOrders.filter(w => w.client === c.shortName || w.client === c.title);
    const woInvoiced = wos
      .filter(isInvoicedWO)
      .reduce((s, w) => s + (Number(w.quoteAmount) || 0), 0);

    const cQuotes = quotes.filter(q => {
      const cid = (q as unknown as { customerId?: string }).customerId;
      const cname = (q as unknown as { client?: string; customerName?: string });
      return cid === c.id || cname.client === c.shortName || cname.customerName === c.shortName;
    });
    const qInvoiced = cQuotes.filter(quoteInvoiced).reduce((s, q) => s + quoteAmount(q), 0);

    const totalInvoiced = woInvoiced + qInvoiced;

    const cPayments = payments.filter(p => p.customerId === c.id);
    const totalReceived = cPayments
      .filter(p => p.status === 'received')
      .reduce((s, p) => s + p.amount, 0);
    const pendingAmount = cPayments
      .filter(p => p.status === 'pending')
      .reduce((s, p) => s + p.amount, 0);

    const lastPaymentAt = cPayments
      .filter(p => p.status === 'received')
      .map(p => p.receivedAt)
      .sort()
      .pop();

    return {
      customerId: c.id,
      customerName: c.shortName,
      totalInvoiced,
      totalReceived,
      pendingAmount,
      balance: totalInvoiced - totalReceived,
      lastPaymentAt,
    } as CustomerBalance;
  });
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Nakit', icon: 'cash-outline' },
  { value: 'card', label: 'Kart', icon: 'card-outline' },
  { value: 'transfer', label: 'Havale/EFT', icon: 'swap-horizontal-outline' },
  { value: 'check', label: 'Çek/Senet', icon: 'document-text-outline' },
  { value: 'other', label: 'Diğer', icon: 'ellipsis-horizontal-outline' },
];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  received: 'Alındı',
  pending: 'Bekliyor',
  cancelled: 'İptal',
  refunded: 'İade',
};
