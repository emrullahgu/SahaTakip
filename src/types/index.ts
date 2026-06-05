export interface SelectedMaterial {
  id: string;
  name: string;
  price: number;
  qty: number;
  // Satır bazında iskonto yüzdesi (0–100). Boş ise 0 kabul edilir.
  discountPct?: number;
}

// FAZ 3 — İş Emri akışı
export type WorkOrderPriority = 'Normal' | 'Yüksek' | 'Acil';

export type WorkOrderAssignmentStatus =
  | 'Atanmadı'
  | 'Atandı'
  | 'Kabul Edildi'
  | 'Reddedildi'
  | 'Devredildi';

export type WorkOrderJobType = 'FIELD' | 'OFFICE' | 'REMOTE';

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
  formPhoto?: string;             // Servis formu (kağıt) fotoğrafı
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
  /** İş türü: FIELD=saha (check-in zorunlu), OFFICE=ofis (lokasyon yok),
   *  REMOTE=uzaktan destek. Varsayılan FIELD. */
  jobType?: WorkOrderJobType;
  // Optional aliases / metadata used by some legacy screens
  customerId?: string;
  customerName?: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
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
  // Optional — populated for imported product catalog rows (ürünler.json).
  brand?: string;
  code?: string;
  category?: string;
  currency?: 'TL' | 'TRY' | 'USD' | 'EUR' | string;
  listPrice?: number;
  discountRate?: number;
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
  // Gelişmiş Alanlar
  type?: 'Potansiyel' | 'Aktif' | 'Pasif' | 'Bayi' | 'Tedarikçi';
  sector?: string;
  region?: string;
  assignedStaffId?: string;
  source?: string;
  riskLimit?: number;
  currentBalance?: number;
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
  receiptUri?: string;   // Yakıt/bakım fişi fotoğrafı (Storage URL veya local file://)
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
  color?: string;
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
// FAZ 10 — Bildirim & İletişim (POZ-DEV-072..077)
// =============================================================
export type NotificationEventType =
  | 'work_order_created'
  | 'work_order_assigned'
  | 'work_order_started'
  | 'work_order_completed'
  | 'sla_breach'
  | 'quote_sent'
  | 'quote_accepted'
  | 'payment_received'
  // FAZ 33 ek event türleri
  | 'task_assigned'
  | 'task_mention'
  | 'task_comment'
  | 'task_due_soon'
  | 'event_invite'
  | 'event_reminder'
  | 'signup'
  | 'custom';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'whatsapp';

export interface AppNotification {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  createdAt: string; // ISO
  read: boolean;
  channels: NotificationChannel[];
  relatedId?: string;
  recipient?: string;
}

export interface NotificationPreferences {
  channelEnabled: Record<NotificationChannel, boolean>;
  eventChannels: Partial<Record<NotificationEventType, NotificationChannel[]>>;
  pushToken?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  quietHoursStart?: string; // 'HH:mm'
  quietHoursEnd?: string;
  updatedAt?: string;
}

// =============================================================
// FAZ 11 — Finans & Tahsilat (POZ-DEV-078..082)
// =============================================================
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'other';
export type PaymentStatus = 'received' | 'pending' | 'cancelled' | 'refunded';

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  workOrderId?: string;
  quoteId?: string;
  amount: number;
  currency?: string; // 'TRY' default
  method: PaymentMethod;
  status: PaymentStatus;
  receivedAt: string; // ISO
  receivedBy?: string; // employee/user name
  receivedById?: string;
  receiptNo?: string;
  vatRate?: number;
  note?: string;
  createdAt: string;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  totalInvoiced: number;   // quote totals OR work order quoteAmount (Faturalandırıldı/Tamamlandı)
  totalReceived: number;   // sum of received payments
  pendingAmount: number;   // pending payments
  balance: number;         // invoiced - received (pozitif => müşteri borçlu)
  lastPaymentAt?: string;
}

export type CashEntryKind =
  | 'opening'
  | 'collection'
  | 'expense'
  | 'deposit'      // kasayı şirkete teslim
  | 'adjustment';

export interface CashEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  kind: CashEntryKind;
  amount: number; // pozitif değer; kind ile yön belirlenir
  date: string;   // ISO
  paymentId?: string;
  workOrderId?: string;
  note?: string;
  createdAt: string;
}

export interface CashSummary {
  employeeId: string;
  employeeName: string;
  opening: number;
  collected: number;
  spent: number;
  deposited: number;
  adjustments: number;
  balance: number; // opening + collected - spent - deposited + adjustments
  lastEntryAt?: string;
}

export type EInvoiceProvider = 'logo' | 'mikro' | 'nesbilgi' | 'foriba' | 'manual' | 'other';
export type EInvoiceStatus =
  | 'draft'
  | 'queued'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'error';

export interface EInvoiceConfig {
  provider: EInvoiceProvider;
  enabled: boolean;
  apiUrl?: string;
  username?: string;
  vknTckn?: string;
  companyTitle?: string;
  prefix?: string;
  testMode?: boolean;
  updatedAt?: string;
}

export interface EInvoiceRecord {
  id: string;
  paymentId?: string;
  workOrderId?: string;
  customerId: string;
  customerName: string;
  customerVkn?: string;
  total: number;
  vat: number;
  status: EInvoiceStatus;
  externalId?: string;
  errorMessage?: string;
  pdfUri?: string;
  createdAt: string;
  sentAt?: string;
}

// =============================================================
// FAZ 12 — Sektörel Modüller (POZ-DEV-083..089)
// =============================================================
export type AssetType =
  | 'meter'           // sayaç
  | 'panel'           // pano
  | 'transformer'     // trafo
  | 'ges_inverter'    // GES inverter
  | 'ges_panel'       // GES panel
  | 'compensation'    // kompanzasyon
  | 'machine'
  | 'other';

export interface Asset {
  id: string;
  code?: string;           // QR / barkod
  name: string;
  type: AssetType;
  customerId?: string;
  customerName?: string;
  siteId?: string;
  siteName?: string;
  serialNo?: string;
  manufacturer?: string;
  model?: string;
  power?: string;          // ör. "1600 kVA"
  installDate?: string;
  warrantyEnd?: string;
  location?: string;       // serbest metin
  notes?: string;
  createdAt: string;
}

export type EnergyReadingKind = 'meter' | 'panel' | 'transformer' | 'ges';

export interface EnergyReading {
  id: string;
  kind: EnergyReadingKind;
  assetId?: string;
  assetName?: string;
  customerId?: string;
  workOrderId?: string;
  date: string;
  inspectorId?: string;
  inspectorName?: string;
  // Sayaç
  meterActiveKwh?: number;
  meterReactiveKvarh?: number;
  meterDemandKw?: number;
  // Pano
  panelVoltageL1?: number;
  panelVoltageL2?: number;
  panelVoltageL3?: number;
  panelCurrentL1?: number;
  panelCurrentL2?: number;
  panelCurrentL3?: number;
  panelPowerFactor?: number;
  panelTempC?: number;
  // Trafo
  trafoOilTempC?: number;
  trafoWindingTempC?: number;
  trafoOilLevel?: 'low' | 'normal' | 'high';
  trafoSilicaGel?: 'blue' | 'pink' | 'mixed';
  trafoBuchholzOk?: boolean;
  trafoGroundingOk?: boolean;
  // GES
  gesDcVoltage?: number;
  gesAcVoltage?: number;
  gesPowerKw?: number;
  gesEnergyTotalKwh?: number;
  gesIrradiance?: number;
  gesPanelTempC?: number;
  notes?: string;
  photos?: string[];
  createdAt: string;
}

export type MaintenanceKind = 'preventive' | 'corrective';

export interface MaintenancePlan {
  id: string;
  name: string;
  kind: MaintenanceKind;
  assetId?: string;
  assetName?: string;
  customerId?: string;
  customerName?: string;
  frequencyDays: number;
  lastDoneAt?: string;
  nextDueAt: string; // ISO
  assignedToId?: string;
  assignedToName?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export type InspectionType =
  | 'audit'           // genel denetim
  | 'safety'          // iş güvenliği
  | 'quality'         // kalite
  | 'commissioning'   // devreye alma
  | 'periodic';       // periyodik kontrol

export type InspectionItemStatus = 'ok' | 'fail' | 'na';

export interface InspectionItem {
  id: string;
  question: string;
  status: InspectionItemStatus;
  note?: string;
  photoUri?: string;
}

export interface Inspection {
  id: string;
  type: InspectionType;
  title: string;
  assetId?: string;
  assetName?: string;
  customerId?: string;
  customerName?: string;
  workOrderId?: string;
  inspectorId?: string;
  inspectorName?: string;
  date: string;
  items: InspectionItem[];
  score: number;          // 0..100
  status: 'draft' | 'completed';
  notes?: string;
  createdAt: string;
}

export type NonconformitySeverity = 'low' | 'medium' | 'high' | 'critical';
export type NonconformityStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';

export interface Nonconformity {
  id: string;
  inspectionId?: string;
  assetId?: string;
  customerId?: string;
  customerName?: string;
  description: string;
  severity: NonconformitySeverity;
  status: NonconformityStatus;
  assignedToId?: string;
  assignedToName?: string;
  dueDate?: string;
  correctiveAction?: string;
  rootCause?: string;
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
}

export type SalesVisitOutcome =
  | 'opportunity'
  | 'won'
  | 'lost'
  | 'follow_up'
  | 'no_interest';

export interface SalesVisitCompetitor {
  name: string;
  products?: string;
  pricing?: string;
  notes?: string;
}

export interface SalesVisit {
  id: string;
  customerId: string;
  customerName: string;
  visitDate: string;
  salespersonId?: string;
  salespersonName?: string;
  purpose?: string;
  summary?: string;
  nextStep?: string;
  nextStepDate?: string;
  outcome: SalesVisitOutcome;
  estimatedAmount?: number;
  competitor?: SalesVisitCompetitor;
  photos?: string[];
  createdAt: string;
}

// =============================================================
// FAZ 13 — Yapay Zeka (POZ-DEV-090..094)
// =============================================================
export type AiProvider = 'openai' | 'claude' | 'gemini' | 'groq' | 'mock';
export interface AiSettings {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
}

export interface PozSuggestion {
  pozId: string;
  name: string;
  unit: string;
  unitPrice: number;
  score: number; // 0..100
  reason?: string;
}

export type DamageSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface DamageAnalysis {
  severity: DamageSeverity;
  findings: string[];
  recommendations: string[];
  estimatedCost?: number;
  confidence: number; // 0..100
  imageUri?: string;
  analyzedAt: string;
  /** 'ai' = gerçek görsel modeli; 'demo' = yerel/anahtarsız yedek sonuç */
  source?: 'ai' | 'demo';
}

export interface VoiceReport {
  id: string;
  transcript: string;
  summary: string;
  actionItems: string[];
  customerName?: string;
  workOrderId?: string;
  createdAt: string;
}

export interface RouteStop {
  id: string;
  label: string;
  lat: number;
  lng: number;
  address?: string;
  workOrderId?: string;
  orderIndex?: number;
  legKm?: number;
}
export interface OptimizedRoute {
  stops: RouteStop[];
  totalKm: number;
  originalKm?: number;
  savingsKm?: number;
  computedAt: string;
}

export type AnomalyKind =
  | 'wo_overdue'
  | 'wo_long_duration'
  | 'payment_late'
  | 'employee_inactive'
  | 'quote_stale'
  | 'cost_spike';
export type AnomalySeverity = 'low' | 'medium' | 'high';
export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  title: string;
  description: string;
  targetType?: 'workOrder' | 'payment' | 'employee' | 'quote' | 'customer';
  targetId?: string;
  targetLabel?: string;
  score: number; // higher = more anomalous
  detectedAt: string;
}

// =============================================================
// FAZ 14 — Web Admin Paneli (POZ-DEV-095..100)
// =============================================================
export type AppRole = 'admin' | 'manager' | 'engineer' | 'technician' | 'sales' | 'viewer';
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  employeeId?: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export type BulkAction = 'delete' | 'activate' | 'deactivate' | 'changeRole' | 'export';

