export interface SelectedMaterial {
  id: string;
  name: string;
  price: number;
  qty: number;
}

// FAZ 3 — İş Emri akışı
export type WorkOrderPriority = 'Normal' | 'Yüksek' | 'Acil';

export type WorkOrderAssignmentStatus =
  | 'Atanmadı'
  | 'Atandı'
  | 'Kabul Edildi'
  | 'Reddedildi'
  | 'Devredildi';

export interface WorkOrderTimeLog {
  id: string;
  startAt: string; // ISO
  endAt?: string;
  minutes?: number;
  userId?: string;
  note?: string;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  serviceName: string;
  client: string;
  priority: WorkOrderPriority;
  intervalDays: number;           // 30 = aylık
  nextRunDate: string;            // YYYY-MM-DD
  defaultEngineer?: string;
  active: boolean;
  notes?: string;
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
  status:
    | 'Bekliyor'
    | 'Atandı'
    | 'Yolda'
    | 'Başladı'
    | 'Tamamlandı'
    | 'İptal'
    | 'Onay Bekliyor'
    | 'Teklif Gönderildi'
    | 'Faturalandırıldı';
  beforePhoto: string;
  afterPhoto: string;
  notes: string;
  // FAZ 3 alanları
  priority?: WorkOrderPriority;
  plannedStart?: string;          // ISO
  plannedEnd?: string;            // ISO
  slaHours?: number;
  assignedToId?: string;
  assignedToName?: string;
  assignmentStatus?: WorkOrderAssignmentStatus;
  rejectReason?: string;
  timeLogs?: WorkOrderTimeLog[];
  actualLaborMinutes?: number;
  videoUri?: string;
  audioUri?: string;
  signatureUri?: string;
  templateId?: string;
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
  // FAZ 4
  revision?: number;          // Mevcut revizyon (0..N)
  acceptedAt?: string;        // ISO — müşteri kabul zamanı
  acceptedBy?: string;        // İmza sahibi
  acceptSignature?: string;   // Base64 ya da metin
  generatedWorkOrderId?: string; // POZ-DEV-039
  templateId?: string;        // POZ-DEV-041
  shareToken?: string;        // POZ-DEV-040 (yerel, paylaşılabilir link için)
}

// FAZ 4 — POZ-DEV-038 Revizyon geçmişi
export interface QuoteRevision {
  id: string;                 // qr-{timestamp}
  quoteId: string;
  revision: number;
  snapshot: Quote;            // O andaki tam snapshot
  createdAt: string;
  reason?: string;
}

// FAZ 4 — POZ-DEV-041 Teklif şablonu
export interface QuoteTemplate {
  id: string;
  name: string;               // "Kompanzasyon Standart"
  category?: string;          // "Kompanzasyon" | "YG" | "Kablo Tava" vb.
  lines: Omit<QuoteLine, 'lineNo'>[];
  defaultTitle?: string;
  notes?: string;
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

// FAZ 5 — POZ-DEV-044 Müşteri sahaları
export interface CustomerSite {
  id: string;
  customerId: string;
  name: string;               // "Merkez Şube", "Fabrika 2"
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  createdAt: string;
}

// FAZ 5 — POZ-DEV-045 Müşteri belgesi
export interface CustomerDocument {
  id: string;
  customerId: string;
  name: string;               // "Sözleşme 2026.pdf"
  category?: 'Sözleşme' | 'Teklif' | 'Fatura' | 'Diğer';
  uri: string;                // local file://… ya da supabase storage URL
  storagePath?: string;       // supabase Storage path
  sizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
  notes?: string;
}

// FAZ 5 — POZ-DEV-047 Müşteri memnuniyeti
export interface CustomerRating {
  id: string;
  customerId: string;
  workOrderId?: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  ratedBy?: string;           // İmza/ad
  createdAt: string;
}

// FAZ 5 — POZ-DEV-046 Müşteri timeline öğesi (RAM, türetilmiş)
export type CustomerTimelineKind =
  | 'quote'
  | 'workOrder'
  | 'visit'
  | 'document'
  | 'rating';
export interface CustomerTimelineItem {
  id: string;
  kind: CustomerTimelineKind;
  title: string;
  subtitle?: string;
  date: string;               // ISO/yyyy-mm-dd
  refId?: string;
  meta?: Record<string, any>;
}

// =============================================================
// FAZ 6 — Form & Kontrol Listeleri (POZ-DEV-049..053)
// =============================================================
export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'photo'
  | 'signature'
  | 'rating'
  | 'note';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];          // select/multiselect için
  min?: number;
  max?: number;
  placeholder?: string;
  helpText?: string;
}

export type FormTemplateCategory =
  | 'Denetim'
  | 'Bakım'
  | 'Arıza Tespit'
  | 'Montaj'
  | 'Teslimat'
  | 'Diğer';

export interface FormTemplate {
  id: string;
  name: string;
  category: FormTemplateCategory;
  description?: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  isSeed?: boolean;
}

export type FormFieldValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined;

export interface FormResponseRevision {
  id: string;
  revision: number;
  editedAt: string;
  editedBy?: string;
  reason?: string;
  values: Record<string, FormFieldValue>;
}

