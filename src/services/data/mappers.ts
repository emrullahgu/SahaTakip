// ====================================================================
// SahaTakip — DB Row <-> App Model Mappers
// ====================================================================
// Supabase tabloları snake_case, uygulama modeli camelCase.
// Tüm dönüşümler burada tek noktada toplanır.
// ====================================================================

import type { Quote, QuoteLine, Customer, WorkOrder, Employee } from '../../types';

// ========== QUOTES ==========
export const quoteFromRow = (row: any, lines: any[] = []): Quote => ({
  id: row.id,
  number: row.number,
  customerName: row.customer_name,
  customerTitle: row.customer_title ?? undefined,
  title: row.title,
  date: row.date,
  validUntil: row.valid_until ?? undefined,
  engineer: row.engineer ?? '',
  status: row.status,
  notes: row.notes ?? undefined,
  subtotal: Number(row.subtotal) || 0,
  vatTotal: Number(row.vat_total) || 0,
  grandTotal: Number(row.grand_total) || 0,
  lines: lines.map(quoteLineFromRow).sort((a, b) => a.lineNo - b.lineNo),
});

export const quoteLineFromRow = (row: any): QuoteLine => ({
  lineNo: row.line_no,
  pozId: row.poz_id,
  pozName: row.poz_name,
  unit: row.unit,
  quantity: Number(row.quantity) || 0,
  materialPrice: Number(row.material_price) || 0,
  installPrice: Number(row.install_price) || 0,
  dismantlePrice: Number(row.dismantle_price) || 0,
  withDismantle: !!row.with_dismantle,
  overheadPct: Number(row.overhead_pct) || 0,
  profitPct: Number(row.profit_pct) || 0,
  vatPct: Number(row.vat_pct) || 0,
  discountPct: Number(row.discount_pct) || 0,
  notes: row.notes ?? undefined,
});

export const quoteToRow = (q: Quote, userId?: string) => ({
  id: q.id,
  number: q.number,
  customer_name: q.customerName,
  customer_title: q.customerTitle ?? null,
  title: q.title,
  date: q.date,
  valid_until: q.validUntil ?? null,
  engineer: q.engineer,
  status: q.status,
  notes: q.notes ?? null,
  subtotal: q.subtotal,
  vat_total: q.vatTotal,
  grand_total: q.grandTotal,
  created_by: userId ?? null,
});

export const quoteLineToRow = (quoteId: string, l: QuoteLine) => ({
  quote_id: quoteId,
  line_no: l.lineNo,
  poz_id: l.pozId,
  poz_name: l.pozName,
  unit: l.unit,
  quantity: l.quantity,
  material_price: l.materialPrice,
  install_price: l.installPrice,
  dismantle_price: l.dismantlePrice,
  with_dismantle: l.withDismantle,
  overhead_pct: l.overheadPct,
  profit_pct: l.profitPct,
  vat_pct: l.vatPct,
  discount_pct: l.discountPct,
  notes: l.notes ?? null,
});

// ========== CUSTOMERS ==========
export const customerFromRow = (row: any): Customer => ({
  id: row.id,
  shortName: row.short_name,
  title: row.title,
  taxNumber: row.tax_number ?? undefined,
  taxOffice: row.tax_office ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  address: row.address ?? undefined,
  city: row.city ?? undefined,
  contactPerson: row.contact_person ?? undefined,
});

export const customerToRow = (c: Customer, userId?: string) => ({
  id: c.id,
  short_name: c.shortName,
  title: c.title,
  tax_number: c.taxNumber ?? null,
  tax_office: c.taxOffice ?? null,
  phone: c.phone ?? null,
  email: c.email ?? null,
  address: c.address ?? null,
  city: c.city ?? null,
  contact_person: c.contactPerson ?? null,
  created_by: userId ?? null,
});