export interface LiveWorker {
  employeeId: string;
  name: string;
  role?: string;
  lat: number;
  lng: number;
  status: 'active' | 'idle' | 'offline';
  lastSeen: string;
  workOrderId?: string;
  workOrderLabel?: string;
}

// =============================================================
// FAZ 15 — Entegrasyon & Güvenlik (POZ-DEV-101..108)
// =============================================================
export type ApiKeyScope = 'read' | 'write' | 'admin';
export interface ApiKey {
  id: string;
  label: string;
  key: string;
  scopes: ApiKeyScope[];
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export type WebhookEvent =
  | 'work_order.created'
  | 'work_order.completed'
  | 'quote.created'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'payment.received'
  | 'inspection.failed'
  | 'anomaly.detected';
export interface Webhook {
  id: string;
  label: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  active: boolean;
  createdAt: string;
  lastDeliveryAt?: string;
  lastStatus?: 'success' | 'failed' | 'pending';
  lastError?: string;
}

export type ImportType = 'customers' | 'poz' | 'employees';
export interface ImportError {
  row: number;
  message: string;
}
export interface ImportResult {
  type: ImportType;
  rowsTotal: number;
  rowsImported: number;
  rowsSkipped: number;
  errors: ImportError[];
  importedAt: string;
}

export type ErpProvider = 'logo' | 'netsis' | 'mikro' | 'custom';
export interface ErpAdapter {
  id: string;
  provider: ErpProvider;
  label: string;
  baseUrl?: string;
  apiKey?: string;
  username?: string;
  active: boolean;
  syncCustomers: boolean;
  syncInvoices: boolean;
  syncProducts: boolean;
  createdAt: string;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
}

export interface KvkkConsent {
  userId: string;
  userName?: string;
  version: string;
  acceptedAt: string;
  ip?: string;
}
export interface KvkkSettings {
  currentVersion: string;
  text: string;
  updatedAt: string;
  consents: KvkkConsent[];
}

export type BackupStatus = 'success' | 'failed' | 'pending' | 'restored';
export interface BackupRecord {
  id: string;
  createdAt: string;
  sizeBytes: number;
  location: string; // file path or remote URI
  status: BackupStatus;
  restoredAt?: string;
  notes?: string;
}

export interface TwoFactorSettings {
  enabled: boolean;
  secret?: string;
  backupCodes: string[];
  confirmedAt?: string;
}

export type AccessRuleKind = 'ip' | 'device';
export interface AccessRule {
  id: string;
  kind: AccessRuleKind;
  value: string;
  label?: string;
  active: boolean;
  createdAt: string;
}

// =============================================================
// FAZ 32 — Teklif Modülleri, Görev/İş/Akaryakıt/Ürün/OSOS/Bordro
// =============================================================

// POZ-DEV-218: YG Trafo İşletme Sorumlusu Teklif
export type TransformerCustomerType = 'sanayi' | 'ticarethane' | 'osb' | 'sanayi_sitesi' | 'kamu';
export interface TransformerQuoteInput {
  kvaPerUnit: number;
  unitCount: number;
  customerType: TransformerCustomerType;
  contractMonths: number;
  distanceKm: number;
  nightShift: boolean;
  periodicTest: boolean;
  emergencyResponse: boolean;
}
export interface TransformerQuote {
  id: string;
  customerId?: string;
  customerName: string;
  input: TransformerQuoteInput;
  monthlyFee: number;
  totalFee: number;
  notes?: string;
  createdAt: string;
}

// POZ-DEV-225: GES Teklif
export type GesType = 'rooftop' | 'ground' | 'carport';
export interface GesQuoteInput {
  type: GesType;
  capacityKwp: number;
  panelCount: number;
  panelWatt: number;
  inverterKw: number;
  inverterCount: number;
  structurePerKwp: number;
  cablingPerKwp: number;
  laborPerKwp: number;
  logisticsKm: number;
  marginPct: number;
}
export interface GesQuote {
  id: string;
  customerId?: string;
  customerName: string;
  input: GesQuoteInput;
  materialCost: number;
  laborCost: number;
  logisticsCost: number;
  subtotal: number;
  margin: number;
  total: number;
  notes?: string;
  createdAt: string;
}

// POZ-DEV-232: Görev Takip (admin/internal tasks, WorkOrder'dan ayrı)
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  customerId?: string;
  workOrderId?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// POZ-DEV-241: Ürün Takip (seri no + lokasyon ile envanter)
export type ProductItemStatus = 'in_stock' | 'in_use' | 'in_transit' | 'maintenance' | 'retired';
export interface ProductItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  serialNo?: string;
  manufacturer?: string;
  model?: string;
  warehouseId?: string;
  location?: string;
  customerId?: string;
  assignedTo?: string;
  status: ProductItemStatus;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyEnd?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// POZ-DEV-246: OSOS Sayaç Okuma & Haftalık Raporlama
export interface OsosReading {
  id: string;
  meterNo: string;
  customerId?: string;
  customerName?: string;
  readingAt: string;
  activeImportKwh: number;
  activeExportKwh: number;
  reactiveImportKvarh: number;
  reactiveExportKvarh: number;
  demandKw?: number;
  source: 'manual' | 'osos_import' | 'kosbi';
  createdAt: string;
}
export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  customerId?: string;
  totalImportKwh: number;
  totalExportKwh: number;
  peakDemandKw: number;
  notes?: string;
  createdAt: string;
}

// POZ-DEV-250: OSOS Otomasyon — Günlük takip, alarm üretimi ve otomatik rapor dağıtımı
export type OsosAlarmKind =
  | 'no_reading'         // gün içi okuma yok
  | 'demand_exceeded'    // peak demand eşik aştı
  | 'consumption_spike'  // tüketim ani sıçradı (% sapma)
  | 'consumption_drop'   // tüketim ani düştü (% sapma)
  | 'reverse_flow'       // beklenmedik veriş
  | 'meter_offline';     // belirli saat sayaçtan veri yok

export type OsosAlarmSeverity = 'info' | 'warning' | 'critical';

export interface OsosAlarmRule {
  id: string;
  enabled: boolean;
  meterNo?: string;                  // boşsa tüm sayaçlar
  kind: OsosAlarmKind;
  threshold?: number;                // demand kW, % sapma vb.
  windowHours?: number;              // ör. son 24 saat
  severity: OsosAlarmSeverity;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OsosAlarm {
  id: string;
  ruleId: string;
  meterNo: string;
  customerId?: string;
  kind: OsosAlarmKind;
  severity: OsosAlarmSeverity;
  message: string;
  value?: number;
  threshold?: number;
  readingId?: string;
  detectedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notifiedAt?: string;
}

export interface OsosAutoReportConfig {
  enabled: boolean;
  hourOfDay: number;                 // 0..23 — gün başına bir kez bu saatten sonra çalışsın
  emails: string[];
  whatsapps: string[];
  gchatSpaces: string[];
  includeAlarms: boolean;
  includeDailySummary: boolean;
  lastRunAt?: string;
  updatedAt?: string;
}

export interface OsosDailySummary {
  id: string;
  date: string;                      // YYYY-MM-DD
  totalReadings: number;
  totalImportKwh: number;
  totalExportKwh: number;
  peakDemandKw: number;
  alarmCount: number;
  criticalCount: number;
  meterCount: number;
  notes?: string;
  createdAt: string;
}

// POZ-DEV-251: Bordro & Puantaj
export type TimesheetStatus = 'present' | 'absent' | 'leave' | 'sick' | 'holiday';
export interface TimesheetEntry {
  id: string;
  employeeId: string;
  date: string;
  status: TimesheetStatus;
  hoursWorked: number;
  overtime: number;
  notes?: string;
  createdAt: string;
}
export type PayrollItemKind = 'base' | 'overtime' | 'bonus' | 'advance' | 'expense' | 'deduction';
export interface PayrollItem {
  kind: PayrollItemKind;
  label: string;
  amount: number;
}
export interface PayrollRun {
  id: string;
  employeeId: string;
  employeeName: string;
  periodMonth: string; // YYYY-MM
  daysWorked: number;
  overtimeHours: number;
  items: PayrollItem[];
  gross: number;
  deductions: number;
  net: number;
  status: 'draft' | 'approved' | 'paid';
  paidAt?: string;
  createdAt: string;
}


// FAZ 33 — Görev İşbirliği, Takvim, Bildirim, Analitik
// POZ-DEV-301: Görev yorumları & ekleri
export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  text: string; // mention: @userId formatında geçer
  mentions: string[]; // employee/userId
  createdAt: string;
}
export type TaskAttachmentKind = 'image' | 'pdf' | 'video' | 'other';
export interface TaskAttachment {
  id: string;
  taskId: string;
  kind: TaskAttachmentKind;
  uri: string;
  name: string;
  size?: number;
  uploadedBy?: string;
  uploadedAt: string;
}

// POZ-DEV-310: Takvim modülü
export type CalendarEventKind = 'meeting' | 'task' | 'visit' | 'reminder' | 'holiday' | 'other';
export interface CalendarEvent {
  id: string;
  title: string;
  kind: CalendarEventKind;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location?: string;
  notes?: string;
  attendees: string[]; // employeeId
  customerId?: string;
  reminderMinutesBefore?: number;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

// POZ-DEV-315: Bildirim merkezi (Faz 33 ek kategoriler)
// Mevcut AppNotification (`type: NotificationEventType`) kullanılır.
// Faz 33'te eklenen yeni event türleri: task_assigned, task_mention, task_comment,
// task_due_soon, event_invite, event_reminder, signup — bunlar `NotificationEventType`
// içine zaten dahil değilse type genişletilmelidir.

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
};

// ============================================================
// FAZ 34 — Kalite, Test ve Yayına Hazırlık (POZ-DEV-321..340)
// ============================================================
export type CrashSeverity = 'info' | 'warning' | 'error' | 'fatal';
export interface CrashReport {
  id: string;
  occurredAt: string;
  severity: CrashSeverity;
  message: string;
  stack?: string;
  screen?: string;
  userId?: string;
  appVersion?: string;
  platform?: 'ios' | 'android' | 'web';
  handled: boolean;
}

export type FeedbackCategory = 'bug' | 'feature' | 'ui' | 'performance' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'planned' | 'closed';
export interface FeedbackEntry {
  id: string;
  createdAt: string;
  authorId?: string;
  authorName?: string;
  category: FeedbackCategory;
  title: string;
  message: string;
  rating?: number; // 1-5
  status: FeedbackStatus;
  screen?: string;
  appVersion?: string;
}

export interface ReleaseNote {
  id: string;
  version: string;
  releasedAt: string;
  highlights: string[];
  fixes: string[];
  knownIssues?: string[];
  channel: 'stable' | 'beta' | 'staging';
}

export interface PerformanceSample {
  id: string;
  screen: string;
  durationMs: number; // mount to first interaction
  recordedAt: string;
  userId?: string;
}

export type BuildEnvironment = 'production' | 'staging' | 'development';
export interface EnvironmentInfo {
  env: BuildEnvironment;
  apiBaseUrl: string;
  supabaseUrl?: string;
  buildNumber: string;
  appVersion: string;
}

// ============================================================
// FAZ 35 — Yetkilendirme, Denetim ve Kurumsal Yönetim (POZ-DEV-341..360)
// ============================================================
export interface Department {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  createdAt: string;
}

export interface Region {
  id: string;
  name: string;
  code?: string;
  cities?: string[];
  createdAt: string;
}

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export';
export type PermissionResource =
  | 'customer' | 'work_order' | 'quote' | 'task' | 'material' | 'vehicle'
  | 'payroll' | 'timesheet' | 'osos' | 'finance' | 'report' | 'user'
  | 'feedback' | 'crash' | 'release' | 'audit' | 'system';

export interface Permission {
  id: string;
  role: UserRoleExt;
  resource: PermissionResource;
  action: PermissionAction;
  allowed: boolean;
}

// Extended role set for Faz 35 (UI role matrix). Existing UserRole stays in AuthContext.
export type UserRoleExt = 'admin' | 'manager' | 'engineer' | 'field' | 'finance' | 'sales' | 'viewer';

