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

const KEY = '@SahaTakip:payments';

function rid(): string {
  return 'pay_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function listPayments(): Promise<Payment[]> {
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
  const next: Payment = {
    ...data,
    id: data.id ?? rid(),
    createdAt: new Date().toISOString(),
    currency: data.currency ?? 'TRY',
    receiptNo: data.receiptNo ?? autoReceiptNo(all),
  };
  await saveAll([next, ...all]);
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
  if (updated) await saveAll(next);
  return updated;
}

export async function deletePayment(id: string): Promise<void> {
  const all = await listPayments();
  await saveAll(all.filter(p => p.id !== id));
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
