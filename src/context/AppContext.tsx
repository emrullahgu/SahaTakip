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
  isWriteQueued,
  quotesRepo,
  serverMaxQuoteSeq,
  customersRepo,
  workOrdersRepo,
  employeesRepo,
  auditRepo,
  drainSyncQueue,
  clearSyncQueue,
  enqueueSync,
} from '../services/data';
import { useAuth } from './AuthContext';
import { localDateISO } from '../utils/date';
import { sendLocalPush, scheduleLocalPushAt } from '../services/pushNotifications';
import { Notify } from '../services/notifications';
import { checkSlaBreaches } from '../services/slaWatcher';
import { insertQuoteWithNumberRetry } from '../utils/quoteInsert';

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
// queued=true → işlem yerel sync kuyruğuna alındı, henüz sunucuya YAZILMADI (offline).
// Üst katman "kaydedildi" yerine "kuyruğa alındı" demeli (Gereksinim 3 — dürüstlük).
export type WriteResult = { ok: boolean; error?: string; queued?: boolean };

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
  updateWorkOrderStatus: (id: string, status: WorkOrder['status']) => Promise<WriteResult>;
  assignWorkOrder: (id: string, employeeId: string, employeeName: string) => void;
  respondAssignment: (id: string, accept: boolean, reason?: string) => void;
  transferWorkOrder: (id: string, employeeId: string, employeeName: string) => void;
  bulkAssignWorkOrders: (ids: string[], employeeId: string, employeeName: string) => void;
  setWorkOrderPriority: (id: string, p: WorkOrderPriority) => void;
  setWorkOrderSchedule: (id: string, plannedStart?: string, plannedEnd?: string, slaHours?: number) => void;
  startWorkTimer: (id: string, userId?: string, note?: string) => void;
  stopWorkTimer: (id: string) => void;
  attachWorkOrderMedia: (id: string, media: { videoUri?: string; audioUri?: string; signatureUri?: string; beforePhoto?: string; afterPhoto?: string; formPhoto?: string }, successMsg?: string) => void;
  deleteWorkOrder: (id: string) => Promise<WriteResult>;
  generateFromRecurring: () => Promise<number>;
  toggleAttendance: (empId: string, day: string, currentStatus: string) => void;
  updateWage: (empId: string, newWage: number) => void;
  addQuote: (quote: Quote) => Promise<WriteResult>;
  updateQuote: (quote: Quote) => Promise<WriteResult>;
  deleteQuote: (id: string) => void;
  setQuoteStatus: (id: string, status: QuoteStatus) => Promise<WriteResult>;
  // FAZ 4
  acceptQuoteAndCreateWorkOrder: (quoteId: string, signedBy?: string, signature?: string) => Promise<string | null>;
  reviseQuote: (q: Quote, reason?: string) => Promise<WriteResult>;
  generateQuoteShareToken: (quoteId: string) => string | null;
  generateQuoteNumber: () => string;
  addCustomer: (c: Customer) => Promise<WriteResult>;
  updateCustomer: (c: Customer) => Promise<WriteResult>;
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
      // allSettled: tek repo'nun hatası (ör. employees) diğer üçünü yutmamalı.
      // Promise.all ile biri reddedince başarılı listeler de atılıyordu; artık her
      // domain bağımsız uygulanır, hatalı domain mevcut/cache state'ini korur.
      const [qR, cR, wR, eR] = await Promise.allSettled([
        quotesRepo.list(),
        customersRepo.list(),
        workOrdersRepo.list(),
        employeesRepo.list(),
      ]);
      // list() KOŞULSUZ set edilir — `if (length)` boş-başarılı sonucu yutup eski/seed
      // veriyi gösteriyordu (silinmiş kayıt gerçek sanılıyordu). Repo'lar GEÇİCİ hatada
      // cache döndürür (boş değil), bu yüzden gerçek boş → boş, hata → cache korunur.
      if (qR.status === 'fulfilled') setQuotes(qR.value); else console.warn('[refresh.quotes]', qR.reason);
      if (cR.status === 'fulfilled') setCustomers(cR.value); else console.warn('[refresh.customers]', cR.reason);
      if (wR.status === 'fulfilled') setWorkOrders(wR.value); else console.warn('[refresh.workOrders]', wR.reason);
      if (eR.status === 'fulfilled') setEmployees(eR.value); else console.warn('[refresh.employees]', eR.reason);
      const anyFailed = [qR, cR, wR, eR].some(r => r.status === 'rejected');
      setSyncState(anyFailed ? 'error' : 'idle');
      // SLA ihlali PROAKTİF taraması (Req#7): yenilenen iş emirleri üzerinden her WO için
      // bir kez bildir (slaWatcher AsyncStorage seti ile spam önler). Taze wR.value
      // kullanılır — workOrders state'i bu noktada henüz güncellenmemiş olabilir.
      if (wR.status === 'fulfilled') {
        void checkSlaBreaches(wR.value).catch(e => console.warn('[refresh.slaCheck]', e));
      }
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
  // Yan etki (DB yazımı) artık setState updater DIŞINDA (StrictMode çift-yazımını önler);
  // toast GERÇEK sonuca göre; hata → rollback. Mesaj yalnız OLAN'ı söyler (önceden
  // gerçekleşmeyen "e-posta iletildi"/"fatura oluşturuldu" iddiası vardı — Gereksinim 3).
  const approveReport = async (id: string) => {
    const existing = workOrders.find(o => o.id === id);
    if (!existing) { showToast('İş emri bulunamadı.', 'error'); return; }
    const target: WorkOrder = { ...existing, status: 'Teklif Gönderildi' };
    setWorkOrders(prev => prev.map(o => (o.id === id ? target : o)));
    try {
      await workOrdersRepo.update(id, target);
    } catch (e: any) {
      setWorkOrders(prev => prev.map(o => (o.id === id ? existing : o)));
      showToast('⚠️ Onaylanamadı: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return;
    }
    auditRepo.log(userId, { action: 'work_order.approve', tableName: 'work_orders', refId: id });
    showToast(`${id} onaylandı (durum: Teklif Gönderildi).`);
  };

  const clientAccept = async (id: string) => {
    const existing = workOrders.find(o => o.id === id);
    if (!existing) { showToast('İş emri bulunamadı.', 'error'); return; }
    const target: WorkOrder = { ...existing, status: 'Faturalandırıldı' };
    setWorkOrders(prev => prev.map(o => (o.id === id ? target : o)));
    try {
      await workOrdersRepo.update(id, target);
    } catch (e: any) {
      setWorkOrders(prev => prev.map(o => (o.id === id ? existing : o)));
      showToast('⚠️ Müşteri onayı kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return;
    }
    auditRepo.log(userId, { action: 'work_order.client_accept', tableName: 'work_orders', refId: id });
    showToast('Müşteri onayı kaydedildi (durum: Faturalandırıldı).');
  };

  const addWorkOrder = (order: WorkOrder) => {
    setWorkOrders(prev => [order, ...prev]); // optimistik: UI hemen güncellenir
    // Başarı/hata toast'ı GERÇEK kayıt sonucuna göre — önceden koşulsuz "gönderildi"
    // toast'ı atılıyordu; bulut kaydı başarısız olsa bile kullanıcı başarı görüyordu.
    workOrdersRepo.insert(order)
      .then(() => {
        // Çevrimdışıysa kuyruğa alındı, sunucuya yazılmadı — dürüst mesaj (Req#3).
        if (isWriteQueued(order.id)) {
          showToast('İş emri yerel kaydedildi — internet gelince sunucuya gönderilecek.');
          return;
        }
        showToast(order.status === 'Onay Bekliyor'
          ? 'Rapor gönderildi! Yönetici onay havuzuna eklendi.'
          : 'İş emri kaydedildi.');
      })
      .catch(e => {
        console.warn('[wo.insert]', e);
        // Online insert koptu (offline değil — o yol enqueue edip resolve eder).
        // Düşürme: veri kaybı olmasın diye sync kuyruğuna al, çevrimiçi olunca
        // drain tekrar dener. UI'da kalır; mesaj durumu dürüstçe bildirir.
        void enqueueSync({ id: order.id, table: 'work_orders', action: 'insert', payload: order }).catch(() => {});
        showToast('⚠️ İş emri buluta kaydedilemedi; çevrimiçi olunca tekrar denenecek.', 'error');
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
      if (target) {
        employeesRepo.update(empId, target).catch(e => console.warn(e));
        // Puantaj değişimi bordroyu etkiler → denetim izi şart (denetim G5).
        auditRepo.log(userId, { action: 'employee.attendance', tableName: 'employees', refId: empId, meta: { day, status: nextStatus } });
      }
      return updated;
    });
  };

  const updateWage = (empId: string, newWage: number) => {
    // Yan etki (DB yazımı) setState updater DIŞINDA (StrictMode çift-yazım önlenir);
    // hata → eski maaşa rollback (önceden UI yeni maaşı tutup DB eskide kalıyordu).
    const current = employees.find(e => e.id === empId);
    if (!current) return;
    const target: Employee = { ...current, monthlyWage: newWage, dailyRate: Math.round(newWage / STANDARD_WORK_DAYS_PER_MONTH) };
    setEmployees(prev => prev.map(e => (e.id === empId ? target : e)));
    employeesRepo.update(empId, target).catch(e => {
      console.warn('[employee.wage]', e);
      setEmployees(prev => prev.map(e => (e.id === empId ? current : e)));
      showToast('⚠️ Maaş güncellenemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
    });
    auditRepo.log(userId, { action: 'employee.wage_update', tableName: 'employees', refId: empId, meta: { newWage } });
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
    // DEDUPE: aynı id zaten varsa tekrar ekleme. QuotesScreen realtime callback'i kendi
    // INSERT'ini geri alıp (stale closure guard'ı kaçırınca) addQuote'u 2. kez çağırabiliyordu
    // → liste başında çift kart + FlatList yinelenen-key uyarısı. Kaynakta dedupe en sağlamı.
    setQuotes(prev => prev.some(x => x.id === q.id) ? prev : [q, ...prev]);
    // generateQuoteNumber numarayı YEREL listeden üretir; liste bayatsa (başka cihaz,
    // sayfalama, yenilenmemiş) sunucudaki bir numarayla çakışır → quotes_number_key (23505)
    // ve teklif HİÇ kaydedilemez. insertQuoteWithNumberRetry çakışmada sunucudaki GERÇEK
    // max'tan yeni numara üretip retry yapar. quotes_all_read tüm kullanıcılara açık
    // olduğundan serverMaxQuoteSeq global max'ı görür (rol fark etmez).
    const prefix = `TK-${new Date().getFullYear()}-`;
    let saved: Quote;
    try {
      saved = await insertQuoteWithNumberRetry(q, prefix, {
        insert: quote => quotesRepo.insert(quote).then(() => undefined),
        serverMaxSeq: serverMaxQuoteSeq,
        localMaxSeq: p => quotes.reduce((m, x) => {
          if (!x.number || !x.number.startsWith(p)) return m;
          const n = parseInt(x.number.slice(p.length), 10);
          return Number.isFinite(n) && n > m ? n : m;
        }, 0),
        onNumberChange: quote => setQuotes(prev => prev.map(x => (x.id === q.id ? quote : x))),
      });
    } catch (e: any) {
      setQuotes(prev => prev.filter(x => x.id !== q.id)); // optimistik geri al
      console.warn('[quote.insert]', e);
      showToast('⚠️ Teklif kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return { ok: false, error: e?.message || 'kayıt başarısız' };
    }
    auditRepo.log(userId, { action: 'quote.create', tableName: 'quotes', refId: q.id });
    void Notify.quoteCreated(q.customerName, q.title, q.id);
    // Çevrimdışıysa teklif yalnız yerel kuyruğa alındı; "kaydedildi" demek yalan olur (Req#3).
    const queued = isWriteQueued(q.id);
    showToast(queued
      ? `Teklif ${saved.number} yerel kaydedildi — internet gelince sunucuya gönderilecek.`
      : `Teklif ${saved.number} kaydedildi.`);
    return { ok: true, queued };
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
    // Durum geçişlerinde ekibe bildirim (önceden tanımlı ama HİÇ çağrılmıyordu — Req#7).
    if (status === 'Müşteriye Gönderildi') void Notify.quoteSent(target.customerName, id);
    else if (status === 'Kabul Edildi') void Notify.quoteAccepted(target.customerName, id);
    showToast(`Teklif durumu: ${status}`);
    return { ok: true };
  };

  // FAZ 4 — Revizyon kaydet (POZ-DEV-038)
  const reviseQuote = async (q: Quote, reason?: string): Promise<WriteResult> => {
    await recordRevision(q, reason);
    await recordQuoteLines(q.lines);
    // await: önceden fire-and-forget'ti; reviseQuote DB yazımı bitmeden resolve oluyor,
    // {ok:false} yutuluyordu. Sonucu çağırana ilet (updateQuote zaten rollback+toast yapar).
    return updateQuote({ ...q, revision: (q.revision ?? 0) + 1 });
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
  const acceptQuoteAndCreateWorkOrder = async (
    quoteId: string,
    signedBy?: string,
    signature?: string,
  ): Promise<string | null> => {
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
    // q.lines bozuk/eski kayıtta undefined olabilir → guard (yoksa .map/.reduce çöker).
    const qLines = q.lines ?? [];
    // İşçilik = montaj + (söküm SEÇİLİYSE söküm bedeli) — calcLineTotal ile aynı
    // mantık. Önceden söküm laborCost/profit'e hiç girmiyordu: withDismantle=true
    // tekliflerde maliyet eksik, kâr fazla görünüyordu (yanlış marj saklanıyordu).
    // num(): bozuk/eski kayıtta fiyat/miktar undefined olabilir → Number(undefined)=NaN
    // saklanan tutara sızmasın (NaN materialCost/profit raporları bozar).
    const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
    const laborCost = Math.round(qLines.reduce((s, l) =>
      s + (num(l.installPrice) + (l.withDismantle ? num(l.dismantlePrice) : 0)) * num(l.quantity) * (1 - num(l.discountPct) / 100), 0));
    const materialCost = Math.round(qLines.reduce((s, l) =>
      s + num(l.materialPrice) * num(l.quantity) * (1 - num(l.discountPct) / 100), 0));
    // profit yuvarlanmış maliyetlerden türetilir → quoteAmount = profit+laborCost+
    // materialCost tutarlı (önceki ayrı reduce ±1 TL sapma yaratıyordu).
    const profit = Math.round(q.grandTotal) - laborCost - materialCost;
    const newWo: WorkOrder = {
      id: woId,
      client: q.customerTitle || q.customerName,
      serviceName: q.title,
      date: localDateISO(),
      engineer: q.engineer,
      // qty (quantity DEĞİL) — recomputeWorkOrderCosts m.qty okuyor; 'quantity'
      // yazılınca timer durunca materialCost/profit NaN oluyordu. discountPct de
      // taşınır ki maliyet iskontoyu yansıtsın.
      materials: qLines.map(l => ({
        id: l.pozId,
        name: l.pozName,
        unit: l.unit,
        qty: l.quantity,
        price: l.materialPrice,
        discountPct: l.discountPct ?? 0,
      })) as any,
      otherCost: 0,
      // Maliyetler satır iskontosunu + sökümü yansıtır; profit gerçek marj.
      laborCost,
      materialCost,
      quoteAmount: q.grandTotal,
      profit,
      status: 'Bekliyor',
      beforePhoto: '',
      afterPhoto: '',
      notes: `Teklif ${q.number} kabulünden oluşturuldu.`,
      priority: 'Normal',
      assignmentStatus: 'Atanmadı',
      // Kaynak teklif izi → DB'de partial-unique index (uq_work_orders_source_quote)
      // bir teklikten çoklu cihaz/oturumda ikinci bir iş emri üretilmesini engeller.
      sourceQuoteId: q.id,
    };
    // DÜRÜSTLÜK (Req#3): iş emri DB'ye GERÇEKTEN yazılana kadar kabul akışı
    // tamamlanmış SAYILMAZ. İnsert await edilir; başarısızsa optimistik WO geri alınır,
    // teklif KABUL EDİLMİŞ işaretlenmez ve null dönülür (sahte "kabul edildi" yok).
    setWorkOrders(prev => [newWo, ...prev]);
    try {
      await workOrdersRepo.insert(newWo);
    } catch (e: any) {
      setWorkOrders(prev => prev.filter(w => w.id !== woId)); // rollback
      // ÇOKLU CİHAZ YARIŞI: başka bir cihaz/oturum bu teklikten zaten iş emri
      // üretmişse DB'deki uq_work_orders_source_quote unique index 23505 verir.
      // Bu sahte bir hata değil — teklif zaten kabul edilmiş demektir; kullanıcıya
      // doğru mesajı ver, mevcut WO id'sini dön (varsa).
      const code = e?.code || e?.details;
      if (code === '23505' || /uq_work_orders_source_quote|duplicate key/i.test(e?.message || '')) {
        showToast('Bu teklif başka bir cihazda zaten kabul edilmiş.', 'error');
        return q.generatedWorkOrderId ?? null;
      }
      console.warn('[wo.insert.fromQuote]', e);
      showToast('⚠️ İş emri kaydedilemedi, teklif kabul edilmedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return null;
    }
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
    try {
      await quotesRepo.update(q.id, acceptedQuote);
    } catch (e: any) {
      // İş emri oluştu ama teklif kabul durumu yazılamadı — kullanıcıyı AÇIKÇA uyar
      // (sessiz başarı yok). WO mevcut olduğundan woId yine dönülür.
      console.warn('[quote.accept]', e);
      showToast('⚠️ İş emri oluştu ama teklif kabul durumu kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
    }
    auditRepo.log(userId, {
      action: 'quote.accept',
      tableName: 'quotes',
      refId: q.id,
      meta: { workOrderId: woId, signedBy },
    });
    void Notify.quoteAccepted(q.customerTitle || q.customerName, q.id);
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
    const queued = isWriteQueued(c.id);
    showToast(queued
      ? `${c.shortName} yerel kaydedildi — internet gelince sunucuya gönderilecek.`
      : `${c.shortName} eklendi.`);
    return { ok: true, queued };
  };

  const updateCustomer = async (c: Customer): Promise<WriteResult> => {
    const snapshot = customers.find(x => x.id === c.id);
    setCustomers(prev => prev.map(x => (x.id === c.id ? c : x)));
    try {
      await customersRepo.update(c.id, c);
    } catch (e: any) {
      if (snapshot) setCustomers(prev => prev.map(x => (x.id === c.id ? snapshot : x)));
      console.warn('[customer.update]', e);
      showToast('⚠️ Müşteri güncellenemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
      return { ok: false, error: e?.message || 'güncelleme başarısız' };
    }
    auditRepo.log(userId, { action: 'customer.update', tableName: 'customers', refId: c.id });
    showToast(`${c.shortName} güncellendi.`);
    return { ok: true };
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
  // Başarı toast'ı yalnız DB yazımı GERÇEKTEN başarılı olursa gösterilir; hata olursa
  // (varsa) rollback çağrılır ve dürüst hata mesajı verilir (Req#3: olmayanı söyleme).
  // opts'suz çağrılar geriye-uyumlu: sessiz yazar, yalnız hatada uyarır.
  const persistWorkOrder = (
    w: WorkOrder,
    opts?: { successMsg?: string; successType?: 'success' | 'error'; rollback?: () => void },
  ): Promise<WriteResult> => {
    return workOrdersRepo.update(w.id, w)
      .then((): WriteResult => { if (opts?.successMsg) showToast(opts.successMsg, opts.successType); return { ok: true }; })
      .catch((e): WriteResult => {
        console.warn('[wo.update]', e);
        opts?.rollback?.();
        showToast('⚠️ İş emri güncellenemedi: ' + (e?.message || 'bilinmeyen hata'), 'error');
        return { ok: false, error: e?.message || 'güncelleme başarısız' };
      });
  };

  // DB yazımını AWAIT eder; başarı toast'ı + audit + bildirim YALNIZ yazım gerçekten
  // başarılıysa. Ajan bu sonucu await edip "Durum güncellendi" derken yalan söylemesin
  // (Req#3): RLS reddi/offline'da {ok:false} döner, ajan da başarısızlığı raporlar.
  const updateWorkOrderStatus = async (id: string, status: WorkOrder['status']): Promise<WriteResult> => {
    const current = workOrders.find(w => w.id === id);
    if (!current) return { ok: false, error: 'İş emri bulunamadı' };
    if (!canTransition(current.status, status)) {
      showToast(`Geçersiz geçiş: ${current.status} → ${status}`, 'error');
      return { ok: false, error: `Geçersiz geçiş: ${current.status} → ${status}` };
    }
    const next: WorkOrder = { ...current, status };
    setWorkOrders(prev => prev.map(w => (w.id === id ? next : w)));
    const res = await persistWorkOrder(next, {
      successMsg: `Durum: ${status}`,
      rollback: () => setWorkOrders(prev => prev.map(w => (w.id === id ? current : w))),
    });
    if (!res.ok) return res; // DB başarısız → audit/bildirim YOK, dürüst hata dön
    auditRepo.log(userId, { action: 'work_order.status', tableName: 'work_orders', refId: id, meta: { status } });
    // Tüm ekibe durum bildirimi (her iş herkese bildirim olarak gider).
    if (status === 'Başladı') void Notify.workOrderStarted(current.client, id);
    else if (status === 'Tamamlandı') void Notify.workOrderCompleted(current.client, id);
    return { ok: true };
  };

  const assignWorkOrder = (id: string, employeeId: string, employeeName: string) => {
    const current = workOrders.find(w => w.id === id);
    if (!current) { showToast('İş emri bulunamadı.', 'error'); return; }
    const next: WorkOrder = {
      ...current,
      assignedToId: employeeId,
      assignedToName: employeeName,
      assignmentStatus: 'Atandı',
      status: current.status === 'Bekliyor' ? 'Atandı' : current.status,
      engineer: current.engineer || employeeName,
    };
    setWorkOrders(prev => prev.map(w => (w.id === id ? next : w)));
    persistWorkOrder(next, {
      successMsg: `${employeeName} kişisine atandı.`,
      rollback: () => setWorkOrders(prev => prev.map(w => (w.id === id ? current : w))),
    });
    auditRepo.log(userId, { action: 'work_order.assign', tableName: 'work_orders', refId: id, meta: { employeeId } });
    const s = next;
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
    const current = workOrders.find(w => w.id === id);
    if (!current) { showToast('İş emri bulunamadı.', 'error'); return; }
    const next: WorkOrder = accept
      ? { ...current, assignmentStatus: 'Kabul Edildi' }
      : {
          ...current,
          assignmentStatus: 'Reddedildi',
          rejectReason: reason ?? '',
          status: 'Bekliyor',
          assignedToId: undefined,
          assignedToName: undefined,
        };
    setWorkOrders(prev => prev.map(w => (w.id === id ? next : w)));
    // Toast yalnız DB yazımı başarılıysa; hata → eski atama durumuna rollback.
    persistWorkOrder(next, {
      successMsg: accept ? 'Görev kabul edildi.' : 'Görev reddedildi.',
      successType: accept ? 'success' : 'error',
      rollback: () => setWorkOrders(prev => prev.map(w => (w.id === id ? current : w))),
    });
    auditRepo.log(userId, {
      action: accept ? 'work_order.accept' : 'work_order.reject',
      tableName: 'work_orders',
      refId: id,
      meta: { reason },
    });
    // Bildirim: yöneticiye geri dönüş
    void sendLocalPush(
      accept ? 'Görev kabul edildi' : 'Görev reddedildi',
      `${next.client ?? ''} — ${next.serviceName ?? id}${!accept && reason ? ` (${reason})` : ''}`,
      { workOrderId: id, kind: accept ? 'accept' : 'reject' },
    );
  };

  const transferWorkOrder = (id: string, employeeId: string, employeeName: string) => {
    const current = workOrders.find(w => w.id === id);
    if (!current) { showToast('İş emri bulunamadı.', 'error'); return; }
    const next: WorkOrder = {
      ...current,
      assignedToId: employeeId,
      assignedToName: employeeName,
      assignmentStatus: 'Devredildi',
      engineer: employeeName,
    };
    setWorkOrders(prev => prev.map(w => (w.id === id ? next : w)));
    persistWorkOrder(next, {
      successMsg: `${employeeName} kişisine devredildi.`,
      rollback: () => setWorkOrders(prev => prev.map(w => (w.id === id ? current : w))),
    });
    auditRepo.log(userId, { action: 'work_order.transfer', tableName: 'work_orders', refId: id, meta: { employeeId } });
    // Devredilen personelin kendi cihazına uzak push + yönetici bildirimi.
    void Notify.workOrderAssigned(employeeName, next.client ?? '', id);
  };

  const bulkAssignWorkOrders = (ids: string[], employeeId: string, employeeName: string) => {
    // Hedeflerin snapshot'ı — her biri BAĞIMSIZ persist + kendi rollback'i (3. kayıt
    // koparsa 1-2 değişmiş kalır ama 3 eski haline döner; "hepsi atandı" yanılgısı yok).
    const targets = workOrders.filter(w => ids.includes(w.id));
    const nextById = new Map<string, WorkOrder>();
    for (const cur of targets) {
      nextById.set(cur.id, {
        ...cur,
        assignedToId: employeeId,
        assignedToName: employeeName,
        assignmentStatus: 'Atandı',
        status: cur.status === 'Bekliyor' ? 'Atandı' : cur.status,
      });
    }
    setWorkOrders(prev => prev.map(w => nextById.get(w.id) ?? w));
    for (const cur of targets) {
      const next = nextById.get(cur.id)!;
      persistWorkOrder(next, {
        rollback: () => setWorkOrders(prev => prev.map(w => (w.id === cur.id ? cur : w))),
      });
    }
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
    const current = workOrders.find(w => w.id === id);
    if (!current) return;
    const next: WorkOrder = { ...current, priority: p };
    setWorkOrders(prev => prev.map(w => (w.id === id ? next : w)));
    persistWorkOrder(next, {
      rollback: () => setWorkOrders(prev => prev.map(w => (w.id === id ? current : w))),
    });
  };

  const setWorkOrderSchedule = (
    id: string,
    plannedStart?: string,
    plannedEnd?: string,
    slaHours?: number,
  ) => {
    const current = workOrders.find(w => w.id === id);
    if (!current) { showToast('İş emri bulunamadı.', 'error'); return; }
    const next: WorkOrder = { ...current, plannedStart, plannedEnd, slaHours };
    setWorkOrders(prev => prev.map(w => (w.id === id ? next : w)));
    persistWorkOrder(next, {
      successMsg: 'Planlama kaydedildi.',
      rollback: () => setWorkOrders(prev => prev.map(w => (w.id === id ? current : w))),
    });
    // Yeni planlama üzerine hatırlatıcı zamanla (15 dk önce)
    if (plannedStart) {
      const d = new Date(plannedStart);
      if (!isNaN(d.getTime())) {
        const remindAt = new Date(d.getTime() - 15 * 60 * 1000);
        void scheduleLocalPushAt(
          remindAt,
          'Görev hatırlatması',
          `${next.client ?? ''} — ${next.serviceName ?? id} 15 dk içinde başlıyor.`,
          { workOrderId: id, kind: 'reminder' },
        );
      }
    }
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
    successMsg?: string,
  ) => {
    const current = workOrders.find(w => w.id === id);
    if (!current) return;
    const next: WorkOrder = { ...current, ...media };
    setWorkOrders(prev => prev.map(w => (w.id === id ? next : w)));
    // successMsg verildiyse toast yalnız DB yazımı başarılıysa gösterilir, hata →
    // medyayı geri al (Req#3: "İmza kaydedildi" deyip aslında kaydetmeme).
    persistWorkOrder(next, successMsg ? {
      successMsg,
      rollback: () => setWorkOrders(prev => prev.map(w => (w.id === id ? current : w))),
    } : undefined);
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