export type ApprovalKind = 'delete' | 'discount' | 'bulk_assign' | 'payroll' | 'data_export' | 'permission_change' | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export interface ApprovalRequest {
  id: string;
  kind: ApprovalKind;
  title: string;
  description?: string;
  requestedBy?: string;
  requestedByName?: string;
  resource?: PermissionResource;
  resourceId?: string;
  payload?: Record<string, any>;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  requiredApprovals?: number;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'view_sensitive' | 'permission_change';
export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorId?: string;
  actorName?: string;
  action: AuditAction;
  resource: PermissionResource;
  resourceId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  note?: string;
}

export interface SessionLog {
  id: string;
  userId: string;
  userName?: string;
  startedAt: string;
  endedAt?: string;
  ip?: string;
  device?: string;
  platform?: 'ios' | 'android' | 'web';
  location?: string;
  suspicious?: boolean;
  reason?: string;
}

export type KvkkAccessKind = 'view' | 'export' | 'share' | 'delete';
export interface KvkkAccessLog {
  id: string;
  occurredAt: string;
  actorId?: string;
  actorName?: string;
  subjectId: string; // data subject (customer/employee)
  subjectName?: string;
  kind: KvkkAccessKind;
  reason?: string;
  fields?: string[];
}

// ============================================================
// FAZ 36 — Mobil Saha Deneyimi ve Offline Operasyon (POZ-DEV-371..390)
// ============================================================
export type OfflineOpKind =
  | 'work_order_update' | 'work_order_complete'
  | 'form_submit' | 'photo_attach' | 'signature_attach'
  | 'stock_move' | 'note' | 'custom';

export type OfflineOpStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface OfflineOperation {
  id: string;
  createdAt: string;
  kind: OfflineOpKind;
  resource: string; // resource type (e.g. work_order, stock)
  resourceId?: string;
  payload: Record<string, any>;
  status: OfflineOpStatus;
  attempts: number;
  lastError?: string;
  syncedAt?: string;
  conflictRemote?: Record<string, any>;
  authorId?: string;
  authorName?: string;
  description?: string;
}

export type SyncLogStatus = 'success' | 'partial' | 'failed';
export interface SyncLogEntry {
  id: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  ops: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  status: SyncLogStatus;
  note?: string;
}

export interface OfflineFavorite {
  id: string;
  label: string;
  icon: string;
  color: string;
  route: keyof RootStackParamList | string;
  params?: Record<string, any>;
  order: number;
}

export interface ConnectivitySample {
  at: string;
  online: boolean;
  effectiveType?: string; // wifi / 4g / 3g / 2g / unknown
  rttMs?: number;
}

export type FieldModePref = 'auto' | 'simple' | 'full';
export interface FieldUiPrefs {
  mode: FieldModePref;
  oneHanded: boolean;
  bigButtons: boolean;
  lowBandwidth: boolean;
  showGpsAccuracy: boolean;
  batterySaver: boolean;
  updatedAt: string;
}

// ============================================================
// FAZ 37 — Müşteri Deneyimi ve Dış Paylaşım (POZ-DEV-391..410)
// ============================================================
export type PortalUserStatus = 'active' | 'invited' | 'suspended';
export interface PortalUser {
  id: string;
  customerId: string;
  fullName: string;
  email: string;
  phone?: string;
  status: PortalUserStatus;
  invitedAt: string;
  lastLoginAt?: string;
  canViewQuotes: boolean;
  canViewWorkOrders: boolean;
  canViewReports: boolean;
  canApproveQuotes: boolean;
}

export type ShareLinkResource = 'quote' | 'work_order' | 'report' | 'document';
export type ShareLinkStatus = 'active' | 'expired' | 'revoked';
export interface ShareLink {
  id: string;
  token: string; // public token used in URL
  resource: ShareLinkResource;
  resourceId: string;
  title: string;
  createdBy?: string;
  createdAt: string;
  expiresAt?: string;
  maxOpens?: number;
  opens: number;
  password?: string;
  status: ShareLinkStatus;
  customerId?: string;
}

export interface ShareLinkAccessLog {
  id: string;
  linkId: string;
  occurredAt: string;
  ip?: string;
  userAgent?: string;
  result: 'opened' | 'denied' | 'expired';
  note?: string;
}

export type QuoteApprovalDecision = 'approved' | 'rejected' | 'revision_requested';
export interface QuoteApprovalRecord {
  id: string;
  quoteId: string;
  customerId?: string;
  portalUserId?: string;
  decidedAt: string;
  decision: QuoteApprovalDecision;
  note?: string;
  signatureDataUrl?: string;
}

export interface CustomerComment {
  id: string;
  customerId: string;
  resource?: ShareLinkResource;
  resourceId?: string;
  authorName: string;
  body: string;
  createdAt: string;
  rating?: number; // 1-5 for service feedback
  resolved?: boolean;
}

export type SurveyStatus = 'draft' | 'sent' | 'completed' | 'declined';
export interface SatisfactionSurvey {
  id: string;
  customerId: string;
  workOrderId?: string;
  sentAt: string;
  completedAt?: string;
  status: SurveyStatus;
  ratingOverall?: number; // 1-5
  ratingTimeliness?: number;
  ratingProfessionalism?: number;
  ratingCommunication?: number;
  comments?: string;
}

export interface CustomerNotificationPref {
  customerId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  monthlyReport: boolean;
  serviceCompleted: boolean;
  quoteSent: boolean;
  paymentReminder: boolean;
  updatedAt: string;
}

export interface AutoReportSchedule {
  id: string;
  name: string;
  customerId?: string; // empty = all customers
  cadence: 'weekly' | 'monthly' | 'quarterly';
  reportKind: 'summary' | 'work_orders' | 'finance' | 'sla';
  nextRunAt: string;
  lastRunAt?: string;
  enabled: boolean;
}

// ============================================================
// FAZ 38 — Gelişmiş Raporlama, BI ve Karar Destek (POZ-DEV-421..440)
// ============================================================
export type KpiDirection = 'up_is_good' | 'down_is_good' | 'neutral';
export interface KpiCard {
  id: string;
  label: string;
  value: number;
  unit?: string;
  target?: number;
  direction: KpiDirection;
  trendPct?: number;
  category: 'finance' | 'operations' | 'sales' | 'fleet' | 'hr' | 'customer';
  updatedAt: string;
}

export interface DepartmentKpiSnapshot {
  id: string;
  departmentId: string;
  departmentName: string;
  period: string; // YYYY-MM
  revenue: number;
  cost: number;
  margin: number;
  jobsCompleted: number;
  slaSuccessPct: number;
  updatedAt: string;
}

export interface StaffPerformanceRecord {
  id: string;
  userId: string;
  fullName: string;
  period: string;
  jobsAssigned: number;
  jobsCompleted: number;
  avgCompletionHours: number;
  ratingAvg: number; // 1-5
  punctualityPct: number;
}

export interface VehicleCostRecord {
  id: string;
  vehicleId: string;
  plate: string;
  period: string;
  fuelLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  repairCost: number;
  km: number;
  cph: number; // cost per hundred km
}

export interface StockConsumptionRow {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  period: string;
  quantity: number;
  cost: number;
  jobsCount: number;
}

export type QuoteWinReason = 'price' | 'delivery' | 'reference' | 'tech' | 'service' | 'other';
export type QuoteLossReason = 'price_high' | 'delivery_long' | 'no_capacity' | 'competitor' | 'no_budget' | 'other';
export interface QuoteOutcomeRow {
  id: string;
  quoteId: string;
  customerId?: string;
  decidedAt: string;
  outcome: 'won' | 'lost';
  amount: number;
  reason?: QuoteWinReason | QuoteLossReason;
  note?: string;
}

export interface CustomerProfitRow {
  customerId: string;
  customerName: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  workOrderCount: number;
  lastEngagementAt?: string;
}

export interface SlaResultRow {
  id: string;
  workOrderId: string;
  customerId?: string;
  targetHours: number;
  actualHours: number;
  success: boolean;
  recordedAt: string;
  category?: string;
}

export interface RegionHeatPoint {
  id: string;
  regionId?: string;
  regionName: string;
  lat: number;
  lng: number;
  intensity: number; // 0..1 normalized weight
  jobCount: number;
}

export interface BudgetVsActualRow {
  id: string;
  category: string;
  period: string;
  planned: number;
  actual: number;
  variance: number; // actual - planned
  variancePct: number;
}

export interface ExecutiveSummary {
  id: string;
  period: string;
  generatedAt: string;
  highlights: string[];
  warnings: string[];
  kpiSnapshot: { label: string; value: number; unit?: string }[];
}

// ============================================================
// FAZ 39 — Kurumsal Entegrasyonlar
// ============================================================

export type ErpVendor = 'logo' | 'mikro' | 'netsis' | 'custom';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type SyncDirection = 'pull' | 'push' | 'bidirectional';

export interface ErpConnection {
  id: string;
  vendor: ErpVendor;
  name: string;
  baseUrl?: string;
  apiKey?: string;
  status: IntegrationStatus;
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
}

export type ErpEntityKind = 'customer' | 'stock' | 'invoice' | 'order';

export interface ErpSyncJob {
  id: string;
  connectionId: string;
  vendor: ErpVendor;
  entity: ErpEntityKind;
  direction: SyncDirection;
  status: 'queued' | 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt?: string;
  itemsTotal: number;
  itemsOk: number;
  itemsFail: number;
  errorMessage?: string;
}

export interface ErpCustomerMapping {
  id: string;
  vendor: ErpVendor;
  externalCode: string;
  localCustomerId: string;
  customerName: string;
  syncedAt: string;
}

export interface ErpStockMapping {
  id: string;
  vendor: ErpVendor;
  externalCode: string;
  sku: string;
  name: string;
  unit: string;
  stockQty: number;
  unitPrice: number;
  syncedAt: string;
}

export interface ErpInvoiceDraft {
  id: string;
  vendor: ErpVendor;
  customerCode: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  lineCount: number;
  createdAt: string;
  externalId?: string;
}

export interface QuoteOrderConversion {
  id: string;
  quoteId: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  vendor: ErpVendor;
  createdAt: string;
  status: 'created' | 'pending' | 'failed';
}

export type CrmProvider = 'hubspot' | 'salesforce' | 'zoho' | 'pipedrive' | 'custom';

export interface CrmConnection {
  id: string;
  provider: CrmProvider;
  name: string;
  apiKey?: string;
  status: IntegrationStatus;
  lastSyncAt?: string;
  importedContacts: number;
}

export interface IntegrationWebhook {
  id: string;
  name: string;
  url: string;
  event: string;
  secret?: string;
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: string;
  httpStatus: number;
  responseBody?: string;
  durationMs: number;
  deliveredAt: string;
  success: boolean;
}

export interface IntegrationApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
  usageCount: number;
}

export interface ApiUsageLog {
  id: string;
  apiKeyId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  occurredAt: string;
}

export interface IntegrationErrorLog {
  id: string;
  source: string;
  message: string;
  details?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  occurredAt: string;
  resolved: boolean;
}

export interface IntegrationHealth {
  id: string;
  service: string;
  status: IntegrationStatus;
  latencyMs?: number;
  uptimePct?: number;
  checkedAt: string;
  message?: string;
}

// FAZ 40 — Ölçeklenebilirlik, Bakım, Ürünleşme
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'expired';
export type PackagePlan = 'starter' | 'pro' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  plan: PackagePlan;
  status: TenantStatus;
  createdAt: string;
  expiresAt?: string;
  memberCount: number;
  storageMb: number;
  isCurrent?: boolean;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  joinedAt: string;
}