// ========== WORK ORDERS ==========
export const workOrderFromRow = (row: any): WorkOrder => ({
  id: row.id,
  client: row.customer_name ?? '',
  serviceName: row.service_name ?? row.title ?? '',
  date: row.date,
  engineer: row.engineer ?? '',
  materials: Array.isArray(row.materials_json)
    ? row.materials_json
    : Array.isArray(row.materials)
    ? row.materials
    : [],
  otherCost: Number(row.other_cost) || 0,
  laborCost: Number(row.labor_cost) || 0,
  materialCost: Number(row.material_cost) || 0,
  quoteAmount: Number(row.quote_amount) || 0,
  profit: Number(row.profit) || 0,
  status: row.status,
  beforePhoto: row.before_photo ?? '',
  afterPhoto: row.after_photo ?? '',
  notes: row.notes ?? '',
  // FAZ 3 alanları
  priority: row.priority ?? undefined,
  plannedStart: row.planned_start ?? undefined,
  plannedEnd: row.planned_end ?? undefined,
  slaHours: row.sla_hours != null ? Number(row.sla_hours) : undefined,
  assignedToId: row.assigned_to_id ?? undefined,
  assignedToName: row.assigned_to_name ?? undefined,
  assignmentStatus: row.assignment_status ?? undefined,
  rejectReason: row.reject_reason ?? undefined,
  timeLogs: Array.isArray(row.time_logs_json) ? row.time_logs_json : undefined,
  actualLaborMinutes: row.actual_labor_minutes != null ? Number(row.actual_labor_minutes) : undefined,
  videoUri: row.video_uri ?? undefined,
  audioUri: row.audio_uri ?? undefined,
  signatureUri: row.signature_uri ?? undefined,
  templateId: row.template_id ?? undefined,
});

export const workOrderToRow = (w: WorkOrder, userId?: string) => ({
  id: w.id,
  number: w.id,
  title: w.serviceName,
  service_name: w.serviceName,
  customer_name: w.client,
  date: w.date,
  engineer: w.engineer,
  status: w.status,
  materials_json: w.materials,
  other_cost: w.otherCost,
  labor_cost: w.laborCost,
  material_cost: w.materialCost,
  quote_amount: w.quoteAmount,
  profit: w.profit,
  before_photo: w.beforePhoto || null,
  after_photo: w.afterPhoto || null,
  notes: w.notes || null,
  created_by: userId ?? null,
  // FAZ 3 alanları
  priority: w.priority ?? null,
  planned_start: w.plannedStart ?? null,
  planned_end: w.plannedEnd ?? null,
  sla_hours: w.slaHours ?? null,
  assigned_to_id: w.assignedToId ?? null,
  assigned_to_name: w.assignedToName ?? null,
  assignment_status: w.assignmentStatus ?? null,
  reject_reason: w.rejectReason ?? null,
  time_logs_json: w.timeLogs ?? null,
  actual_labor_minutes: w.actualLaborMinutes ?? null,
  video_uri: w.videoUri ?? null,
  audio_uri: w.audioUri ?? null,
  signature_uri: w.signatureUri ?? null,
  template_id: w.templateId ?? null,
});

// ========== EMPLOYEES ==========
export const employeeFromRow = (row: any): Employee => {
  const attendance =
    typeof row.attendance_json === 'object' && row.attendance_json !== null
      ? (row.attendance_json as Record<string, string>)
      : {};
  const daysWorked = Object.values(attendance).filter(v => v === 'Geldi' || v === 'Tam').length;
  const monthlyWage = Number(row.monthly_wage) || 0;
  const dailyWage = Number(row.daily_wage) || 0;
  return {
    id: row.id,
    name: row.full_name,
    role: row.role ?? '',
    monthlyWage,
    dailyRate: dailyWage || Math.round(monthlyWage / 22),
    attendance,
    daysWorked,
  };
};

export const employeeToRow = (e: Employee) => ({
  id: e.id,
  full_name: e.name,
  role: e.role,
  daily_wage: e.dailyRate,
  monthly_wage: e.monthlyWage,
  attendance_json: e.attendance,
  active: true,
});