export interface FormResponse {
  id: string;
  templateId: string;
  templateName: string;
  workOrderId?: string;
  customerId?: string;
  filledBy?: string;
  values: Record<string, FormFieldValue>;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================
// FAZ 7 — Stok, Malzeme & Zimmet (POZ-DEV-054..059)
// =============================================================
export type WarehouseKind = 'depo' | 'arac' | 'personel';

export interface Warehouse {
  id: string;
  name: string;
  kind: WarehouseKind;
  responsibleId?: string;
  responsibleName?: string;
  code?: string;
  notes?: string;
  createdAt: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  price?: number;
  minStock?: number;
  category?: string;
  barcode?: string;
  notes?: string;
  createdAt: string;
}

export interface StockBalance {
  materialId: string;
  warehouseId: string;
  qty: number;
}

export type StockMovementKind =
  | 'giris'
  | 'cikis'
  | 'transfer'
  | 'is-emri'
  | 'sayim';

export interface StockMovement {
  id: string;
  kind: StockMovementKind;
  materialId: string;
  materialName: string;
  materialUnit: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  qty: number;
  unitPrice?: number;
  workOrderId?: string;
  userId?: string;
  userName?: string;
  note?: string;
  createdAt: string;
}

// =============================================================
// FAZ 8 — Araç Takibi (POZ-DEV-060..063)
// =============================================================
export interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  driverId?: string;
  driverName?: string;
  kmTotal?: number;
  fuelType?: 'benzin' | 'dizel' | 'lpg' | 'elektrik' | 'hibrit';
  inspectionDueAt?: string;
  insuranceDueAt?: string;
  notes?: string;
  createdAt: string;
}

export type VehicleLogKind =
  | 'km'
  | 'fuel'
  | 'maintenance'
  | 'inspection'
  | 'insurance';

export interface VehicleLog {
  id: string;
  vehicleId: string;
  kind: VehicleLogKind;
  km?: number;
  liters?: number;
  unitPrice?: number;
  totalCost?: number;
  serviceType?: string;
  dueAt?: string;
  note?: string;
  performedBy?: string;
  createdAt: string;
}

export type VehicleDamageSeverity = 'low' | 'medium' | 'high';
export type VehicleDamageStatus = 'open' | 'in-progress' | 'repaired';

export interface VehicleDamage {
  id: string;
  vehicleId: string;
  description: string;
  severity: VehicleDamageSeverity;
  status: VehicleDamageStatus;
  photos: string[];
  kmAt?: number;
  reportedBy?: string;
  reportedAt: string;
  repairedAt?: string;
  repairCost?: number;
  notes?: string;
}

export interface VehicleRoutePoint {
  id: string;
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  recordedAt: string;
  workOrderId?: string;
  userId?: string;
  userName?: string;
}

// =============================================================
// FAZ 9 — Raporlama & Dashboard (POZ-DEV-064..071)
// =============================================================
export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ReportKpi {
  workOrdersTotal: number;
  workOrdersCompleted: number;
  workOrdersCancelled: number;
  workOrdersOpen: number;
  revenue: number;
  cost: number;
  profit: number;
  laborMinutes: number;
  customersTouched: number;
  quotesCreated: number;
  quotesAccepted: number;
  slaBreaches: number;
}

export interface ReportBucket {
  label: string;
  value: number;
}

export interface Report {
  id: string;
  period: ReportPeriod;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;   // ISO YYYY-MM-DD
  generatedAt: string;
  kpi: ReportKpi;
  byStatus: ReportBucket[];
  byEngineer: ReportBucket[];
  byCustomer: ReportBucket[];
  notes?: string;
}

export interface SlaItem {
  workOrderId: string;
  client: string;
  serviceName: string;
  engineer: string;
  assignedToName?: string;
  plannedEnd?: string;
  slaHours?: number;
  hoursOverdue: number;
  status: WorkOrder['status'];
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
  Shift: undefined;
  EmployeeDetail: { employeeId: string };
  LocationHistory: { userId: string; employeeName?: string };
  Geofences: undefined;
  CheckinScanner: undefined;
  NfcCheckin: undefined;
  ChangePassword: undefined;
  BulkAssign: undefined;
  RecurringTasks: undefined;
  QuoteRevisions: { quoteId: string };
  QuoteAccept: { token: string };
  QuoteTemplates: undefined;
  CustomerSites: { customerId: string };
  CustomerDocuments: { customerId: string };
  CustomerHistory: { customerId: string };
  CustomerPortal: { customerId: string };
  JobRating: { workOrderId: string };
  FormTemplates: undefined;
  FormBuilder: { templateId?: string } | undefined;
  FormFill: { templateId: string; workOrderId?: string; responseId?: string };
  FormResponseDetail: { responseId: string };
  WorkOrderForms: { workOrderId: string };
  Materials: undefined;
  MaterialForm: { materialId?: string } | undefined;
  Warehouses: undefined;
  WarehouseForm: { warehouseId?: string } | undefined;
  WarehouseDetail: { warehouseId: string };
  Stock: undefined;
  StockMovement: { kind?: StockMovementKind; materialId?: string; workOrderId?: string } | undefined;
  StockMovements: { materialId?: string; warehouseId?: string } | undefined;
  Assignments: undefined;
  BarcodeScan: { mode: 'material-lookup' | 'stock-in' | 'stock-out' };
  Vehicles: undefined;
  VehicleForm: { vehicleId?: string } | undefined;
  VehicleDetail: { vehicleId: string };
  VehicleLogForm: { vehicleId: string; kind?: VehicleLogKind; logId?: string };
  VehicleLogs: { vehicleId?: string; kind?: VehicleLogKind } | undefined;
  VehicleDamages: { vehicleId?: string } | undefined;
  VehicleDamageForm: { vehicleId: string; damageId?: string };
  VehicleRoute: { vehicleId: string };
  Reports: undefined;
  ReportDetail: { reportId: string };
  Dashboard: undefined;
  Sla: undefined;
};

export type TabParamList = {
  Home: undefined;
  WorkOrders: undefined;
  NewService: undefined;
  Quotes: undefined;
  Manager: undefined;
};