export interface TenantSetting {
  id: string;
  tenantId: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface AppModule {
  id: string;
  code: string;
  name: string;
  category: 'core' | 'finance' | 'field' | 'analytics' | 'integration';
  enabled: boolean;
  requiredPlan: PackagePlan;
}

export interface PackageDefinition {
  id: PackagePlan;
  name: string;
  monthlyPrice: number;
  maxUsers: number;
  maxStorageMb: number;
  modules: string[];
  isCurrent?: boolean;
}

export interface LicenseRecord {
  id: string;
  tenantId: string;
  plan: PackagePlan;
  seats: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface UsageMetric {
  id: string;
  metric: 'users' | 'storage_mb' | 'api_calls' | 'workorders' | 'sms';
  current: number;
  limit: number;
  resetAt?: string;
}

export interface DbIndexHint {
  id: string;
  table: string;
  column: string;
  suggested: boolean;
  rowCount: number;
  estimatedGainPct: number;
  applied: boolean;
}

export interface ArchivePolicy {
  id: string;
  entity: 'workorders' | 'services' | 'quotes' | 'expenses' | 'logs';
  olderThanDays: number;
  active: boolean;
  lastRunAt?: string;
  archivedCount: number;
}

export interface ArchiveJob {
  id: string;
  entity: string;
  movedCount: number;
  startedAt: string;
  finishedAt?: string;
  status: 'queued' | 'running' | 'success' | 'failed';
}

export interface PlatformBackup {
  id: string;
  startedAt: string;
  finishedAt?: string;
  sizeMb: number;
  status: 'success' | 'failed' | 'running';
  location: 'local' | 'cloud';
  errorMessage?: string;
}

export interface RestoreTest {
  id: string;
  backupId: string;
  runAt: string;
  durationSec: number;
  success: boolean;
  message?: string;
}

export type SystemHealthStatus = 'ok' | 'warn' | 'down';

export interface SystemHealthCheck {
  id: string;
  component: 'database' | 'storage' | 'auth' | 'jobs' | 'notifications' | 'integrations';
  status: SystemHealthStatus;
  latencyMs?: number;
  checkedAt: string;
  message?: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  message: string;
  active: boolean;
  affectsAll: boolean;
}

// === FAZ 41 — AI Destekli Akıllı Saha Asistanı ===
export type AiAssistantProvider = 'openai' | 'anthropic' | 'gemini' | 'local';
export type AiRole = 'user' | 'assistant' | 'system';
export type AiUserRole = 'admin' | 'manager' | 'staff' | 'sales';
export type AiFeature =
  | 'chat' | 'poz_suggest' | 'quote_draft' | 'workorder_summary'
  | 'customer_summary' | 'risk_analysis' | 'daily_report' | 'logs';

export interface AiPermission {
  id: string;
  role: AiUserRole;
  feature: AiFeature;
  enabled: boolean;
}

export interface AiSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  feature: AiFeature;
  messageCount: number;
  tokenTotal: number;
}

export interface AiMessage {
  id: string;
  sessionId: string;
  role: AiRole;
  content: string;
  createdAt: string;
  tokens?: number;
  sources?: string[];
  approved?: boolean;
}

export interface AiPozSuggestion {
  id: string;
  description: string;
  pozCode: string;
  pozName: string;
  confidence: number; // 0..1
  unitPrice: number;
  createdAt: string;
  accepted?: boolean;
}

export interface AiQuoteDraft {
  id: string;
  customerName: string;
  surveyText: string;
  items: {
    pozCode: string;
    pozName: string;
    qty: number;
    unitPrice: number;
    unit?: string;          // Adet | Mt | m² ...
    confidence?: number;    // 0–1 eşleşme güveni
    needsPrice?: boolean;   // POZ eşleşmedi → fiyat manuel girilmeli (uydurma yok)
  }[];
  totalAmount: number;
  createdAt: string;
  status: 'draft' | 'approved' | 'rejected';
}

export interface AiWorkOrderSummary {
  id: string;
  workOrderId: string;
  summary: string;
  highlights: string[];
  createdAt: string;
}

export interface AiCustomerInsight {
  id: string;
  customerId: string;
  customerName: string;
  summary: string;
  quotesCount: number;
  workOrdersCount: number;
  totalRevenue: number;
  lastVisitAt?: string;
  createdAt: string;
}

export type AiRiskType = 'delay' | 'sla' | 'low_stock' | 'vehicle_maintenance' | 'customer_churn';
export type AiRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AiRiskAlert {
  id: string;
  type: AiRiskType;
  level: AiRiskLevel;
  title: string;
  message: string;
  createdAt: string;
  dismissed?: boolean;
}

export interface AiDailyReport {
  id: string;
  date: string;
  text: string;
  metrics: { label: string; value: string }[];
  createdAt: string;
}

export interface AiUsageLog {
  id: string;
  sessionId?: string;
  feature: AiFeature;
  provider: AiAssistantProvider;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  durationMs: number;
  createdAt: string;
  success: boolean;
  errorMessage?: string;
}

// === FAZ 42 — Saha Operasyon Mükemmelleştirme ===
export type FieldShiftStatus = 'idle' | 'on_shift' | 'on_break' | 'finished';
export type FieldJobStage = 'assigned' | 'enroute' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
export type FieldPriority = 'low' | 'normal' | 'high' | 'urgent';
export type FieldChecklistType = 'photo' | 'signature' | 'form' | 'location' | 'note';

export interface FieldShift {
  id: string;
  userId: string;
  userName: string;
  status: FieldShiftStatus;
  startedAt?: string;
  endedAt?: string;
  totalMinutes: number;
  breakMinutes: number;
  remoteShiftId?: string | null; // Supabase shifts.id (canlı mesai takibi için)
}

export interface FieldJob {
  id: string;
  workOrderId?: string;
  customerName: string;
  address: string;
  lat?: number;
  lng?: number;
  priority: FieldPriority;
  stage: FieldJobStage;
  slaAt?: string;
  assignedUserId: string;
  assignedUserName: string;
  scheduledAt: string;
  startedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  zoneId?: string;
  estimatedMinutes: number;
}

export interface FieldChecklistItem {
  id: string;
  jobId: string;
  type: FieldChecklistType;
  label: string;
  required: boolean;
  done: boolean;
  doneAt?: string;
  photoUri?: string;
  formValue?: string;
}

export interface FieldQualityCheck {
  id: string;
  jobId: string;
  customerScore?: number; // 1..5
  workScore?: number;
  cleanlinessScore?: number;
  notes?: string;
  passed: boolean;
  reviewedAt: string;
  reviewedBy: string;
}

export interface FieldPerformance {
  userId: string;
  userName: string;
  onTimeRate: number; // 0..100
  qualityScore: number; // 0..100
  customerScore: number; // 0..100
  totalJobs: number;
  totalOnTime: number;
  totalRating: number;
  rank?: number;
}

export interface FieldZone {
  id: string;
  name: string;
  color: string;
  leaderUserId?: string;
  leaderUserName?: string;
  memberCount: number;
  activeJobs: number;
}

export interface FieldShiftPlan {
  id: string;
  zoneId: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string;
  notes?: string;
}

export interface FieldEmergencyDispatch {
  id: string;
  title: string;
  address: string;
  lat?: number;
  lng?: number;
  createdAt: string;
  dispatchedUserId?: string;
  dispatchedUserName?: string;
  etaMinutes?: number;
  status: 'pending' | 'dispatched' | 'arrived' | 'resolved' | 'cancelled';
  priority: FieldPriority;
}

export interface FieldOpsLiveStat {
  id: string;
  label: string;
  value: number;
  color: string;
  icon: string;
}

// === FAZ 43 — Akıllı Teklif, Keşif ve Metraj ===
export type SurveyItemKind = 'product' | 'cable' | 'panel' | 'service' | 'labor';
export type QuoteEngineType = 'hv_transformer' | 'periodic_check' | 'ges' | 'compensation';
export type QuoteLostReason = 'price' | 'timing' | 'competitor' | 'scope' | 'no_response' | 'other';
export type QuoteOutcome = 'won' | 'lost' | 'pending';

export interface SurveyForm {
  id: string;
  customerId?: string;
  customerName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  items: SurveyItem[];
}
export interface SurveyItem {
  id: string;
  kind: SurveyItemKind;
  description: string;
  unit: string;
  qty: number;
  unitPrice?: number;
  pozCode?: string;
}

export interface PozLibraryItem {
  id: string;
  code: string;
  category: string;
  name: string;
  unit: string;
  laborCost: number;
  materialCost: number;
  description?: string;
  active: boolean;
}

export interface PriceListVersion {
  id: string;
  version: string;
  name: string;
  createdAt: string;
  activeFrom: string;
  isCurrent: boolean;
  itemCount: number;
  notes?: string;
}

export interface QuoteCalculation {
  id: string;
  quoteId?: string;
  baseAmount: number;
  laborCost: number;
  materialCost: number;
  overheadRate: number; // %
  riskRate: number; // %
  profitRate: number; // %
  discountRate: number; // %
  taxRate: number; // %
  subTotal: number;
  totalWithTax: number;
  createdAt: string;
}

export interface HvTransformerQuoteInput {
  id: string;
  customerName: string;
  transformerKva: number;
  count: number;
  region: 'Marmara' | 'Ege' | 'İç Anadolu' | 'Akdeniz' | 'Karadeniz' | 'Doğu Anadolu' | 'GD Anadolu';
  has24h7: boolean;
  monthlyFee: number;
  yearlyFee: number;
  createdAt: string;
}

export interface PeriodicCheckQuoteInput {
  id: string;
  customerName: string;
  panelCount: number;
  measurementCount: number;
  groundCount: number;
  basePrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface SqGesQuoteInput {
  id: string;
  customerName: string;
  capacityKwp: number;
  pricePerKwp: number;
  installationDays: number;
  totalPrice: number;
  createdAt: string;
}

export interface CompensationQuoteInput {
  id: string;
  customerName: string;
  reactivePowerKvar: number;
  pricePerKvar: number;
  panelCount: number;
  totalPrice: number;
  createdAt: string;
}

export interface QuoteRevisionDiff {
  id: string;
  baseQuoteId: string;
  revisionQuoteId: string;
  basePrice: number;
  revisionPrice: number;
  delta: number;
  deltaPercent: number;
  addedItems: number;
  removedItems: number;
  changedItems: number;
  createdAt: string;
}

export interface QuoteOutcomeRecord {
  id: string;
  quoteId: string;
  customerName: string;
  amount: number;
  outcome: QuoteOutcome;
  reason?: QuoteLostReason;
  competitorName?: string;
  notes?: string;
  decidedAt: string;
}

export interface AiQuoteImprovementSuggestion {
  id: string;
  quoteId?: string;
  customerName: string;
  category: 'price' | 'scope' | 'wording' | 'discount' | 'timing';
  suggestion: string;
  impactScore: number; // 0..100
  createdAt: string;
}

// === FAZ 44 — Akıllı Harita, Rota ve Canlı Operasyon ===
export type LiveOpsEntityKind = 'personnel' | 'vehicle' | 'job' | 'site';
export type PersonnelLiveStatus = 'available' | 'on_job' | 'break' | 'offline';

export interface LiveOpsEntity {
  id: string;
  kind: LiveOpsEntityKind;
  name: string;
  lat: number;
  lng: number;
  status?: string;
  lastSeen: string;
}
export interface JobHeatPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number; // 1..10
  region: string;
  jobCount: number;
}
export interface PersonnelAvailabilityRecord {
  id: string;
  name: string;
  status: PersonnelLiveStatus;
  since: string;
  currentJobId?: string;
  currentCustomer?: string;
}
export interface SmartRouteStop {
  jobId: string;
  customerName: string;
  address: string;
  etaMin: number;
  distanceKm: number;
}
export interface SmartRouteSuggestion {
  id: string;
  personnelName: string;
  stops: SmartRouteStop[];
  totalKm: number;
  totalMin: number;
  optimizedFrom: number; // baseline minutes
  savingsMin: number;
  createdAt: string;
}
export interface EtaEstimateRecord {
  id: string;
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
  baseMin: number;
  trafficMin: number;
  etaMin: number;
  createdAt: string;
}
export interface RouteDeviationAlert {
  id: string;
  personnelName: string;
  deviationKm: number;
  expectedRoute: string;
  lastKnown: string;
  alertAt: string;
  resolved: boolean;
}
export interface SiteEventLog {
  id: string;
  personnelName: string;
  customerName: string;
  kind: 'arrival' | 'departure';
  at: string;
  jobId?: string;
}
export interface TeamPerformanceStat {
  id: string;
  teamName: string;
  jobsToday: number;
  onTimeRate: number; // 0..100
  avgKm: number;
  score: number; // 0..100
}
export interface OperationReplayFrame {
  id: string;
  timestamp: string;
  positions: { name: string; lat: number; lng: number }[];
}

// ---------- Faz 45 — Kurumsal Kalite, Denetim ve Uygunsuzluk ----------
export type NonConformityKind = 'safety' | 'quality' | 'process' | 'documentation' | 'environmental';
export type NonConformitySeverity = 'low' | 'medium' | 'high' | 'critical';
export type NonConformityStatus = 'open' | 'in_progress' | 'closed' | 'overdue';
export interface NonConformityRecord {
  id: string;
  code: string;
  kind: NonConformityKind;
  severity: NonConformitySeverity;
  title: string;
  description: string;
  location: string;
  reportedBy: string;
  reportedAt: string;
  status: NonConformityStatus;
  assignedTo?: string;
  dueAt?: string;
  closedAt?: string;
  photoUris: string[];
}

export type CapaKind = 'corrective' | 'preventive';
export type CapaStatus = 'planned' | 'in_progress' | 'done';
export interface CapaRecord {
  id: string;
  ncId: string;
  ncTitle?: string;
  kind: CapaKind;
  description: string;
  owner: string;
  plannedAt: string;
  completedAt?: string;
  status: CapaStatus;
  effectiveness?: number; // 1..5
}

export interface SafetyChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  note?: string;
}
export interface SafetyChecklist {
  id: string;
  title: string;
  location: string;
  performedBy: string;
  performedAt: string;
  items: SafetyChecklistItem[];
  score: number; // 0..100
  passed: boolean;
}

