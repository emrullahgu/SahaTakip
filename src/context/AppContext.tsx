// ====================================================================
// AppContext — POZ-DEV-002..005, 010, 011
// ====================================================================
// Quotes / Customers / WorkOrders / Employees state'i hem in-memory tutar
// hem de online ise Supabase repository'lerine write-through gönderir.
// Offline'da local AsyncStorage cache + sync queue çalışır.
// ====================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  WorkOrder,
  Employee,
  ToastMessage,
  Quote,
  QuoteLine,
  QuoteStatus,
  Customer,
  WorkOrderPriority,
  WorkOrderAssignmentStatus,
  WorkOrderTimeLog,
} from '../types';
import { recomputeWorkOrderCosts, canTransition } from '../services/workOrderFlow';
import { runDueTemplates } from '../services/recurringTasks';
import { recordRevision } from '../services/quoteRevisions';
import { recordQuoteLines } from '../services/recentPozes';
import { INITIAL_WORK_ORDERS, INITIAL_EMPLOYEES } from '../data/initialData';
import {
  isOnlineMode,
  quotesRepo,
  customersRepo,
  workOrdersRepo,
  employeesRepo,
  auditRepo,
  drainSyncQueue,
} from '../services/data';
import { useAuth } from './AuthContext';

// ======================================================
// QUOTE — Hesaplama yardımcıları
// ======================================================
export const calcLineTotal = (line: QuoteLine) => {
  const unitBase =
    line.materialPrice +
    line.installPrice +
    (line.withDismantle ? line.dismantlePrice : 0);
  const lineRaw = unitBase * line.quantity;
  const afterDiscount = lineRaw * (1 - line.discountPct / 100);
  const withOverhead = afterDiscount * (1 + line.overheadPct / 100);
  const withProfit = withOverhead * (1 + line.profitPct / 100);
  const vat = withProfit * (line.vatPct / 100);
  return {
    unitBase,
    lineRaw,
    afterDiscount,
    withOverhead,
    withProfit,
    vat,
    total: withProfit + vat,
  };
};

export const calcQuoteTotals = (lines: QuoteLine[]) => {
  const subtotal = lines.reduce((s, l) => s + calcLineTotal(l).withProfit, 0);
  const vatTotal = lines.reduce((s, l) => s + calcLineTotal(l).vat, 0);
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
};

// ======================================================
// CONTEXT
// ======================================================
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

