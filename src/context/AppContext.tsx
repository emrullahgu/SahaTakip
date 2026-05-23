import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WorkOrder, Employee, ToastMessage, Quote, QuoteLine, QuoteStatus, Customer } from '../types';
import { INITIAL_WORK_ORDERS, INITIAL_EMPLOYEES } from '../data/initialData';

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
    withProfit,        // KDV hariç satır toplamı
    vat,
    total: withProfit + vat, // KDV dahil
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
interface AppContextType {
  workOrders: WorkOrder[];
  employees: Employee[];
  quotes: Quote[];
  customers: Customer[];
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  approveReport: (id: string) => void;
  clientAccept: (id: string) => void;
  addWorkOrder: (order: WorkOrder) => void;
  toggleAttendance: (empId: string, day: string, currentStatus: string) => void;
  updateWage: (empId: string, newWage: number) => void;
  // Quote actions
  addQuote: (quote: Quote) => void;
  updateQuote: (quote: Quote) => void;
  deleteQuote: (id: string) => void;
  setQuoteStatus: (id: string, status: QuoteStatus) => void;
  generateQuoteNumber: () => string;
  // Customer actions
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
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
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const approveReport = (id: string) => {
    setWorkOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, status: 'Teklif Gönderildi' as const } : o))
    );
    showToast(`${id} onaylandı! Müşteriye teklif e-postası iletildi.`);
  };

  const clientAccept = (id: string) => {
    setWorkOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, status: 'Faturalandırıldı' as const } : o))
    );
    showToast('Müşteri onayladı! Fatura oluşturuldu ve arşivlendi.');
  };

  const addWorkOrder = (order: WorkOrder) => {
    setWorkOrders(prev => [order, ...prev]);
    showToast('Rapor gönderildi! Yönetici onay havuzuna eklendi.');
  };

  const toggleAttendance = (empId: string, day: string, currentStatus: string) => {
    const statuses = ['Geldi', 'İzinli', 'Raporlu', 'Gelmedi'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.id !== empId) return emp;
        const updatedAttendance = { ...emp.attendance, [day]: nextStatus };
        const daysWorked = Object.values(updatedAttendance).filter(v => v === 'Geldi').length;
        return { ...emp, attendance: updatedAttendance, daysWorked };
      })
    );
  };

  const updateWage = (empId: string, newWage: number) => {
    setEmployees(prev =>
      prev.map(emp =>
        emp.id === empId
          ? { ...emp, monthlyWage: newWage, dailyRate: Math.round(newWage / 22) }
          : emp
      )
    );
  };

  // ===== QUOTE actions =====
  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const next = quotes.length + 1;
    return `TK-${year}-${String(next).padStart(4, '0')}`;
  };

  const addQuote = (q: Quote) => {
    setQuotes(prev => [q, ...prev]);
    showToast(`Teklif ${q.number} kaydedildi.`);
  };

  const updateQuote = (q: Quote) => {
    setQuotes(prev => prev.map(x => (x.id === q.id ? q : x)));
    showToast(`Teklif ${q.number} güncellendi.`);
  };

  const deleteQuote = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
    showToast('Teklif silindi.', 'error');
  };

  const setQuoteStatus = (id: string, status: QuoteStatus) => {
    setQuotes(prev => prev.map(q => (q.id === id ? { ...q, status } : q)));
    showToast(`Teklif durumu: ${status}`);
  };

  // ===== CUSTOMER actions =====
  const addCustomer = (c: Customer) => {
    setCustomers(prev => [c, ...prev]);
    showToast(`${c.shortName} eklendi.`);
  };

  const updateCustomer = (c: Customer) => {
    setCustomers(prev => prev.map(x => (x.id === c.id ? c : x)));
    showToast(`${c.shortName} güncellendi.`);
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find(c => c.id === id);
    setCustomers(prev => prev.filter(x => x.id !== id));
    if (cust) showToast(`${cust.shortName} silindi.`, 'error');
  };

  return (
    <AppContext.Provider
      value={{
        workOrders,
        employees,
        quotes,
        customers,
        toast,
        showToast,
        approveReport,
        clientAccept,
        addWorkOrder,
        toggleAttendance,
        updateWage,
        addQuote,
        updateQuote,
        deleteQuote,
        setQuoteStatus,
        generateQuoteNumber,
        addCustomer,
        updateCustomer,
        deleteCustomer,
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