export interface RiskAssessment {
  id: string;
  hazard: string;
  location: string;
  likelihood: number; // 1..5
  severity: number; // 1..5
  score: number; // likelihood*severity
  controls: string;
  residualScore: number;
  owner: string;
  createdAt: string;
}

export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'overdue';
export interface AuditScheduleEntry {
  id: string;
  title: string;
  auditor: string;
  scope: string;
  plannedAt: string;
  status: AuditStatus;
}

export interface AuditScoreSection {
  name: string;
  score: number;
  maxScore: number;
}
export interface AuditReport {
  id: string;
  auditTitle: string;
  auditor: string;
  performedAt: string;
  totalScore: number;
  maxScore: number;
  percent: number;
  sections: AuditScoreSection[];
  findings: string[];
}

export interface QualityDashboardStat {
  openCount: number;
  overdueCount: number;
  closedThisMonth: number;
  avgClosureDays: number;
  repeatRate: number;
  byKind: { kind: NonConformityKind; count: number }[];
  byStatus: { status: NonConformityStatus; count: number }[];
}

// ---------- Faz 46 — Ekipman, Varlık ve Bakım Yönetimi ----------
export type EqAssetType = 'transformer' | 'panel' | 'meter' | 'inverter' | 'ups' | 'generator' | 'compensation' | 'cable' | 'other';
export type EqAssetStatus = 'active' | 'maintenance' | 'broken' | 'retired';
export interface EqAsset {
  id: string;
  code: string;
  type: EqAssetType;
  name: string;
  customerName: string;
  location: string;
  brand: string;
  model: string;
  serialNo: string;
  capacity?: string;
  installedAt: string;
  warrantyUntil?: string;
  serviceUntil?: string;
  status: EqAssetStatus;
  qrPayload: string;
  notes?: string;
}

export type EqMaintenanceKind = 'periodic' | 'breakdown' | 'inspection';
export interface EqMaintenanceRecord {
  id: string;
  assetId: string;
  assetName?: string;
  kind: EqMaintenanceKind;
  performedAt: string;
  performedBy: string;
  description: string;
  cost: number;
  parts?: string[];
  nextDueAt?: string;
}

export type EqFaultSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface EqFaultRecord {
  id: string;
  assetId: string;
  assetName?: string;
  occurredAt: string;
  severity: EqFaultSeverity;
  description: string;
  downtimeHours: number;
  resolvedAt?: string;
  resolution?: string;
  cost: number;
}

export interface EqMaintenancePlan {
  id: string;
  assetId: string;
  assetName?: string;
  taskDescription: string;
  intervalDays: number;
  nextDueAt: string;
  lastPerformedAt?: string;
  owner: string;
}

export interface EqCostStat {
  assetId: string;
  assetName: string;
  assetType: EqAssetType;
  totalMaintenanceCost: number;
  totalFaultCost: number;
  totalDowntimeHours: number;
  maintenanceCount: number;
  faultCount: number;
}

export type EqServiceCardEventKind = 'install' | 'maintenance' | 'fault' | 'warranty' | 'inspection';
export interface EqServiceCardEvent {
  id: string;
  assetId: string;
  kind: EqServiceCardEventKind;
  label: string;
  at: string;
  by?: string;
  cost?: number;
}

// ---------- Faz 47 — Üst Düzey Yönetim ve Stratejik Dashboard ----------
export interface ExecKpiCard {
  key: string;
  label: string;
  value: number;
  unit: '₺' | '%' | 'adet' | 'gün' | 'saat';
  deltaPct: number;
  trend: 'up' | 'down' | 'flat';
  color: string;
}
export interface OpsHealthScoreSnapshot {
  date: string;
  overall: number;
  dimensions: { name: string; score: number; weight: number; trend: 'up' | 'down' | 'flat' }[];
  insights: string[];
}
export interface ProfitableCustomerEntry {
  customerId: string;
  customerName: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  jobsCount: number;
}
export interface CostlyWorkOrderEntry {
  workOrderId: string;
  title: string;
  customerName: string;
  totalCost: number;
  laborCost: number;
  materialCost: number;
  overrunPct: number;
  durationHours: number;
}
export interface EmployeeProductivityEntry {
  employeeId: string;
  employeeName: string;
  jobsCompleted: number;
  hoursWorked: number;
  revenueGenerated: number;
  efficiencyScore: number;
  ranking: number;
}
export interface VehicleProductivityEntry {
  vehicleId: string;
  plate: string;
  brand: string;
  kmTotal: number;
  fuelCost: number;
  maintenanceCost: number;
  jobsServed: number;
  costPerJob: number;
  ranking: number;
}
export interface StockTurnoverEntry {
  productId: string;
  productName: string;
  category: string;
  stockOnHand: number;
  turnoverPerYear: number;
  daysOnHand: number;
  trend: 'up' | 'down' | 'flat';
}
export interface QuoteConversionEntry {
  period: string;
  sent: number;
  accepted: number;
  rejected: number;
  pending: number;
  conversionPct: number;
  avgClosureDays: number;
}
export interface AiExecBullet {
  id: string;
  severity: 'info' | 'warning' | 'critical' | 'opportunity';
  category: string;
  text: string;
  actionLabel?: string;
  actionRoute?: string;
}
export interface AiExecSummary {
  generatedAt: string;
  headline: string;
  bullets: AiExecBullet[];
  kpiSnapshot: { revenue: number; profit: number; openJobs: number; overdueQuotes: number };
}

// ---------- Faz 48 — Müşteri Portalı 2.0 ----------
export interface CpDashboardSummary {
  customerId: string;
  customerName: string;
  openJobs: number;
  pendingQuotes: number;
  unreadDocs: number;
  outstandingBalance: number;
  satisfactionScore: number;
  lastVisit?: string;
}
export interface CpQuoteCard {
  id: string;
  number: string;
  title: string;
  total: number;
  validUntil: string;
  status: 'pending' | 'approved' | 'rejected';
  sentAt: string;
  customerComment?: string;
}
export type CpWoStatus = 'planned' | 'in_progress' | 'completed' | 'awaiting_signature';
export interface CpWorkOrderProgress {
  id: string;
  number: string;
  title: string;
  status: CpWoStatus;
  progressPct: number;
  assignedTo: string;
  scheduledAt: string;
  location: string;
  steps: { label: string; done: boolean }[];
}
export type CpRequestUrgency = 'low' | 'normal' | 'high' | 'critical';
export type CpRequestStatus = 'new' | 'in_review' | 'scheduled' | 'closed';
export interface CpServiceRequest {
  id: string;
  title: string;
  description: string;
  urgency: CpRequestUrgency;
  status: CpRequestStatus;
  createdAt: string;
  scheduledAt?: string;
  closedAt?: string;
}
export type CpDocumentKind = 'quote' | 'invoice' | 'report' | 'photo' | 'contract' | 'certificate';
export interface CpDocumentItem {
  id: string;
  kind: CpDocumentKind;
  title: string;
  sizeKb: number;
  uploadedAt: string;
  unread: boolean;
}
export interface CpSatisfactionEntry {
  id: string;
  workOrderTitle: string;
  rating: number;
  comment?: string;
  createdAt: string;
  category: 'praise' | 'complaint' | 'neutral';
}
export interface CpNotification {
  id: string;
  category: 'quote' | 'workorder' | 'invoice' | 'report' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
export interface CpBrandingConfig {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  logoEmoji: string;
  greeting: string;
  footerText: string;
}
export interface CpShareLinkSecurityPolicy {
  defaultExpiryHours: number;
  requirePassword: boolean;
  watermarkPdfs: boolean;
  logAllAccess: boolean;
  maxDownloads: number;
  ipRestriction: boolean;
  recentLogs: { id: string; resource: string; viewerIp: string; at: string; action: 'view' | 'download' | 'fail' }[];
}

// Faz 49 — Güvenlik, KVKK ve Kurumsal Dayanıklılık
export type SecSensitivity = 'public' | 'internal' | 'confidential' | 'pii' | 'phi';
export interface SecClassificationItem {
  id: string;
  field: string;
  table: string;
  sensitivity: SecSensitivity;
  recordCount: number;
  encrypted: boolean;
  description?: string;
}
export type KvkkRequestType = 'access' | 'erasure' | 'rectification' | 'portability' | 'objection';
export type KvkkRequestStatus = 'pending' | 'in_progress' | 'fulfilled' | 'rejected';
export interface KvkkRequest {
  id: string;
  type: KvkkRequestType;
  requesterName: string;
  requesterEmail: string;
  requestedAt: string;
  status: KvkkRequestStatus;
  dueDate: string;
  notes?: string;
}
export type SecJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export interface DataExportJob {
  id: string;
  userName: string;
  format: 'json' | 'csv' | 'pdf';
  status: SecJobStatus;
  requestedAt: string;
  completedAt?: string;
  sizeMb?: number;
}
export interface DataErasureJob {
  id: string;
  userName: string;
  scope: 'full' | 'anonymize' | 'partial';
  status: SecJobStatus;
  requestedAt: string;
  completedAt?: string;
  affectedRecords?: number;
}
export interface SecDevice {
  id: string;
  userName: string;
  device: string;
  os: string;
  ip: string;
  location: string;
  lastSeen: string;
  current: boolean;
}
export type SuspiciousSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface SuspiciousActivity {
  id: string;
  type: 'login_anomaly' | 'data_dump' | 'permission_escalation' | 'unusual_hour' | 'failed_attempts';
  severity: SuspiciousSeverity;
  user: string;
  at: string;
  description: string;
  resolved: boolean;
}
export type AdminAlertSeverity = 'info' | 'warning' | 'critical';
export interface AdminAlert {
  id: string;
  kind: 'role_change' | 'mass_delete' | 'export' | 'config_change' | 'failed_backup' | 'security';
  title: string;
  body: string;
  severity: AdminAlertSeverity;
  at: string;
  ack: boolean;
}
export interface BackupReport {
  id: string;
  takenAt: string;
  sizeMb: number;
  verified: boolean;
  durationSec: number;
  retentionDays: number;
  type: 'full' | 'incremental';
}
export interface DrPlanStep {
  order: number;
  title: string;
  responsible: string;
  estimatedMinutes: number;
  done: boolean;
}
export interface DrPlan {
  rpoMinutes: number;
  rtoMinutes: number;
  lastDrillAt?: string;
  lastDrillSuccess?: boolean;
  steps: DrPlanStep[];
}
export type SecHealthStatus = 'ok' | 'warn' | 'fail';
export interface SecHealthItem {
  label: string;
  status: SecHealthStatus;
  detail: string;
  category: 'auth' | 'data' | 'backup' | 'monitoring' | 'compliance';
}
export interface SecHealth {
  score: number;
  generatedAt: string;
  items: SecHealthItem[];
}

// FAZ 50 — Ürünleşme, SaaS ve Çoklu Firma Altyapısı
export type SaasTenantStatus = 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';
export type SaasPlanCode = 'basic' | 'pro' | 'enterprise';
export type SaasBillingCycle = 'monthly' | 'yearly';

export interface SaasTenantSummary {
  id: string;
  name: string;
  plan: SaasPlanCode;
  status: SaasTenantStatus;
  ownerEmail: string;
  createdAt: string;
  trialEndsAt?: string;
  licenseEndsAt: string;
  mrr: number;
  users: number;
  storageMb: number;
  isCurrent?: boolean;
}

export interface SaasIsolationCheck {
  id: string;
  table: string;
  scope: 'tenant' | 'user' | 'global';
  rowsLeaked: number;
  policy: 'rls' | 'app' | 'none';
  ok: boolean;
}

export interface SaasModuleToggle {
  id: string;
  code: string;
  name: string;
  category: 'core' | 'finance' | 'field' | 'analytics' | 'integration' | 'ai';
  enabled: boolean;
  availableIn: SaasPlanCode[];
  description: string;
}

export interface SaasPackageFeature { code: string; included: boolean; limit?: number; }
export interface SaasPackage {
  code: SaasPlanCode;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  color: string;
  maxUsers: number;
  maxWorkOrdersMonth: number;
  maxStorageGb: number;
  maxAiTokensMonth: number;
  features: SaasPackageFeature[];
  popular?: boolean;
}

export interface SaasLicense {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: SaasPlanCode;
  startsAt: string;
  endsAt: string;
  seats: number;
  cycle: SaasBillingCycle;
  autoRenew: boolean;
  status: 'active' | 'expiring' | 'expired' | 'cancelled';
}

export interface SaasUsageMetric {
  id: string;
  metric: 'users' | 'workorders' | 'storage_mb' | 'ai_tokens' | 'sms' | 'api_calls';
  label: string;
  current: number;
  limit: number;
  resetAt?: string;
  unit: string;
}

export interface SaasBrandingConfig {
  tenantId: string;
  tenantName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  loginBg?: string;
  emailFromName: string;
  customDomain?: string;
  customDomainVerified: boolean;
}

export type SaasInvoiceStatus = 'paid' | 'open' | 'overdue' | 'void';
export interface SaasInvoice {
  id: string;
  number: string;
  tenantName: string;
  amount: number;
  status: SaasInvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  period: string;
  plan: SaasPlanCode;
}

export interface SaasSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: SaasPlanCode;
  cycle: SaasBillingCycle;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  nextBillingAt: string;
  mrr: number;
  paymentMethod: 'card' | 'transfer' | 'invoice';
  cardLast4?: string;
}

