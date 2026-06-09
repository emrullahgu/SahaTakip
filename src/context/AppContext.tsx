// ====================================================================
// AppContext — POZ-DEV-002..005, 010, 011
// ====================================================================
// Quotes / Customers / WorkOrders / Employees state'i hem in-memory tutar
// hem de online ise Supabase repository'lerine write-through gönderir.
// Offline'da local AsyncStorage cache + sync queue çalışır.
// ====================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
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
  Order,
} from '../types';
import { recomputeWorkOrderCosts, canTransition } from '../services/workOrderFlow';
import { runDueTemplates } from '../services/recurringTasks';
import { recordRevision } from '../services/quoteRevisions';
import { recordQuoteLines } from '../services/recentPozes';
import { INITIAL_WORK_ORDERS, INITIAL_EMPLOYEES } from '../data/initialData';
import { REAL_CUSTOMERS } from '../data/realCustomers';
import {
  isOnlineMode,
  quotesRepo,
  customersRepo,
  workOrdersRepo,
  employeesRepo,
  auditRepo,
  drainSyncQueue,
  clearSyncQueue,
} from '../services/data';
import { useAuth } from './AuthContext';
import { localDateISO } from '../utils/date';
import { sendLocalPush, scheduleLocalPushAt } from '../services/pushNotifications';
import { Notify } from '../services/notifications';

// Bordroda günlük ücret = aylık ücret / standart iş günü. TR uygulamasında
// genelde 30 (yasal) ya da ~22 (fiili çalışma günü) kullanılır; tek yerden
// yönetilsin diye sabit. Gerekirse resmi tatil/ay farkına göre güncellenebilir.
const STANDARD_WORK_DAYS_PER_MONTH = 22;

// ======================================================
// QUOTE — Hesaplama yardımcıları
// ======================================================
// Teklif para motoru saf modülde (src/utils/quoteMath.ts) — birim testi orada.
// Re-export: mevcut `from '../context/AppContext'` importları (NewQuoteScreen,
// pdf.ts, agent/tools.ts vb.) değişmeden çalışır.
export { calcLineTotal, calcQuoteTotals } from '../utils/quoteMath';

// ======================================================
// CONTEXT
// ======================================================
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

/** Yazma işleminin GERÇEK sonucu — ajanın "yaptım" derken yalan söylememesi için
 *  (Gereksinim 3). ok=DB yazımı başarılı; başarısızsa hata mesajı döner. */
export type WriteResult = { ok: boolean; error?: string };

export interface AppContextType {
  workOrders: WorkOrder[];
  employees: Employee[];
  quotes: Quote[];
  customers: Customer[];
  orders: Order[];
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
  attachWorkOrderMedia: (id: string, media: { videoUri?: string; audioUri?: string; signatureUri?: string; beforePhoto?: string; afterPhoto?: string; formPhoto?: string }) => void;
  deleteWorkOrder: (id: string) => Promise<WriteResult>;
  generateFromRecurring: () => Promise<number>;
  toggleAttendance: (empId: string, day: string, currentStatus: string) => void;
  updateWage: (empId: string, newWage: number) => void;
  addQuote: (quote: Quote) => Promise<WriteResult>;
  updateQuote: (quote: Quote) => Promise<WriteResult>;
  deleteQuote: (id: string) => void;
  setQuoteStatus: (id: string, status: QuoteStatus) => Promise<WriteResult>;
  // FAZ 4
  acceptQuoteAndCreateWorkOrder: (quoteId: string, signedBy?: string, signature?: string) => string | null;
  reviseQuote: (q: Quote, reason?: string) => Promise<void>;
  generateQuoteShareToken: (quoteId: string) => string | null;
  generateQuoteNumber: () => string;
  addCustomer: (c: Customer) => Promise<WriteResult>;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => Promise<WriteResult>;
  addOrder: (o: Order) => void;
  deleteOrder: (id: string) => void;
  refresh: () => Promise<void>;
}

