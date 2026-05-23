export interface SelectedMaterial {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface WorkOrder {
  id: string;
  client: string;
  serviceName: string;
  date: string;
  engineer: string;
  materials: SelectedMaterial[];
  otherCost: number;
  laborCost: number;
  materialCost: number;
  quoteAmount: number;
  profit: number;
  status: 'Onay Bekliyor' | 'Teklif Gönderildi' | 'Faturalandırıldı';
  beforePhoto: string;
  afterPhoto: string;
  notes: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  monthlyWage: number;
  dailyRate: number;
  attendance: Record<string, string>;
  daysWorked: number;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  price: number;
  estCost: number;
}

export interface MaterialCatalogItem {
  id: string;
  name: string;
  price: number;
}

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

// =============================================================
// TEKLİFLENDİRME (Quoting) — Poz numaralı, 4 sütunlu yapı
// =============================================================
export interface QuoteLine {
  lineNo: number;             // Sıra no
  pozId: string;              // POZ-EM-404 vb.
  pozName: string;            // İş tanımı (snapshot)
  unit: string;               // Adet, Mt, m²
  quantity: number;           // Miktar
  // 4 ANA SÜTUN ↓
  materialPrice: number;      // Malzeme birim fiyatı
  installPrice: number;       // Montaj birim fiyatı
  dismantlePrice: number;     // Demontaj birim fiyatı (0 ise dahil değil)
  withDismantle: boolean;     // Demontaj dahil mi?
  overheadPct: number;        // Genel gider %
  profitPct: number;          // Kâr %
  vatPct: number;             // KDV %
  discountPct: number;        // İskonto %
  notes?: string;
}

export type QuoteStatus =
  | 'Taslak'
  | 'Onay Bekliyor'
  | 'Müşteriye Gönderildi'
  | 'Kabul Edildi'
  | 'Reddedildi'
  | 'Faturalandırıldı';

export interface Quote {
  id: string;                 // QT-2026-0001
  number: string;             // Görüntülenecek teklif no
  customerName: string;
  customerTitle?: string;     // Resmi unvan
  title: string;              // Teklif başlığı
  date: string;               // YYYY-MM-DD
  validUntil?: string;        // Geçerlilik tarihi
  engineer: string;
  lines: QuoteLine[];
  status: QuoteStatus;
  notes?: string;
  // Toplamlar (otomatik hesaplanır)
  subtotal: number;           // Toplam (KDV hariç)
  vatTotal: number;
  grandTotal: number;
}

// =============================================================
// Müşteri
// =============================================================
export interface Customer {
  id: string;
  shortName: string;
  title: string;              // Resmi unvan
  taxNumber?: string;
  taxOffice?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  contactPerson?: string;
}

// =============================================================
// Navigation
// =============================================================
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Company: undefined;
  Expenses: undefined;
  Services: undefined;
  Customers: undefined;
  CustomerForm: { customerId?: string } | undefined;
  NewQuote: { quoteId?: string } | undefined;
  QuoteDetail: { quoteId: string };
  WorkOrderDetail: { workOrderId: string };
  Map: undefined;
};

export type TabParamList = {
  Home: undefined;
  WorkOrders: undefined;
  NewService: undefined;
  Quotes: undefined;
  Manager: undefined;
};