export interface SaasSuperAdminMetric {
  label: string;
  value: string;
  delta?: number;
  icon: string;
  color: string;
}

export interface SaasTenantHealth {
  tenantId: string;
  tenantName: string;
  score: number;
  status: 'healthy' | 'at_risk' | 'churning';
  lastLoginDaysAgo: number;
  activeUsers7d: number;
  workOrdersThisMonth: number;
  usagePctOfLimit: number;
  churnRiskFactors: string[];
}

// FAZ 51 — Yayına Alma, Derleme ve Platform Kontrolü
export type DepCheckStatus = 'ok' | 'warn' | 'fail' | 'pending';
export interface DepEnvVar {
  id: string;
  key: string;
  scope: 'mobile' | 'web' | 'server' | 'all';
  required: boolean;
  set: boolean;
  masked?: string;
  description: string;
}
export interface DepSupabaseConfig {
  projectUrl: string;
  anonKeySet: boolean;
  serviceRoleSet: boolean;
  region: string;
  dbSize: string;
  monthlyEgress: string;
  authProviders: string[];
  status: DepCheckStatus;
}
export interface DepRlsPolicy {
  id: string;
  table: string;
  policy: string;
  command: 'select' | 'insert' | 'update' | 'delete' | 'all';
  enabled: boolean;
  checkPassed: boolean;
  rowsAffected: number;
}
export interface DepStorageBucket {
  id: string;
  name: string;
  public: boolean;
  sizeMb: number;
  fileCount: number;
  policies: number;
  uploadTestOk: boolean;
}
export interface DepNetlifyDeploy {
  id: string;
  status: 'ready' | 'building' | 'error' | 'queued';
  branch: string;
  commit: string;
  message: string;
  durationSec: number;
  createdAt: string;
  publishUrl?: string;
}
export interface DepBuildError {
  id: string;
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
  platform: 'web' | 'mobile';
  category: 'typescript' | 'lint' | 'dependency' | 'config' | 'asset';
  fixed: boolean;
}
export interface DepAiProvider {
  id: string;
  name: string;
  model: string;
  apiKeySet: boolean;
  priority: number;
  fallback: boolean;
  status: 'active' | 'inactive' | 'degraded';
  latencyMs: number;
  successRate: number;
  costPer1kTokens: number;
}
export interface DepAiRateLimit {
  id: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  requestsPerMin: number;
  tokensPerDay: number;
  enabled: boolean;
}
export interface DepAiRequestLog {
  id: string;
  at: string;
  user: string;
  role: string;
  provider: string;
  tokens: number;
  durationMs: number;
  status: 'ok' | 'rate_limited' | 'error';
}
export interface DepApkBuild {
  id: string;
  version: string;
  versionCode: number;
  buildNumber: string;
  profile: 'preview' | 'production';
  sizeMb: number;
  builtAt: string;
  status: 'completed' | 'failed' | 'in_progress';
  downloadUrl?: string;
  installTestPassed: boolean;
  smokeTestPassed: boolean;
  notes?: string;
}

// Faz 52 — Hata Temizliği, Refactor ve Kod Kalitesi (Qa* prefix)
export type QaSeverity = 'error' | 'warning' | 'info';
export type QaStatus = 'open' | 'fixed' | 'ignored';
export interface QaConsoleLog {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  source: string;
  count: number;
  lastSeen: string;
  status: QaStatus;
}
export interface QaUnusedFile {
  id: string;
  path: string;
  kind: 'component' | 'hook' | 'service' | 'util' | 'screen' | 'type';
  sizeKb: number;
  lastModified: string;
  removable: boolean;
}
export interface QaSharedComponent {
  id: string;
  name: string;
  category: 'form' | 'table' | 'modal' | 'button' | 'card' | 'state';
  usageCount: number;
  filesUsing: number;
  refactored: boolean;
  description: string;
}
export interface QaApiErrorRule {
  id: string;
  pattern: string;
  category: 'network' | 'auth' | 'validation' | 'server' | 'timeout';
  userMessage: string;
  retryable: boolean;
  enabled: boolean;
  hits: number;
}
export interface QaUiStateAudit {
  id: string;
  screen: string;
  loadingOk: boolean;
  emptyOk: boolean;
  errorOk: boolean;
  notes?: string;
}
export interface QaTypeIssue {
  id: string;
  file: string;
  line: number;
  kind: 'any' | 'implicit-any' | 'missing-return' | 'unused-type' | 'loose-cast';
  snippet: string;
  fixed: boolean;
}
export interface QaModuleAudit {
  id: string;
  folder: string;
  files: number;
  cohesion: 'good' | 'mixed' | 'poor';
  suggestion?: string;
}
export interface QaRenderMetric {
  id: string;
  screen: string;
  avgRenderMs: number;
  rerenders: number;
  listSize?: number;
  optimized: boolean;
  technique?: 'memo' | 'callback' | 'virtualization' | 'splitting';
}
export interface QaQueryAudit {
  id: string;
  table: string;
  callSite: string;
  rowsTypical: number;
  hasSelect: boolean;
  hasIndex: boolean;
  duplicate: boolean;
  optimized: boolean;
}
export interface QaQualityKpi {
  totalFiles: number;
  totalLines: number;
  anyUsages: number;
  consoleIssues: number;
  unusedFiles: number;
  duplicateComponents: number;
  testCoverage: number;
  lintWarnings: number;
  buildTimeSec: number;
  bundleSizeMb: number;
  techDebtHours: number;
  lastAuditAt: string;
}

// Faz 53 — Kabul Testleri (Uat* prefix)
export type UatRole = 'admin' | 'manager' | 'field' | 'customer';
export type UatStatus = 'pending' | 'pass' | 'fail' | 'blocked';
export type UatSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UatStep {
  id: string;
  text: string;
  expected: string;
  status: UatStatus;
}

export interface UatScenario {
  id: string;
  role: UatRole;
  title: string;
  description: string;
  steps: UatStep[];
  status: UatStatus;
  priority: UatSeverity;
  lastRunAt?: string;
}

export interface UatE2EFlow {
  id: string;
  flow: 'quote' | 'workorder' | 'stock' | 'location' | 'notification';
  title: string;
  steps: number;
  passed: number;
  failed: number;
  blocked: number;
  durationMin: number;
  status: UatStatus;
  lastRunAt: string;
}

export interface UatNotificationCheck {
  id: string;
  channel: 'push' | 'email' | 'sms' | 'whatsapp';
  trigger: string;
  delivered: boolean;
  latencyMs: number;
  errorMessage?: string;
}

export interface UatBug {
  id: string;
  title: string;
  scenarioId?: string;
  severity: UatSeverity;
  status: 'open' | 'fixed' | 'wontfix';
  reportedBy: string;
  reportedAt: string;
  module: string;
}

export interface UatReport {
  totalScenarios: number;
  passed: number;
  failed: number;
  blocked: number;
  passRate: number;
  totalBugs: number;
  criticalBugs: number;
  openBugs: number;
  testCoverage: number;
  lastRunAt: string;
}

// Faz 54 — Dokümantasyon ve Eğitim (Doc* prefix)
export type DocAudience = 'admin' | 'manager' | 'field' | 'customer';

export interface DocSection {
  heading: string;
  bullets: string[];
}

export interface DocGuide {
  id: string;
  title: string;
  audience: DocAudience;
  summary: string;
  sections: DocSection[];
  updatedAt: string;
}

export interface DocOpsRunbook {
  id: string;
  title: string;
  summary: string;
  sections: DocSection[];
  updatedAt: string;
}

export interface DocFaqItem {
  id: string;
  category: 'login' | 'quote' | 'workorder' | 'sync' | 'pdf' | 'notification' | 'general';
  question: string;
  answer: string;
  helpfulCount: number;
}

export interface DocTrainingScene {
  order: number;
  text: string;
  durationSec: number;
}

export interface DocTrainingScript {
  id: string;
  title: string;
  targetRole: DocAudience;
  totalMin: number;
  scenes: DocTrainingScene[];
}

export interface DocChecklistItem {
  id: string;
  text: string;
  done: boolean;
  critical: boolean;
  category: 'data' | 'permission' | 'integration' | 'training' | 'translation';
}

export interface DocTrCharCheck {
  id: string;
  file: string;
  total: number;
  issues: number;
  ok: boolean;
}

// Faz 55 — Canlı Kullanım, İzleme ve Sürekli İyileştirme
export type GoLiveSeverity = 'low' | 'medium' | 'high' | 'critical';
export type GoLiveStatus = 'open' | 'in_progress' | 'resolved';
export type GoLiveHealth = 'green' | 'yellow' | 'red';

export interface GoLiveChecklistItem {
  id: string;
  text: string;
  owner: string;
  done: boolean;
  critical: boolean;
  category: 'infra' | 'data' | 'comms' | 'support' | 'monitoring';
}

export interface GoLiveMonitorCard {
  id: string;
  label: string;
  value: string;
  unit?: string;
  status: GoLiveHealth;
  trend: 'up' | 'down' | 'flat';
  target: string;
}

export interface GoLiveLogEntry {
  id: string;
  kind: 'crash' | 'api' | 'supabase';
  message: string;
  count: number;
  lastAt: string;
  severity: GoLiveSeverity;
  resolved: boolean;
}

export interface GoLiveFeedback {
  id: string;
  user: string;
  role: string;
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
  category: 'bug' | 'feature' | 'ux' | 'performance' | 'other';
  status: GoLiveStatus;
  createdAt: string;
}

export interface GoLiveBugTask {
  id: string;
  feedbackId?: string;
  title: string;
  severity: GoLiveSeverity;
  assigneeRole: 'admin' | 'manager' | 'field' | 'support';
  status: GoLiveStatus;
  createdAt: string;
  eta?: string;
}