const INITIAL_CUSTOMERS: Customer[] = REAL_CUSTOMERS;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { session, isDemoMode } = useAuth();
  const userId = session?.user?.id ?? null;

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>([]);
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
    // Demo modda kuyruk anlamsız (Supabase'e drain edilmiyor) — sessizce temizle
    if (isDemoMode) {
      clearSyncQueue().catch(e => console.warn('[AppContext.clearSyncQueue]', e));
    } else if (isOnlineMode()) {
      // Offline iken biriken işlemleri sırayla gönder
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
  }, [userId, isDemoMode]);

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
    setWorkOrders(prev => [order, ...prev]); // optimistik: UI hemen güncellenir
    // Başarı/hata toast'ı GERÇEK kayıt sonucuna göre — önceden koşulsuz "gönderildi"
    // toast'ı atılıyordu; bulut kaydı başarısız olsa bile kullanıcı başarı görüyordu.
    workOrdersRepo.insert(order)
      .then(() => {
        showToast(order.status === 'Onay Bekliyor'
          ? 'Rapor gönderildi! Yönetici onay havuzuna eklendi.'
          : 'İş emri kaydedildi.');
      })
      .catch(e => {
        console.warn('[wo.insert]', e);
        showToast('⚠️ İş emri kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      });
    auditRepo.log(userId, { action: 'work_order.create', tableName: 'work_orders', refId: order.id });
    void Notify.workOrderCreated(order.client, order.serviceName, order.id);
  };

  // ===== ATTENDANCE / WAGE =====
  const toggleAttendance = (empId: string, day: string, currentStatus: string) => {
    // Döngü sırası: Boş → Geldi → Yarım Gün → İzinli → Raporlu → Resmi Tatil → Eğitim → Mazeretsiz → Boş
    const statuses = ['Geldi', 'Yarım Gün', 'İzinli', 'Raporlu', 'Resmi Tatil', 'Eğitim', 'Mazeretsiz', 'Gelmedi'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    setEmployees(prev => {
      const updated = prev.map(emp => {
        if (emp.id !== empId) return emp;
        const updatedAttendance = { ...emp.attendance, [day]: nextStatus };
        // Çalışılan gün: tam ücretli sayılanlar (Geldi, İzinli, Resmi Tatil, Eğitim) = 1, Yarım Gün = 0.5
        const fullPaid = Object.values(updatedAttendance).filter(
          v => v === 'Geldi' || v === 'İzinli' || v === 'Resmi Tatil' || v === 'Eğitim'
        ).length;
        const half = Object.values(updatedAttendance).filter(v => v === 'Yarım Gün').length;
        const daysWorked = fullPaid + half * 0.5;
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
          ? { ...emp, monthlyWage: newWage, dailyRate: Math.round(newWage / STANDARD_WORK_DAYS_PER_MONTH) }
          : emp
      );
      const target = updated.find(e => e.id === empId);
      if (target) {
        employeesRepo.update(empId, target).catch(e => {
          console.warn('[employee.wage]', e);
          showToast('⚠️ Maaş güncellenemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
        });
        auditRepo.log(userId, { action: 'employee.wage_update', tableName: 'employees', refId: empId, meta: { newWage } });
      }
      return updated;
    });
  };

  // ===== QUOTE actions =====
  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `TK-${year}-`;
    // length+1 SİLME sonrası çakışırdı (iki teklif aynı resmi numarayı alır).
    // Mevcut numaralardan en büyüğü +1 → yeni numara her zaman aktiflerin üstünde.
    const maxSeq = quotes.reduce((m, q) => {
      if (!q.number || !q.number.startsWith(prefix)) return m;
      const n = parseInt(q.number.slice(prefix.length), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  };

  // Yazma metodları GERÇEK DB sonucunu döndürür (await + rollback). Ajan/ekran
  // "kaydedildi" derken yalan söylemesin (Gereksinim 3); UI optimistik güncellenir,
  // hata olursa geri alınır.
  const addQuote = async (q: Quote): Promise<WriteResult> => {
    setQuotes(prev => [q, ...prev]);
    try {
      await quotesRepo.insert(q);
    } catch (e: any) {
      setQuotes(prev => prev.filter(x => x.id !== q.id)); // optimistik geri al
      console.warn('[quote.insert]', e);
      showToast('⚠️ Teklif kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return { ok: false, error: e?.message || 'kayıt başarısız' };
    }
    auditRepo.log(userId, { action: 'quote.create', tableName: 'quotes', refId: q.id });
    void Notify.quoteCreated(q.customerName, q.title, q.id);
    showToast(`Teklif ${q.number} kaydedildi.`);
    return { ok: true };
  };

  const updateQuote = async (q: Quote): Promise<WriteResult> => {
    const snapshot = quotes;
    setQuotes(prev => prev.map(x => (x.id === q.id ? q : x)));
    try {
      await quotesRepo.update(q.id, q);
    } catch (e: any) {
      setQuotes(snapshot); // geri al
      console.warn('[quote.update]', e);
      showToast('⚠️ Teklif güncellenemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return { ok: false, error: e?.message || 'güncelleme başarısız' };
    }
    auditRepo.log(userId, { action: 'quote.update', tableName: 'quotes', refId: q.id });
    showToast(`Teklif ${q.number} güncellendi.`);
    return { ok: true };
  };

  const deleteQuote = (id: string) => {
    const snapshot = [...quotes];
    setQuotes(prev => prev.filter(q => q.id !== id));
    quotesRepo.delete(id)
      .then(() => {
        showToast('Teklif silindi.', 'error');
        auditRepo.log(userId, { action: 'quote.delete', tableName: 'quotes', refId: id });
      })
      .catch(e => {
        console.warn('[quote.delete]', e);
        setQuotes(snapshot);
        showToast('Teklif silinemedi: ' + (e?.message || 'yetki yok'), 'error');
      });
  };

  const setQuoteStatus = async (id: string, status: QuoteStatus): Promise<WriteResult> => {
    const existing = quotes.find(q => q.id === id);
    if (!existing) return { ok: false, error: 'Teklif bulunamadı' };
    const target: Quote = { ...existing, status };
    const snapshot = quotes;
    setQuotes(prev => prev.map(q => (q.id === id ? target : q)));
    try {
      await quotesRepo.update(id, target);
    } catch (e: any) {
      setQuotes(snapshot); // geri al
      console.warn('[quote.status]', e);
      showToast('⚠️ Durum kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return { ok: false, error: e?.message || 'güncelleme başarısız' };
    }
    auditRepo.log(userId, { action: 'quote.status', tableName: 'quotes', refId: id, meta: { status } });
    showToast(`Teklif durumu: ${status}`);
    return { ok: true };
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
    // İDEMPOTENT KORUMA: zaten kabul edilmiş teklif tekrar iş emri ÜRETMEZ
    // (paylaşılan link + doğrudan çağrı ile çift iş emri / üzerine yazma engellenir).
    if (q.generatedWorkOrderId || q.status === 'Kabul Edildi' || q.status === 'Faturalandırıldı') {
      showToast('Bu teklif zaten kabul edilmiş.', 'error');
      return q.generatedWorkOrderId ?? null;
    }
    const year = new Date().getFullYear();
    const woPrefix = `IE-${year}-`;
    // length+1 silme/eşzamanlı kabulde çakışırdı; mevcut IE numaralarından en büyüğü +1.
    const maxWoSeq = workOrders.reduce((m, w) => {
      if (!w.id || !w.id.startsWith(woPrefix)) return m;
      const n = parseInt(w.id.slice(woPrefix.length), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const woId = `${woPrefix}${String(maxWoSeq + 1).padStart(3, '0')}`;
    const newWo: WorkOrder = {
      id: woId,
      client: q.customerTitle || q.customerName,
      serviceName: q.title,
      date: localDateISO(),
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
    workOrdersRepo.insert(newWo).catch(e => {
      console.warn('[wo.insert.fromQuote]', e);
      showToast('⚠️ İş emri kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
    });
    // İş emri oluşumu da loglanır + bildirilir (manuel addWorkOrder ile tutarlı;
    // önceden yalnız 'quote.accept' loglanıyordu — iş emri sessizce doğuyordu).
    auditRepo.log(userId, { action: 'work_order.create', tableName: 'work_orders', refId: woId, meta: { fromQuote: q.id } });
    void Notify.workOrderCreated(newWo.client, newWo.serviceName, woId);

    const acceptedQuote: Quote = {
      ...q,
      status: 'Kabul Edildi',
      acceptedAt: new Date().toISOString(),
      acceptedBy: signedBy,
      acceptSignature: signature,
      generatedWorkOrderId: woId,
    };
    setQuotes(prev => prev.map(x => (x.id === q.id ? acceptedQuote : x)));
    quotesRepo.update(q.id, acceptedQuote).catch(e => {
      console.warn('[quote.accept]', e);
      showToast('⚠️ Teklif kabul kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
    });
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
  const addCustomer = async (c: Customer): Promise<WriteResult> => {
    setCustomers(prev => [c, ...prev]);
    try {
      await customersRepo.insert(c);
    } catch (e: any) {
      setCustomers(prev => prev.filter(x => x.id !== c.id)); // optimistik geri al
      console.warn('[customer.insert]', e);
      showToast('⚠️ Müşteri kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return { ok: false, error: e?.message || 'kayıt başarısız' };
    }
    auditRepo.log(userId, { action: 'customer.create', tableName: 'customers', refId: c.id });
    void Notify.customerCreated(c.shortName, c.id);
    showToast(`${c.shortName} eklendi.`);
    return { ok: true };
  };

  const updateCustomer = (c: Customer) => {
    setCustomers(prev => prev.map(x => (x.id === c.id ? c : x)));
    customersRepo.update(c.id, c).catch(e => {
      console.warn('[customer.update]', e);
      showToast('⚠️ Müşteri güncellenemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
    });
    auditRepo.log(userId, { action: 'customer.update', tableName: 'customers', refId: c.id });
    showToast(`${c.shortName} güncellendi.`);
  };

  const deleteCustomer = async (id: string): Promise<WriteResult> => {
    const cust = customers.find(c => c.id === id);
    const snapshot = [...customers];
    setCustomers(prev => prev.filter(x => x.id !== id));
    try {
      await customersRepo.delete(id);
    } catch (e: any) {
      console.warn('[customer.delete]', e);
      setCustomers(snapshot);
      showToast('Müşteri silinemedi: ' + (e?.message || 'yetki yok'), 'error');
      return { ok: false, error: e?.message || 'silme başarısız' };
    }
    if (cust) showToast(`${cust.shortName} silindi.`, 'error');
    auditRepo.log(userId, { action: 'customer.delete', tableName: 'customers', refId: id });
    return { ok: true };
  };

  const addOrder = (o: Order) => {
    setOrders(prev => [o, ...prev]);
    showToast(`Sipariş ${o.code} oluşturuldu.`);
  };

  const deleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    showToast('Sipariş silindi.', 'error');
  };

  // =====================================================
  // FAZ 3 — İş Emri Akışı (POZ-DEV-024..035)
  // =====================================================
  const persistWorkOrder = (w: WorkOrder) => {
    workOrdersRepo.update(w.id, w).catch(e => {
      console.warn('[wo.update]', e);
      showToast('⚠️ İş emri güncellenemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
    });
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
    // Tüm ekibe durum bildirimi (her iş herkese bildirim olarak gider).
    if (status === 'Başladı') void Notify.workOrderStarted(current.client, id);
    else if (status === 'Tamamlandı') void Notify.workOrderCompleted(current.client, id);
    showToast(`Durum: ${status}`);
    return true;
  };

  const assignWorkOrder = (id: string, employeeId: string, employeeName: string) => {
    let snapshot: WorkOrder | null = null;
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
        snapshot = next;
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, { action: 'work_order.assign', tableName: 'work_orders', refId: id, meta: { employeeId } });
    showToast(`${employeeName} kişisine atandı.`);
    const s = snapshot as WorkOrder | null;
    // Bildirim: atanan personelin KENDİ cihazına uzak push (notify-push Edge Fn)
    // + yöneticinin bildirim merkezi/local push'u. sendLocalPush yalnızca atamayı
    // yapan cihazda göründüğü için tek başına yetersizdi.
    void Notify.workOrderAssigned(employeeName, s?.client ?? '', id);
    // Planlanan başlangıç üzerine hatırlatıcı
    if (s?.plannedStart) {
      const d = new Date(s.plannedStart);
      if (!isNaN(d.getTime())) {
        // 15 dk önce
        const remindAt = new Date(d.getTime() - 15 * 60 * 1000);
        void scheduleLocalPushAt(
          remindAt,
          'Görev hatırlatması',
          `${s.client} — ${s.serviceName} 15 dk içinde başlıyor.`,
          { workOrderId: id, kind: 'reminder' },
        );
      }
    }
  };

  const respondAssignment = (id: string, accept: boolean, reason?: string) => {
    let snapshot: WorkOrder | null = null;
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
        snapshot = next;
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
    const s = snapshot as WorkOrder | null;
    // Bildirim: yöneticiye geri dönüş
    void sendLocalPush(
      accept ? 'Görev kabul edildi' : 'Görev reddedildi',
      `${s?.client ?? ''} — ${s?.serviceName ?? id}${!accept && reason ? ` (${reason})` : ''}`,
      { workOrderId: id, kind: accept ? 'accept' : 'reject' },
    );
  };

  const transferWorkOrder = (id: string, employeeId: string, employeeName: string) => {
    let snapshot: WorkOrder | null = null;
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
        snapshot = next;
        persistWorkOrder(next);
        return next;
      }),
    );
    auditRepo.log(userId, { action: 'work_order.transfer', tableName: 'work_orders', refId: id, meta: { employeeId } });
    showToast(`${employeeName} kişisine devredildi.`);
    const s = snapshot as WorkOrder | null;
    // Devredilen personelin kendi cihazına uzak push + yönetici bildirimi.
    void Notify.workOrderAssigned(employeeName, s?.client ?? '', id);
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
    // Atanan personelin kendi cihazına tek bir özet uzak push + yönetici bildirimi.
    void Notify.workOrderAssigned(employeeName, `${ids.length} görev`, ids[0] ?? '');
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
    let snapshot: WorkOrder | null = null;
    setWorkOrders(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        const next: WorkOrder = { ...w, plannedStart, plannedEnd, slaHours };
        snapshot = next;
        persistWorkOrder(next);
        return next;
      }),
    );
    // Yeni planlama üzerine hatırlatıcı zamanla (15 dk önce)
    if (plannedStart) {
      const d = new Date(plannedStart);
      if (!isNaN(d.getTime())) {
        const remindAt = new Date(d.getTime() - 15 * 60 * 1000);
        const s = snapshot as WorkOrder | null;
        void scheduleLocalPushAt(
          remindAt,
          'Görev hatırlatması',
          `${s?.client ?? ''} — ${s?.serviceName ?? id} 15 dk içinde başlıyor.`,
          { workOrderId: id, kind: 'reminder' },
        );
      }
    }
    showToast('Planlama kaydedildi.');
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
    media: { videoUri?: string; audioUri?: string; signatureUri?: string; beforePhoto?: string; afterPhoto?: string; formPhoto?: string },
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

  const deleteWorkOrder = async (id: string): Promise<WriteResult> => {
    // Optimistik: önce listeden kaldır, hata olursa geri ekle.
    const snapshot = [...workOrders];
    setWorkOrders(prev => prev.filter(w => w.id !== id));
    try {
      await workOrdersRepo.delete(id);
    } catch (e: any) {
      console.warn('[work_order.delete]', e);
      // Rollback: silinemediği için listeyi eski haline döndür.
      setWorkOrders(snapshot);
      const msg = e?.message ?? 'yetkiniz olmayabilir';
      showToast(`Silinemedi: ${msg}`, 'error');
      try { Alert.alert('İş emri silinemedi', msg); } catch { /* ignore */ }
      return { ok: false, error: msg };
    }
    showToast('İş emri silindi.');
    auditRepo.log(userId, { action: 'work_order.delete', tableName: 'work_orders', refId: id });
    return { ok: true };
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
        orders,
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
        deleteWorkOrder,
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
        addOrder,
        deleteOrder,
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