interface AppContextType {
  workOrders: WorkOrder[];
  employees: Employee[];
  quotes: Quote[];
  customers: Customer[];
  toast: ToastMessage | null;
  syncState: SyncState;
  showToast: (message: string, type?: 'success' | 'error') => void;
  approveReport: (id: string) => void;
  clientAccept: (id: string) => void;
  addWorkOrder: (order: WorkOrder) => void;
  // FAZ 3
  updateWorkOrderStatus: (id: string, status: WorkOrder['status']) => boolean;
  assignWorkOrder: (id: string, employeeId: string, employeeName: string) => void;
  respondAssignment: (id: string, accept: boolean, reason?: string) => void;
  transferWorkOrder: (id: string, employeeId: string, employeeName: string) => void;
  bulkAssignWorkOrders: (ids: string[], employeeId: string, employeeName: string) => void;
  setWorkOrderPriority: (id: string, p: WorkOrderPriority) => void;
  setWorkOrderSchedule: (id: string, plannedStart?: string, plannedEnd?: string, slaHours?: number) => void;
  startWorkTimer: (id: string, userId?: string, note?: string) => void;
  stopWorkTimer: (id: string) => void;
  attachWorkOrderMedia: (id: string, media: { videoUri?: string; audioUri?: string; signatureUri?: string }) => void;
  generateFromRecurring: () => Promise<number>;
  toggleAttendance: (empId: string, day: string, currentStatus: string) => void;
  updateWage: (empId: string, newWage: number) => void;
  addQuote: (quote: Quote) => void;
  updateQuote: (quote: Quote) => void;
  deleteQuote: (id: string) => void;
  setQuoteStatus: (id: string, status: QuoteStatus) => void;
  // FAZ 4
  acceptQuoteAndCreateWorkOrder: (quoteId: string, signedBy?: string, signature?: string) => string | null;
  reviseQuote: (q: Quote, reason?: string) => Promise<void>;
  generateQuoteShareToken: (quoteId: string) => string | null;
  generateQuoteNumber: () => string;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  refresh: () => Promise<void>;
}

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'C1', shortName: 'EGEBORU', title: 'EGEBORU PLASTİK SANAYİ VE TİCARET ANONİM ŞİRKETİ', city: 'İzmir' },
  { id: 'C2', shortName: 'Ata Makine', title: 'Ata Makine', city: 'İzmir' },
  { id: 'C3', shortName: 'Mert Çelik', title: 'Mert Çelik Metal Ürünleri Sanayi ve Ticaret A.Ş.', city: 'İzmir' },
  { id: 'C4', shortName: 'Dinçer Lojistik', title: 'DİNÇER LOJİSTİK ANONİM ŞİRKETİ', city: 'İzmir' },
  { id: 'C5', shortName: 'Tekpan', title: 'TEKPAN TEKNIK ELEKTRIK KUMANDA PANO SAN. TIC. A.Ş.', city: 'İzmir' },
  { id: 'C6', shortName: 'Woopal Palet', title: 'WOOPAL PALET ORMAN ÜRÜNLERİ SANAYİ VE TİCARET A.Ş.', city: 'İzmir' },
  { id: 'C7', shortName: 'Biltur Catering', title: 'Biltur Catering ve Gıda A.Ş.', city: 'İzmir' },
  { id: 'C8', shortName: 'Korunak Yangın', title: 'KORUNAK YANGIN PROJE DENETİM MÜHENDİSLİK LTD. ŞTİ.', city: 'İzmir' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(
    isOnlineMode() ? 'idle' : 'offline'
  );

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // ===== Repo'dan yükle (POZ-DEV-002..005) =====
  const refresh = async () => {
    if (!isOnlineMode()) {
      setSyncState('offline');
      return;
    }
    setSyncState('syncing');
    try {
      const [q, c, w, e] = await Promise.all([
        quotesRepo.list(),
        customersRepo.list(),
        workOrdersRepo.list(),
        employeesRepo.list(),
      ]);
      if (q.length) setQuotes(q);
      if (c.length) setCustomers(c);
      if (w.length) setWorkOrders(w);
      if (e.length) setEmployees(e);
      setSyncState('idle');
    } catch (err) {
      console.warn('[AppContext.refresh]', err);
      setSyncState('error');
    }
  };

  // İlk yükleme + auth değiştiğinde
  useEffect(() => {
    refresh();
    // Offline iken biriken işlemleri sırayla gönder
    if (isOnlineMode()) {
      drainSyncQueue().then(({ ok, failed }) => {
        if (ok > 0) showToast(`${ok} bekleyen işlem senkronize edildi.`);
        if (failed > 0) showToast(`${failed} işlem senkronize edilemedi.`, 'error');
      });
    }
    // Periyodik şablonları kontrol et (POZ-DEV-029)
    runDueTemplates().then(newOrders => {
      if (newOrders.length) {
        setWorkOrders(prev => [...newOrders, ...prev]);
        newOrders.forEach(o => workOrdersRepo.insert(o).catch(e => console.warn(e)));
        showToast(`${newOrders.length} periyodik görev oluşturuldu.`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ===== WORK ORDER actions =====
  const approveReport = (id: string) => {
    setWorkOrders(prev => {
      const updated = prev.map(o =>
        o.id === id ? { ...o, status: 'Teklif Gönderildi' as const } : o
      );
      const target = updated.find(o => o.id === id);
      if (target) {
        workOrdersRepo.update(id, target).catch(e => console.warn(e));
        auditRepo.log(userId, { action: 'work_order.approve', tableName: 'work_orders', refId: id });
      }
      return updated;
    });
    showToast(`${id} onaylandı! Müşteriye teklif e-postası iletildi.`);
  };

  const clientAccept = (id: string) => {
    setWorkOrders(prev => {
      const updated = prev.map(o =>
        o.id === id ? { ...o, status: 'Faturalandırıldı' as const } : o
      );
      const target = updated.find(o => o.id === id);
      if (target) {
        workOrdersRepo.update(id, target).catch(e => console.warn(e));
        auditRepo.log(userId, { action: 'work_order.client_accept', tableName: 'work_orders', refId: id });
      }
      return updated;
    });
    showToast('Müşteri onayladı! Fatura oluşturuldu ve arşivlendi.');
  };

  const addWorkOrder = (order: WorkOrder) => {
    setWorkOrders(prev => [order, ...prev]);
    workOrdersRepo.insert(order).catch(e => console.warn(e));
    auditRepo.log(userId, { action: 'work_order.create', tableName: 'work_orders', refId: order.id });
    showToast('Rapor gönderildi! Yönetici onay havuzuna eklendi.');
  };

  // ===== ATTENDANCE / WAGE =====
  const toggleAttendance = (empId: string, day: string, currentStatus: string) => {
    const statuses = ['Geldi', 'İzinli', 'Raporlu', 'Gelmedi'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    setEmployees(prev => {
      const updated = prev.map(emp => {
        if (emp.id !== empId) return emp;
        const updatedAttendance = { ...emp.attendance, [day]: nextStatus };
        const daysWorked = Object.values(updatedAttendance).filter(v => v === 'Geldi').length;
        return { ...emp, attendance: updatedAttendance, daysWorked };
      });
      const target = updated.find(e => e.id === empId);
      if (target) employeesRepo.update(empId, target).catch(e => console.warn(e));
      return updated;
    });
  };

  const updateWage = (empId: string, newWage: number) => {
    setEmployees(prev => {
      const updated = prev.map(emp =>
        emp.id === empId
          ? { ...emp, monthlyWage: newWage, dailyRate: Math.round(newWage / 22) }
          : emp
      );
      const target = updated.find(e => e.id === empId);
      if (target) {
        employeesRepo.update(empId, target).catch(e => console.warn(e));
        auditRepo.log(userId, { action: 'employee.wage_update', tableName: 'employees', refId: empId, meta: { newWage } });
      }
      return updated;
    });
  };

  // ===== QUOTE actions =====
  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const next = quotes.length + 1;
    return `TK-${year}-${String(next).padStart(4, '0')}`;
  };

  const addQuote = (q: Quote) => {
    setQuotes(prev => [q, ...prev]);
    quotesRepo.insert(q).catch(e => console.warn('[quote.insert]', e));
    auditRepo.log(userId, { action: 'quote.create', tableName: 'quotes', refId: q.id });
    showToast(`Teklif ${q.number} kaydedildi.`);
  };

  const updateQuote = (q: Quote) => {
    setQuotes(prev => prev.map(x => (x.id === q.id ? q : x)));
    quotesRepo.update(q.id, q).catch(e => console.warn('[quote.update]', e));
    auditRepo.log(userId, { action: 'quote.update', tableName: 'quotes', refId: q.id });
    showToast(`Teklif ${q.number} güncellendi.`);
  };

  const deleteQuote = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
    quotesRepo.delete(id).catch(e => console.warn('[quote.delete]', e));
    auditRepo.log(userId, { action: 'quote.delete', tableName: 'quotes', refId: id });
    showToast('Teklif silindi.', 'error');
  };

  const setQuoteStatus = (id: string, status: QuoteStatus) => {
    setQuotes(prev => {
      const updated = prev.map(q => (q.id === id ? { ...q, status } : q));
      const target = updated.find(q => q.id === id);
      if (target) quotesRepo.update(id, target).catch(e => console.warn(e));
      return updated;
    });
    auditRepo.log(userId, { action: 'quote.status', tableName: 'quotes', refId: id, meta: { status } });
    showToast(`Teklif durumu: ${status}`);
  };

  // FAZ 4 — Revizyon kaydet (POZ-DEV-038)
  const reviseQuote = async (q: Quote, reason?: string) => {
    await recordRevision(q, reason);
    await recordQuoteLines(q.lines);
    updateQuote({ ...q, revision: (q.revision ?? 0) + 1 });
  };

  // FAZ 4 — Paylaşılabilir kabul linki tokeni üret (POZ-DEV-040)
  const generateQuoteShareToken = (quoteId: string): string | null => {
    const q = quotes.find(x => x.id === quoteId);
    if (!q) return null;
    if (q.shareToken) return q.shareToken;
    const token = `qst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const updated: Quote = { ...q, shareToken: token };
    setQuotes(prev => prev.map(x => (x.id === quoteId ? updated : x)));
    quotesRepo.update(quoteId, updated).catch(e => console.warn('[quote.shareToken]', e));
    auditRepo.log(userId, { action: 'quote.share_token', tableName: 'quotes', refId: quoteId });
    return token;
  };

  // FAZ 4 — Teklif kabul edilince iş emri oluştur (POZ-DEV-039 + 040)
  const acceptQuoteAndCreateWorkOrder = (
    quoteId: string,
    signedBy?: string,
    signature?: string,
  ): string | null => {
    const q = quotes.find(x => x.id === quoteId);
    if (!q) return null;
    const woId = `IE-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(3, '0')}`;
    const newWo: WorkOrder = {
      id: woId,
      client: q.customerTitle || q.customerName,
      serviceName: q.title,
      date: new Date().toISOString().slice(0, 10),
      engineer: q.engineer,
      materials: q.lines.map(l => ({
        id: l.pozId,
        name: l.pozName,
        unit: l.unit,
        quantity: l.quantity,
        price: l.materialPrice,
      })) as any,
      otherCost: 0,
      laborCost: q.lines.reduce((s, l) => s + l.installPrice * l.quantity, 0),
      materialCost: q.lines.reduce((s, l) => s + l.materialPrice * l.quantity, 0),
      quoteAmount: q.grandTotal,
      profit: 0,
      status: 'Bekliyor',
      beforePhoto: '',
      afterPhoto: '',
      notes: `Teklif ${q.number} kabulünden oluşturuldu.`,
      priority: 'Normal',
      assignmentStatus: 'Atanmadı',
    };
    setWorkOrders(prev => [newWo, ...prev]);
    workOrdersRepo.insert(newWo).catch(e => console.warn('[wo.insert.fromQuote]', e));

    const acceptedQuote: Quote = {
      ...q,
      status: 'Kabul Edildi',
      acceptedAt: new Date().toISOString(),
      acceptedBy: signedBy,
      acceptSignature: signature,
      generatedWorkOrderId: woId,
    };
    setQuotes(prev => prev.map(x => (x.id === q.id ? acceptedQuote : x)));
    quotesRepo.update(q.id, acceptedQuote).catch(e => console.warn(e));
    auditRepo.log(userId, {
      action: 'quote.accept',
      tableName: 'quotes',
      refId: q.id,
      meta: { workOrderId: woId, signedBy },
    });
    showToast(`Teklif kabul edildi → ${woId}`);
    return woId;
  };

  // ===== CUSTOMER actions =====
  const addCustomer = (c: Customer) => {
    setCustomers(prev => [c, ...prev]);
    customersRepo.insert(c).catch(e => console.warn('[customer.insert]', e));
    auditRepo.log(userId, { action: 'customer.create', tableName: 'customers', refId: c.id });
    showToast(`${c.shortName} eklendi.`);
  };

  const updateCustomer = (c: Customer) => {
    setCustomers(prev => prev.map(x => (x.id === c.id ? c : x)));
    customersRepo.update(c.id, c).catch(e => console.warn('[customer.update]', e));
    auditRepo.log(userId, { action: 'customer.update', tableName: 'customers', refId: c.id });
    showToast(`${c.shortName} güncellendi.`);
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find(c => c.id === id);
    setCustomers(prev => prev.filter(x => x.id !== id));
    customersRepo.delete(id).catch(e => console.warn('[customer.delete]', e));
    auditRepo.log(userId, { action: 'customer.delete', tableName: 'customers', refId: id });
    if (cust) showToast(`${cust.shortName} silindi.`, 'error');
  };

  // =====================================================
  // FAZ 3 — İş Emri Akışı (POZ-DEV-024..035)
  // =====================================================
  const persistWorkOrder = (w: WorkOrder) => {
    workOrdersRepo.update(w.id, w).catch(e => console.warn('[wo.update]', e));
  };

  const updateWorkOrderStatus = (id: string, status: WorkOrder['status']): boolean => {
    const current = workOrders.find(w => w.id === id);
    if (!current) return false;
    if (!canTransition(current.status, status)) {
      showToast(`Geçersiz geçiş: ${current.status} → ${status}`, 'error');
      return false;
    }
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = { ...w, status };
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, { action: 'work_order.status', tableName: 'work_orders', refId: id, meta: { status } });
    showToast(`Durum: ${status}`);
    return true;
  };

  const assignWorkOrder = (id: string, employeeId: string, employeeName: string) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = {
          ...w,
          assignedToId: employeeId,
          assignedToName: employeeName,
          assignmentStatus: 'Atandı',
          status: w.status === 'Bekliyor' ? 'Atandı' : w.status,
          engineer: w.engineer || employeeName,
        };
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, { action: 'work_order.assign', tableName: 'work_orders', refId: id, meta: { employeeId } });
    showToast(`${employeeName} kişisine atandı.`);
  };

  const respondAssignment = (id: string, accept: boolean, reason?: string) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = accept
          ? { ...w, assignmentStatus: 'Kabul Edildi' }
          : {
              ...w,
              assignmentStatus: 'Reddedildi',
              rejectReason: reason ?? '',
              status: 'Bekliyor',
              assignedToId: undefined,
              assignedToName: undefined,
            };
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, {
      action: accept ? 'work_order.accept' : 'work_order.reject',
      tableName: 'work_orders',
      refId: id,
      meta: { reason },
    });
    showToast(accept ? 'Görev kabul edildi.' : 'Görev reddedildi.', accept ? 'success' : 'error');
  };

  const transferWorkOrder = (id: string, employeeId: string, employeeName: string) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = {
          ...w,
          assignedToId: employeeId,
          assignedToName: employeeName,
          assignmentStatus: 'Devredildi',
          engineer: employeeName,
        };
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, { action: 'work_order.transfer', tableName: 'work_orders', refId: id, meta: { employeeId } });
    showToast(`${employeeName} kişisine devredildi.`);
  };

  const bulkAssignWorkOrders = (ids: string[], employeeId: string, employeeName: string) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (!ids.includes(w.id)) return w;
        const next: WorkOrder = {
          ...w,
          assignedToId: employeeId,
          assignedToName: employeeName,
          assignmentStatus: 'Atandı',
          status: w.status === 'Bekliyor' ? 'Atandı' : w.status,
        };
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, {
      action: 'work_order.bulk_assign',
      tableName: 'work_orders',
      meta: { count: ids.length, employeeId },
    });
    showToast(`${ids.length} görev ${employeeName} kişisine atandı.`);
  };

  const setWorkOrderPriority = (id: string, p: WorkOrderPriority) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = { ...w, priority: p };
        persistWorkOrder(next);
        return next;
      }),
    );
  };

  const setWorkOrderSchedule = (
    id: string,
    plannedStart?: string,
    plannedEnd?: string,
    slaHours?: number,
  ) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = { ...w, plannedStart, plannedEnd, slaHours };
        persistWorkOrder(next);
        return next;
      }),
    );
  };

  const startWorkTimer = (id: string, timerUserId?: string, note?: string) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const logs = w.timeLogs ? [...w.timeLogs] : [];
        // Açık log varsa kapat
        const openIdx = logs.findIndex(l => !l.endAt);
        if (openIdx >= 0) return w;
        logs.unshift({
          id: `t-${Date.now()}`,
          startAt: new Date().toISOString(),
          userId: timerUserId ?? userId ?? undefined,
          note,
        });
        const next: WorkOrder = { ...w, timeLogs: logs };
        persistWorkOrder(next);
        return next;
      }),
    );
  };

  const stopWorkTimer = (id: string) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const logs = w.timeLogs ? [...w.timeLogs] : [];
        const openIdx = logs.findIndex(l => !l.endAt);
        if (openIdx < 0) return w;
        const endAt = new Date().toISOString();
        const minutes = Math.round(
          (new Date(endAt).getTime() - new Date(logs[openIdx].startAt).getTime()) / 60000,
        );
        logs[openIdx] = { ...logs[openIdx], endAt, minutes };
        const updated = recomputeWorkOrderCosts({ ...w, timeLogs: logs });
        persistWorkOrder(updated);
        return updated;
      }),
    );
  };

  const attachWorkOrderMedia = (
    id: string,
    media: { videoUri?: string; audioUri?: string; signatureUri?: string },
  ) => {
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = { ...w, ...media };
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, { action: 'work_order.media', tableName: 'work_orders', refId: id, meta: media });
  };

  const generateFromRecurring = async (): Promise<number> => {
    const newOrders = await runDueTemplates();
    if (!newOrders.length) return 0;
    setWorkOrders(prev => [...newOrders, ...prev]);
    newOrders.forEach(o => workOrdersRepo.insert(o).catch(e => console.warn(e)));
    showToast(`${newOrders.length} periyodik görev oluşturuldu.`);
    return newOrders.length;
  };

  return (
    <AppContext.Provider
      value={{
        workOrders,
        employees,
        quotes,
        customers,
        toast,
        syncState,
        showToast,
        approveReport,
        clientAccept,
        addWorkOrder,
        updateWorkOrderStatus,
        assignWorkOrder,
        respondAssignment,
        transferWorkOrder,
        bulkAssignWorkOrders,
        setWorkOrderPriority,
        setWorkOrderSchedule,
        startWorkTimer,
        stopWorkTimer,
        attachWorkOrderMedia,
        generateFromRecurring,
        toggleAttendance,
        updateWage,
        addQuote,
        updateQuote,
        deleteQuote,
        setQuoteStatus,
        acceptQuoteAndCreateWorkOrder,
        reviseQuote,
        generateQuoteShareToken,
        generateQuoteNumber,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