export interface GoLiveWeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalUsers: number;
  activeUsers: number;
  sessions: number;
  crashes: number;
  errors: number;
  feedbacks: number;
  resolvedBugs: number;
  topIssues: string[];
  highlights: string[];
}

export interface GoLiveMonthlyReport {
  month: string;
  avgDailyActive: number;
  p95LatencyMs: number;
  crashFreeRate: number;
  npsScore: number;
  retention7d: number;
  retention30d: number;
  costNote: string;
  recommendations: string[];
}

export interface GoLiveBacklogItem {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 's' | 'm' | 'l';
  priorityScore: number;
  votes: number;
  category: string;
}

export interface GoLiveRelease {
  id: string;
  version: string;
  plannedDate: string;
  type: 'patch' | 'minor' | 'major';
  status: 'planned' | 'in_progress' | 'released';
  notes: string[];
}

export interface GoLiveSupportPlanItem {
  id: string;
  area: string;
  owner: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  sla: string;
  description: string;
}

// Faz 56 — Sistem Kapsam Denetimi (Coverage Audit)
export type CovStatus = 'done' | 'partial' | 'planned' | 'missing';

export interface CovItem {
  text: string;
  status: CovStatus;
  note?: string;
  faz?: number;
}

export interface CovCategory {
  id: string;
  no: number;
  title: string;
  icon: string;
  items: CovItem[];
}

export interface CovSummary {
  totalItems: number;
  doneCount: number;
  partialCount: number;
  plannedCount: number;
  missingCount: number;
  coveragePercent: number;
}

// Faz 57 — Dış Entegrasyonlar & Eklentiler (External Integrations)
export type ExtConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error';
export type ExtFieldKind = 'text' | 'password' | 'url' | 'select' | 'toggle' | 'number';

export interface ExtField {
  key: string;
  label: string;
  kind: ExtFieldKind;
  placeholder?: string;
  options?: string[];
  secret?: boolean;
  description?: string;
}

export interface ExtLogEntry {
  id: string;
  at: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface ExtIntegration {
  id: string;
  name: string;
  category: 'iletisim' | 'takvim' | 'finans' | 'depo' | 'erp' | 'pazar' | 'ai' | 'ui' | 'rota';
  icon: string;
  color: string;
  status: ExtConnectionStatus;
  summary: string;
  description: string;
  fields: ExtField[];
  benefits: string[];
  testEndpoint?: string;
  docUrl?: string;
  faz: number;
}

// Faz 58 — İleri Analitik & AI (Advanced)
export interface AdvEcomChannel {
  id: string;
  name: string;
  logo: string;
  color: string;
  productsSynced: number;
  ordersToday: number;
  revenueToday: number;
  status: 'connected' | 'pending' | 'disconnected';
}
export interface AdvEcomOrder {
  id: string;
  channel: string;
  customer: string;
  amount: number;
  items: number;
  status: 'new' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  at: string;
}

export interface AdvCallAgent {
  id: string;
  name: string;
  calls: number;
  avgDurationSec: number;
  satisfaction: number;
  status: 'available' | 'on_call' | 'break' | 'offline';
}
export interface AdvCallRecord {
  id: string;
  customer: string;
  agent: string;
  durationSec: number;
  direction: 'in' | 'out';
  outcome: 'resolved' | 'transferred' | 'voicemail' | 'missed';
  at: string;
  hasRecording: boolean;
}

export interface AdvBIDataset {
  id: string;
  name: string;
  rows: number;
  lastSync: string;
  destination: 'PowerBI' | 'Looker' | 'Metabase' | 'Tableau';
  status: 'healthy' | 'stale' | 'failed';
}

export interface AdvVoiceTranscript {
  id: string;
  user: string;
  durationSec: number;
  language: string;
  text: string;
  confidence: number;
  at: string;
  category: 'visit_note' | 'service_report' | 'quote_draft' | 'memo';
}

export interface AdvCollectionForecast {
  customerId: string;
  customer: string;
  outstandingTotal: number;
  predictedPaymentDate: string;
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  drivers: string[];
}

export type AdvRfmSegment = 'champions' | 'loyal' | 'potential' | 'new' | 'at_risk' | 'hibernating' | 'lost';
export interface AdvRfmCustomer {
  id: string;
  name: string;
  recency: number;
  frequency: number;
  monetary: number;
  rfmScore: string;
  segment: AdvRfmSegment;
  recommendedAction: string;
}

// Faz 59 — Sipariş Yönetimi (Ord*)
export type OrdStatus = 'draft' | 'submitted' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export interface OrdItem {
  id: string;
  productName: string;
  sku: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vatRate: number;
  total: number;
}
export interface Order {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  deliveryDate?: string;
  status: OrdStatus;
  items: OrdItem[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
  currency: 'TRY' | 'USD' | 'EUR';
  salesRepId: string;
  salesRepName: string;
  notes?: string;
  paymentTerms: string;
  channel: 'field' | 'phone' | 'portal' | 'recurring';
  createdAt: string;
}
export interface OrdRecurringTemplate {
  id: string;
  name: string;
  customerName: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  nextRun: string;
  itemCount: number;
  estimatedTotal: number;
  active: boolean;
}
export interface OrdSummary {
  totalOrders: number;
  totalValue: number;
  byStatus: Record<OrdStatus, number>;
  avgOrderValue: number;
  topProducts: { name: string; qty: number; revenue: number }[];
}

export type RootStackParamList = {
  MainTabs: undefined;
  Company: undefined;
  Expenses: undefined;
  Services: undefined;
  Customers: undefined;
  CustomerForm: { customerId?: string } | undefined;
  NewQuote: { quoteId?: string; prefill?: { customerName?: string; title?: string; lines: QuoteLine[] } } | undefined;
  Todo: undefined;
  QuoteDetail: { quoteId: string };
  WorkOrderDetail: { workOrderId: string };
  NewWorkOrder: undefined;
  Messages: undefined;
  ChatThread: { conversationId: string; title: string };
  ApolloLeads: undefined;
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
  Notifications: undefined;
  NotificationPreferences: undefined;
  NotificationHub: undefined;
  NotificationStats: undefined;
  BroadcastMessage: undefined;
  Payments: { customerId?: string; workOrderId?: string } | undefined;
  PaymentForm: { paymentId?: string; customerId?: string; workOrderId?: string; quoteId?: string } | undefined;
  PaymentDetail: { paymentId: string };
  CustomerBalances: undefined;
  CashRegister: { employeeId?: string } | undefined;
  FinanceHub: undefined;
  IncomeReport: undefined;
  AgingReport: undefined;
  EInvoice: undefined;
  Assets: { customerId?: string; type?: AssetType } | undefined;
  AssetForm: { assetId?: string; customerId?: string } | undefined;
  AssetDetail: { assetId: string };
  EnergyReadingForm: { readingId?: string; assetId?: string; kind?: EnergyReadingKind } | undefined;
  MaintenancePlans: { assetId?: string; customerId?: string } | undefined;
  Inspections: { assetId?: string; customerId?: string; type?: InspectionType } | undefined;
  InspectionForm: { inspectionId?: string; assetId?: string; type?: InspectionType } | undefined;
  Nonconformities: { assetId?: string; customerId?: string; status?: NonconformityStatus } | undefined;
  SalesVisits: { customerId?: string } | undefined;
  SectorHub: undefined;
  AssetHistory: undefined;
  SalesVisitForm: { visitId?: string; customerId?: string } | undefined;
  AiHub: undefined;
  AiAssistant: undefined;
  AiSettings: undefined;
  VisionScanner: undefined;
  VoiceNote: undefined;
  AiInsights: undefined;
  AdminShiftDashboard: undefined;
  ShiftHistory: undefined;
  ManagerCommandCenter: undefined;
  SmartPozSuggest: { description?: string } | undefined;
  PhotoAnalysis: { workOrderId?: string } | undefined;
  VoiceReport: { workOrderId?: string; customerId?: string } | undefined;
  RouteOptimizer: undefined;
  Anomalies: undefined;
  WebAdmin: undefined;
  UsersAdmin: undefined;
  UserApprovals: undefined;
  AllUsers: undefined;
  ExternalApiKeys: undefined;
  ScheduledEmails: undefined;
  LiveTracking: undefined;
  IntegrationsHub: undefined;
  ApiKeys: undefined;
  Webhooks: undefined;
  ExcelImport: undefined;
  ErpAdapters: undefined;
  Kvkk: undefined;
  Backup: undefined;
  TwoFactor: undefined;
  AccessRules: undefined;
  // FAZ 17 — Veri Kalıcılığı & Auth (POZ-DEV-109..116)
  ConnectivityHub: undefined;
  AuditLog: undefined;
  SyncStatus: undefined;
  DataMigration: undefined;
  RoleMatrix: undefined;
  // FAZ 18 — Konum & Personel Takibi (POZ-DEV-117..124)
  PersonnelTrackingHub: undefined;
  AttendanceReport: undefined;
  MockLocationAlerts: undefined;
  // FAZ 19 — İş Emri Akışı (POZ-DEV-125..132)
  WorkOrderFlowHub: undefined;
  WorkOrderKanban: undefined;
  WorkOrderCostDashboard: undefined;
  AutoAssign: { workOrderId?: string } | undefined;
  // FAZ 20 — Gelişmiş Teklif Sistemi (POZ-DEV-133..140)
  QuoteFlowHub: undefined;
  QuoteEmail: { quoteId: string };
  QuoteShare: { quoteId: string };
  RecentPoz: undefined;
  // FAZ 21 — Müşteri ve Lokasyon Yönetimi (POZ-DEV-141..148)
  CustomerHub: undefined;
  CustomerRatingsAll: undefined;
  CustomerSitesMap: undefined;
  // FAZ 22 — Form ve Kontrol Listeleri (POZ-DEV-149..155)
  FormHub: undefined;
  FormResponses: { templateId?: string; workOrderId?: string } | undefined;
  FormStats: undefined;
  // FAZ 23 — Stok, Malzeme ve Zimmet (POZ-DEV-156..162)
  StockHub: undefined;
  LowStockAlerts: undefined;
  StockSummary: undefined;
  // FAZ 24 — Araç Takibi (POZ-DEV-163..169)
  VehicleHub: undefined;
  VehicleAlerts: undefined;
  VehicleFuelStats: undefined;
  // FAZ 25 — Raporlama ve Dashboard (POZ-DEV-170..176)
  ReportingHub: undefined;
  KpiOverview: undefined;
  ReportComparison: undefined;
  // FAZ 32 — Teklif & Operasyon Modülleri (POZ-DEV-218..260)
  ProposalsHub: undefined;
  TransformerProposals: undefined;
  TransformerProposalForm: { quoteId?: string; customerId?: string } | undefined;
  GesProposals: undefined;
  GesProposalForm: { quoteId?: string; customerId?: string } | undefined;
  TaskHub: undefined;
  Tasks: { status?: TaskStatus; assignedTo?: string } | undefined;
  TaskForm: { taskId?: string } | undefined;
  TaskKanban: undefined;
  FuelReport: undefined;
  InventoryHub: undefined;
  ProductItems: { status?: ProductItemStatus; customerId?: string } | undefined;
  ProductItemForm: { itemId?: string } | undefined;
  ProductItemDetail: { itemId: string };
  ProductCatalog: undefined;
  OsosHub: undefined;
  OsosReadings: { customerId?: string } | undefined;
  OsosImport: undefined;
  WeeklyReports: undefined;
  WeeklyReportDetail: { reportId: string };
  OsosAutomation: undefined;
  PayrollHub: undefined;
  Timesheet: { employeeId?: string; month?: string } | undefined;
  PayrollRuns: { month?: string } | undefined;
  LeaveRequests: undefined;
  PayrollDetail: { runId: string };
  // FAZ 33 — Auth, Görev İşbirliği, Takvim, Profil, Analitik
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  Profile: undefined;
  TaskDetail: { taskId: string };
  TaskAnalytics: undefined;
  Calendar: { month?: string } | undefined;
  CalendarEventForm: { eventId?: string; date?: string } | undefined;
  CalendarEventDetail: { eventId: string };
  // FAZ 34 — Kalite, Test ve Yayına Hazırlık
  QualityHub: undefined;
  CrashReports: undefined;
  CrashReportDetail: { reportId: string };
  Feedback: undefined;
  FeedbackForm: { entryId?: string } | undefined;
  FeedbackDetail: { entryId: string };
  ReleaseNotes: undefined;
  PerformanceMetrics: undefined;
  EnvironmentInfo: undefined;
  TestPlan: undefined;
  // FAZ 35 — Yetkilendirme, Denetim, Kurumsal Yönetim
  GovernanceHub: undefined;
  RoleMatrixV2: undefined;
  Departments: undefined;
  DepartmentForm: { departmentId?: string } | undefined;
  Regions: undefined;
  RegionForm: { regionId?: string } | undefined;
  PermissionsScreen: { role?: UserRoleExt } | undefined;
  Approvals: { status?: ApprovalStatus } | undefined;
  ApprovalDetail: { requestId: string };
  AuditLogV2: { resource?: PermissionResource; actorId?: string } | undefined;
  AuditDetail: { entryId: string };
  SessionLogs: { userId?: string } | undefined;
  SuspiciousLogins: undefined;
  KvkkAccessLogs: { subjectId?: string } | undefined;
  // FAZ 36 — Mobil Saha & Offline
  FieldHub: undefined;
  OfflineQueue: { status?: OfflineOpStatus } | undefined;
  OfflineOpDetail: { opId: string };
  ConflictResolver: { opId: string };
  SyncHistory: undefined;
  FieldFavorites: undefined;
  FieldSettings: undefined;
  AppUpdate: undefined;
  ConnectivityMonitor: undefined;
  // FAZ 37 — Müşteri Deneyimi ve Dış Paylaşım
  CustomerExperienceHub: undefined;
  PortalUsers: { customerId?: string } | undefined;
  PortalUserForm: { userId?: string; customerId?: string } | undefined;
  ShareLinks: { resource?: ShareLinkResource } | undefined;
  ShareLinkForm: { linkId?: string } | undefined;
  ShareLinkDetail: { linkId: string };
  QuoteApprovals: { quoteId?: string } | undefined;
  CustomerComments: { customerId?: string } | undefined;
  SatisfactionSurveys: { status?: SurveyStatus } | undefined;
  SurveyDetail: { surveyId: string };
  CustomerNotificationPrefs: { customerId: string };
  AutoReports: undefined;
  AutoReportForm: { scheduleId?: string } | undefined;
  // FAZ 38 — BI & Karar Destek
  BiHub: undefined;
  ExecutiveDashboard: undefined;
  DepartmentKpis: undefined;
  StaffPerformance: undefined;
  VehicleCostAnalysis: undefined;
  FuelConsumption: undefined;
  StockConsumption: undefined;
  QuoteWinLoss: undefined;
  CustomerProfitability: undefined;
  SlaTracking: undefined;
  RegionHeatmap: undefined;
  BudgetVsActual: undefined;
  ExecutiveSummary: undefined;
  PivotExport: undefined;
  // FAZ 39 — Kurumsal Entegrasyonlar (ERP/CRM)
  EnterpriseIntegrationsHub: undefined;
  ErpConnections: undefined;
  ErpConnectionForm: { connectionId?: string } | undefined;
  ErpSyncJobs: undefined;
  ErpCustomers: undefined;
  ErpStock: undefined;
  ErpInvoiceDrafts: undefined;
  QuoteToOrder: undefined;
  CrmConnections: undefined;
  IntegrationWebhooks: undefined;
  IntegrationWebhookForm: { webhookId?: string } | undefined;
  IntegrationWebhookDeliveries: { webhookId?: string } | undefined;
  IntegrationApiKeys: undefined;
  ApiUsageLogs: undefined;
  IntegrationErrors: undefined;
  IntegrationHealth: undefined;
  // FAZ 40 — Ölçeklenebilirlik, Bakım, Ürünleşme
  PlatformHub: undefined;
  Tenants: undefined;
  TenantForm: { tenantId?: string } | undefined;
  TenantMembers: { tenantId?: string } | undefined;
  TenantSettings: { tenantId?: string } | undefined;
  Modules: undefined;
  Packages: undefined;
  Licenses: undefined;
  UsageLimits: undefined;
  DbIndexHints: undefined;
  ArchivePolicies: undefined;
  ArchiveJobs: undefined;
  Backups: undefined;
  RestoreTests: undefined;
  SystemHealth: undefined;
  MaintenanceMode: undefined;
  // Faz 41 — AI Asistan
  AiAssistantHub: undefined;
  AiPermissions: undefined;
  AiChat: { sessionId?: string } | undefined;
  CoPilot: undefined;
  AiKnowledgeBase: undefined;
  AiSessions: undefined;
  AiPozSuggest: undefined;
  AiQuoteDraft: undefined;
  AiQuoteDraftDetail: { draftId: string };
  AiWorkOrderSummary: undefined;
  AiCustomerInsight: undefined;
  AiRiskAlerts: undefined;
  AiDailyReport: undefined;
  AiUsageLogs: undefined;
  // Otonom Ajan
  AgentConsole: { initialGoal?: string; autoStart?: boolean } | undefined;
  AgentSuggestions: undefined;
  FieldOpsHub: undefined;
  FieldToday: undefined;
  FieldShift: undefined;
  FieldJobs: undefined;
  FieldJobDetail: { jobId: string };
  FieldChecklist: { jobId: string };
  FieldQualityCheck: { jobId: string };
  FieldPerformance: undefined;
  FieldZones: undefined;
  FieldShiftPlan: undefined;
  FieldEmergency: undefined;
  FieldCommandCenter: undefined;
  SmartQuoteHub: undefined;
  SurveyForms: undefined;
  SurveyFormDetail: { surveyId: string };
  PozLibrary: undefined;
  PriceListVersions: undefined;
  QuoteCalculator: undefined;
  HvTransformerQuote: undefined;
  PeriodicCheckQuote: undefined;
  GesQuote: undefined;
  CompensationQuote: undefined;
  QuoteRevisionCompare: undefined;
  QuoteOutcomes: undefined;
  AiQuoteImprovements: undefined;
  // Faz 44 — Live Ops Map
  LiveOpsHub: undefined;
  LiveOpsMap: undefined;
  JobHeatmap: undefined;
  PersonnelAvailability: undefined;
  SmartRouteSuggest: undefined;
  EtaEstimate: undefined;
  RouteDeviationAlerts: undefined;
  SiteEventLogs: undefined;
  TeamPerformanceLayer: undefined;
  OperationReplay: undefined;
  // Faz 45
  ComplianceHub: undefined;
  NonConformity: undefined;
  Capa: undefined;
  SafetyChecklists: undefined;
  RiskAssessment: undefined;
  AuditSchedule: undefined;
  AuditScoring: undefined;
  NcPhotoEvidence: undefined;
  NcAssignment: undefined;
  QualityDashboard: undefined;
  AuditReport: undefined;
  // Faz 46
  AssetHub: undefined;
  AssetList: undefined;
  AssetQr: { assetId?: string } | undefined;
  AssetMaintenanceHistory: { assetId?: string } | undefined;
  AssetFaultHistory: { assetId?: string } | undefined;
  WarrantyTracking: undefined;
  MaintenancePlan: undefined;
  MaintenanceAlerts: undefined;
  AssetCostAnalysis: undefined;
  EnergyAssetTypes: undefined;
  ServiceCard: { assetId?: string } | undefined;
  // Faz 47
  ExecHub: undefined;
  CeoSummary: undefined;
  OpsHealthScore: undefined;
  RevenueKpi: undefined;
  ProfitableCustomers: undefined;
  CostlyWorkOrders: undefined;
  EmployeeRanking: undefined;
  VehicleEfficiency: undefined;
  StockTurnover: undefined;
  QuoteConversion: undefined;
  AiExecSummary: undefined;
  // Faz 48
  CpHub: undefined;
  CpLogin: undefined;
  CpDashboard: undefined;
  CpQuoteApproval: undefined;
  CpWorkOrderTracking: undefined;
  CpServiceRequest: undefined;
  CpDocumentArchive: undefined;
  CpSatisfaction: undefined;
  CpNotifications: undefined;
  CpBranding: undefined;
  CpShareLinkSecurity: undefined;
  // Faz 49 — Güvenlik & KVKK
  SecHub: undefined;
  SecClassification: undefined;
  KvkkRequests: undefined;
  DataExport: undefined;
  DataErasure: undefined;
  SecDevices: undefined;
  SuspiciousActivity: undefined;
  AdminAlerts: undefined;
  BackupReport: undefined;
  DrPlan: undefined;
  SecHealth: undefined;
  // Faz 50 — Ürünleşme, SaaS ve Çoklu Firma Altyapısı
  SaasHub: undefined;
  SaasTenants: undefined;
  SaasIsolation: undefined;
  SaasModules: undefined;
  SaasPackages: undefined;
  SaasLicenses: undefined;
  SaasUsageLimits: undefined;
  SaasBranding: undefined;
  SaasBilling: undefined;
  SaasSuperAdmin: undefined;
  SaasHealth: undefined;
  // Faz 51 — Yayına Alma, Derleme ve Platform Kontrolü
  DepHub: undefined;
  DepSupabase: undefined;
  DepRlsPolicies: undefined;
  DepStorage: undefined;
  DepNetlify: undefined;
  DepBuildErrors: undefined;
  DepAiProviders: undefined;
  DepAiSecurity: undefined;
  DepWebWarnings: undefined;
  DepMobileWarnings: undefined;
  DepApkBuild: undefined;
  // Faz 52 — Hata Temizliği, Refactor ve Kod Kalitesi
  QaHub: undefined;
  QaConsole: undefined;
  QaUnused: undefined;
  QaShared: undefined;
  QaApiErrors: undefined;
  QaUiStates: undefined;
  QaTypes: undefined;
  QaModules: undefined;
  QaPerformance: undefined;
  QaQueries: undefined;
  QaReport: undefined;
  // Faz 53 — Kabul Testleri
  UatHub: undefined;
  UatAdmin: undefined;
  UatManager: undefined;
  UatField: undefined;
  UatCustomer: undefined;
  UatQuote: undefined;
  UatWorkOrder: undefined;
  UatStock: undefined;
  UatLocation: undefined;
  UatNotification: undefined;
  UatReport: undefined;
  // Faz 54 — Dokümantasyon ve Eğitim
  DocHub: undefined;
  DocAdminGuide: undefined;
  DocManagerGuide: undefined;
  DocFieldGuide: undefined;
  DocCustomerGuide: undefined;
  DocSupabaseOps: undefined;
  DocNetlifyOps: undefined;
  DocApkOps: undefined;
  DocFaq: undefined;
  DocTraining: undefined;
  DocChecklist: undefined;
  // Faz 55 — Canlı Kullanım, İzleme ve Sürekli İyileştirme
  GoLiveHub: undefined;
  GoLiveChecklist: undefined;
  GoLiveMonitor: undefined;
  GoLiveLogs: undefined;
  GoLiveFeedback: undefined;
  GoLiveBugTasks: undefined;
  GoLiveWeekly: undefined;
  GoLiveMonthly: undefined;
  GoLiveBacklog: undefined;
  GoLiveReleases: undefined;
  GoLiveSupport: undefined;
  // Faz 56 — Sistem Kapsam Denetimi
  CovHub: undefined;
  CovMatrix: undefined;
  CovCategory: { id: string };
  CovSummary: undefined;
  // Faz 57 — Dış Entegrasyonlar & Eklentiler
  ExtHub: undefined;
  ExtConfig: { id: string };
  ExtLogs: { id: string };
  // Faz 58 — İleri Analitik & AI
  AdvHub: undefined;
  AdvEcommerce: undefined;
  AdvCallCenter: undefined;
  AdvBI: undefined;
  AdvVoiceAI: undefined;
  AdvCollectionForecast: undefined;
  AdvRfm: undefined;
  // Faz 59 — Sipariş Yönetimi
  OrdHub: undefined;
  OrdList: undefined;
  OrdForm: { id?: string } | undefined;
  OrdDetail: { id: string };
  OrdRecurring: undefined;
  OrdAnalytics: undefined;
};

export type TabParamList = {
  Home: undefined;
  WorkOrders: undefined;
  NewService: undefined;
  Quotes: undefined;
  Manager: undefined;
};
