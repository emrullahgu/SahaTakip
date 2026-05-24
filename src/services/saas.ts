// Faz 50 — SaaS Çoklu Firma servisi (saas_*_v1)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SaasTenantSummary, SaasIsolationCheck, SaasModuleToggle, SaasPackage,
  SaasLicense, SaasUsageMetric, SaasBrandingConfig, SaasInvoice,
  SaasSubscription, SaasSuperAdminMetric, SaasTenantHealth, SaasPlanCode,
} from '../types';

const K = {
  tenants: 'saas_tenants_v1',
  isolation: 'saas_isolation_v1',
  modules: 'saas_modules_v1',
  packages: 'saas_packages_v1',
  licenses: 'saas_licenses_v1',
  usage: 'saas_usage_v1',
  branding: 'saas_branding_v1',
  invoices: 'saas_invoices_v1',
  subs: 'saas_subs_v1',
  health: 'saas_health_v1',
};

export const SAAS_STATUS_LABEL: Record<string, string> = {
  active: 'Aktif', trial: 'Deneme', past_due: 'Gecikmeli', suspended: 'Askıda', cancelled: 'İptal',
  expiring: 'Yakında Bitiyor', expired: 'Süresi Doldu', trialing: 'Deneme', paid: 'Ödendi',
  open: 'Açık', overdue: 'Gecikmiş', void: 'İptal', healthy: 'Sağlıklı', at_risk: 'Risk Altında', churning: 'Kaybediliyor',
};
export const SAAS_STATUS_COLOR: Record<string, string> = {
  active: '#22c55e', trial: '#0ea5e9', past_due: '#f59e0b', suspended: '#ef4444', cancelled: '#64748b',
  expiring: '#f59e0b', expired: '#ef4444', trialing: '#0ea5e9', paid: '#22c55e', open: '#0ea5e9',
  overdue: '#ef4444', void: '#64748b', healthy: '#22c55e', at_risk: '#f59e0b', churning: '#ef4444',
};

export const SAAS_PLAN_LABEL: Record<SaasPlanCode, string> = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };
export const SAAS_PLAN_COLOR: Record<SaasPlanCode, string> = { basic: '#64748b', pro: '#0ea5e9', enterprise: '#a855f7' };

async function getOrSeed<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw) return JSON.parse(raw) as T;
  // Sahte/seed veri yok — diziler boş döner, nesneler fallback olarak verilir.
  return Array.isArray(fallback) ? (([] as unknown) as T) : fallback;
}

const now = () => new Date().toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// --- Tenants
export async function listSaasTenants(): Promise<SaasTenantSummary[]> {
  return getOrSeed<SaasTenantSummary[]>(K.tenants, [
    { id: 't1', name: 'ACME Solar A.Ş.', plan: 'enterprise', status: 'active', ownerEmail: 'admin@acme.com', createdAt: daysAgo(420), licenseEndsAt: daysFromNow(180), mrr: 4500, users: 38, storageMb: 12400, isCurrent: true },
    { id: 't2', name: 'Güneş Mühendislik Ltd.', plan: 'pro', status: 'active', ownerEmail: 'mert@gunesmuh.com', createdAt: daysAgo(310), licenseEndsAt: daysFromNow(95), mrr: 1200, users: 14, storageMb: 4800 },
    { id: 't3', name: 'BatuTeknik', plan: 'pro', status: 'past_due', ownerEmail: 'cem@batuteknik.com', createdAt: daysAgo(220), licenseEndsAt: daysAgo(5), mrr: 1200, users: 9, storageMb: 2100 },
    { id: 't4', name: 'EnerjiPro Saha', plan: 'basic', status: 'trial', ownerEmail: 'demo@enerjipro.com', createdAt: daysAgo(12), trialEndsAt: daysFromNow(18), licenseEndsAt: daysFromNow(18), mrr: 0, users: 3, storageMb: 320 },
    { id: 't5', name: 'OptikGES', plan: 'basic', status: 'active', ownerEmail: 'info@optikges.com', createdAt: daysAgo(140), licenseEndsAt: daysFromNow(40), mrr: 450, users: 6, storageMb: 980 },
    { id: 't6', name: 'YeşilEnerji A.Ş.', plan: 'enterprise', status: 'active', ownerEmail: 'ops@yesilenerji.com', createdAt: daysAgo(640), licenseEndsAt: daysFromNow(310), mrr: 4500, users: 52, storageMb: 18600 },
    { id: 't7', name: 'TestFirma', plan: 'basic', status: 'suspended', ownerEmail: 'test@example.com', createdAt: daysAgo(90), licenseEndsAt: daysAgo(20), mrr: 0, users: 2, storageMb: 50 },
  ]);
}

// --- Isolation
export async function listSaasIsolation(): Promise<SaasIsolationCheck[]> {
  return getOrSeed<SaasIsolationCheck[]>(K.isolation, [
    { id: 'i1', table: 'customers', scope: 'tenant', rowsLeaked: 0, policy: 'rls', ok: true },
    { id: 'i2', table: 'work_orders', scope: 'tenant', rowsLeaked: 0, policy: 'rls', ok: true },
    { id: 'i3', table: 'quotes', scope: 'tenant', rowsLeaked: 0, policy: 'rls', ok: true },
    { id: 'i4', table: 'expenses', scope: 'tenant', rowsLeaked: 0, policy: 'rls', ok: true },
    { id: 'i5', table: 'users', scope: 'tenant', rowsLeaked: 0, policy: 'rls', ok: true },
    { id: 'i6', table: 'audit_logs', scope: 'tenant', rowsLeaked: 0, policy: 'app', ok: true },
    { id: 'i7', table: 'system_settings', scope: 'global', rowsLeaked: 0, policy: 'none', ok: true },
    { id: 'i8', table: 'shared_pozes', scope: 'global', rowsLeaked: 0, policy: 'none', ok: true },
    { id: 'i9', table: 'legacy_imports', scope: 'tenant', rowsLeaked: 12, policy: 'app', ok: false },
  ]);
}

// --- Modules
export async function listSaasModules(): Promise<SaasModuleToggle[]> {
  return getOrSeed<SaasModuleToggle[]>(K.modules, [
    { id: 'm1', code: 'core_workorders', name: 'İş Emirleri', category: 'core', enabled: true, availableIn: ['basic', 'pro', 'enterprise'], description: 'Çekirdek iş emri yönetimi' },
    { id: 'm2', code: 'core_customers', name: 'Müşteriler', category: 'core', enabled: true, availableIn: ['basic', 'pro', 'enterprise'], description: 'Müşteri kartları' },
    { id: 'm3', code: 'finance_quotes', name: 'Teklifler', category: 'finance', enabled: true, availableIn: ['basic', 'pro', 'enterprise'], description: 'Teklif oluşturma & onay' },
    { id: 'm4', code: 'finance_einvoice', name: 'e-Fatura', category: 'finance', enabled: true, availableIn: ['pro', 'enterprise'], description: 'GİB e-Fatura entegrasyonu' },
    { id: 'm5', code: 'field_routing', name: 'Rota Optimizasyonu', category: 'field', enabled: true, availableIn: ['pro', 'enterprise'], description: 'Akıllı saha rota planlama' },
    { id: 'm6', code: 'field_vehicles', name: 'Araç Takibi', category: 'field', enabled: false, availableIn: ['pro', 'enterprise'], description: 'GPS ve yakıt takibi' },
    { id: 'm7', code: 'analytics_bi', name: 'BI Dashboard', category: 'analytics', enabled: true, availableIn: ['pro', 'enterprise'], description: 'Gelişmiş analitik' },
    { id: 'm8', code: 'analytics_forecasts', name: 'Tahminleme', category: 'analytics', enabled: false, availableIn: ['enterprise'], description: 'AI destekli tahminleme' },
    { id: 'm9', code: 'integration_api', name: 'Açık API', category: 'integration', enabled: true, availableIn: ['enterprise'], description: 'REST API & webhooks' },
    { id: 'm10', code: 'integration_erp', name: 'ERP Köprüsü', category: 'integration', enabled: false, availableIn: ['enterprise'], description: 'SAP/Logo entegrasyonu' },
    { id: 'm11', code: 'ai_assistant', name: 'AI Asistan', category: 'ai', enabled: true, availableIn: ['pro', 'enterprise'], description: 'Doğal dil AI yardımcı' },
    { id: 'm12', code: 'ai_smart_quote', name: 'Akıllı Teklif', category: 'ai', enabled: false, availableIn: ['enterprise'], description: 'Otomatik teklif üretimi' },
  ]);
}

export async function toggleSaasModule(id: string): Promise<void> {
  const list = await listSaasModules();
  const next = list.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
  await AsyncStorage.setItem(K.modules, JSON.stringify(next));
}

// --- Packages
export async function listSaasPackages(): Promise<SaasPackage[]> {
  return getOrSeed<SaasPackage[]>(K.packages, [
    {
      code: 'basic', name: 'Basic', monthlyPrice: 450, yearlyPrice: 4500, color: '#64748b',
      maxUsers: 5, maxWorkOrdersMonth: 200, maxStorageGb: 5, maxAiTokensMonth: 10000,
      features: [
        { code: 'workorders', included: true, limit: 200 },
        { code: 'customers', included: true },
        { code: 'quotes', included: true },
        { code: 'einvoice', included: false },
        { code: 'routing', included: false },
        { code: 'bi', included: false },
        { code: 'api', included: false },
        { code: 'ai', included: false },
      ],
    },
    {
      code: 'pro', name: 'Pro', monthlyPrice: 1200, yearlyPrice: 12000, color: '#0ea5e9',
      maxUsers: 25, maxWorkOrdersMonth: 2000, maxStorageGb: 50, maxAiTokensMonth: 100000,
      features: [
        { code: 'workorders', included: true, limit: 2000 },
        { code: 'customers', included: true },
        { code: 'quotes', included: true },
        { code: 'einvoice', included: true },
        { code: 'routing', included: true },
        { code: 'bi', included: true },
        { code: 'api', included: false },
        { code: 'ai', included: true, limit: 100000 },
      ],
      popular: true,
    },
    {
      code: 'enterprise', name: 'Enterprise', monthlyPrice: 4500, yearlyPrice: 45000, color: '#a855f7',
      maxUsers: 999, maxWorkOrdersMonth: 999999, maxStorageGb: 999, maxAiTokensMonth: 999999,
      features: [
        { code: 'workorders', included: true },
        { code: 'customers', included: true },
        { code: 'quotes', included: true },
        { code: 'einvoice', included: true },
        { code: 'routing', included: true },
        { code: 'bi', included: true },
        { code: 'api', included: true },
        { code: 'ai', included: true },
      ],
    },
  ]);
}

export const SAAS_FEATURE_LABEL: Record<string, string> = {
  workorders: 'İş Emirleri', customers: 'Müşteriler', quotes: 'Teklifler',
  einvoice: 'e-Fatura', routing: 'Rota Optimizasyonu', bi: 'BI & Raporlar',
  api: 'Açık API', ai: 'AI Asistan',
};

// --- Licenses
export async function listSaasLicenses(): Promise<SaasLicense[]> {
  return getOrSeed<SaasLicense[]>(K.licenses, [
    { id: 'l1', tenantId: 't1', tenantName: 'ACME Solar A.Ş.', plan: 'enterprise', startsAt: daysAgo(420), endsAt: daysFromNow(180), seats: 40, cycle: 'yearly', autoRenew: true, status: 'active' },
    { id: 'l2', tenantId: 't2', tenantName: 'Güneş Mühendislik Ltd.', plan: 'pro', startsAt: daysAgo(310), endsAt: daysFromNow(95), seats: 15, cycle: 'yearly', autoRenew: true, status: 'active' },
    { id: 'l3', tenantId: 't3', tenantName: 'BatuTeknik', plan: 'pro', startsAt: daysAgo(370), endsAt: daysAgo(5), seats: 10, cycle: 'yearly', autoRenew: false, status: 'expired' },
    { id: 'l4', tenantId: 't5', tenantName: 'OptikGES', plan: 'basic', startsAt: daysAgo(140), endsAt: daysFromNow(40), seats: 6, cycle: 'monthly', autoRenew: true, status: 'active' },
    { id: 'l5', tenantId: 't6', tenantName: 'YeşilEnerji A.Ş.', plan: 'enterprise', startsAt: daysAgo(640), endsAt: daysFromNow(25), seats: 60, cycle: 'yearly', autoRenew: true, status: 'expiring' },
    { id: 'l6', tenantId: 't4', tenantName: 'EnerjiPro Saha', plan: 'basic', startsAt: daysAgo(12), endsAt: daysFromNow(18), seats: 5, cycle: 'monthly', autoRenew: false, status: 'expiring' },
  ]);
}

export async function toggleLicenseAutoRenew(id: string): Promise<void> {
  const list = await listSaasLicenses();
  const next = list.map(l => l.id === id ? { ...l, autoRenew: !l.autoRenew } : l);
  await AsyncStorage.setItem(K.licenses, JSON.stringify(next));
}

// --- Usage limits
export async function listSaasUsage(): Promise<SaasUsageMetric[]> {
  return getOrSeed<SaasUsageMetric[]>(K.usage, [
    { id: 'u1', metric: 'users', label: 'Kullanıcı', current: 38, limit: 999, unit: 'kullanıcı' },
    { id: 'u2', metric: 'workorders', label: 'İş Emri (Bu Ay)', current: 1240, limit: 999999, unit: 'iş emri', resetAt: daysFromNow(8) },
    { id: 'u3', metric: 'storage_mb', label: 'Depolama', current: 12400, limit: 1023000, unit: 'MB' },
    { id: 'u4', metric: 'ai_tokens', label: 'AI Token (Bu Ay)', current: 72500, limit: 999999, unit: 'token', resetAt: daysFromNow(8) },
    { id: 'u5', metric: 'sms', label: 'SMS (Bu Ay)', current: 285, limit: 1000, unit: 'sms', resetAt: daysFromNow(8) },
    { id: 'u6', metric: 'api_calls', label: 'API Çağrısı (Bu Ay)', current: 42800, limit: 100000, unit: 'çağrı', resetAt: daysFromNow(8) },
  ]);
}

// --- Branding
export async function getSaasBranding(): Promise<SaasBrandingConfig> {
  return getOrSeed<SaasBrandingConfig>(K.branding, {
    tenantId: 't1', tenantName: 'ACME Solar A.Ş.',
    primaryColor: '#0ea5e9', accentColor: '#a855f7',
    emailFromName: 'ACME Solar Saha Ekibi',
    customDomain: 'saha.acmesolar.com', customDomainVerified: true,
  });
}

export async function updateSaasBranding(patch: Partial<SaasBrandingConfig>): Promise<SaasBrandingConfig> {
  const cur = await getSaasBranding();
  const next = { ...cur, ...patch };
  await AsyncStorage.setItem(K.branding, JSON.stringify(next));
  return next;
}

// --- Billing / invoices / subs
export async function listSaasInvoices(): Promise<SaasInvoice[]> {
  return getOrSeed<SaasInvoice[]>(K.invoices, [
    { id: 'iv1', number: 'INV-2026-0042', tenantName: 'ACME Solar A.Ş.', amount: 4500, status: 'paid', issuedAt: daysAgo(28), dueAt: daysAgo(14), paidAt: daysAgo(20), period: 'Mayıs 2026', plan: 'enterprise' },
    { id: 'iv2', number: 'INV-2026-0041', tenantName: 'Güneş Mühendislik Ltd.', amount: 1200, status: 'paid', issuedAt: daysAgo(26), dueAt: daysAgo(11), paidAt: daysAgo(15), period: 'Mayıs 2026', plan: 'pro' },
    { id: 'iv3', number: 'INV-2026-0043', tenantName: 'BatuTeknik', amount: 1200, status: 'overdue', issuedAt: daysAgo(25), dueAt: daysAgo(10), period: 'Mayıs 2026', plan: 'pro' },
    { id: 'iv4', number: 'INV-2026-0044', tenantName: 'OptikGES', amount: 450, status: 'open', issuedAt: daysAgo(3), dueAt: daysFromNow(12), period: 'Haziran 2026', plan: 'basic' },
    { id: 'iv5', number: 'INV-2026-0045', tenantName: 'YeşilEnerji A.Ş.', amount: 4500, status: 'paid', issuedAt: daysAgo(28), dueAt: daysAgo(14), paidAt: daysAgo(22), period: 'Mayıs 2026', plan: 'enterprise' },
    { id: 'iv6', number: 'INV-2026-0040', tenantName: 'TestFirma', amount: 450, status: 'void', issuedAt: daysAgo(60), dueAt: daysAgo(45), period: 'Nisan 2026', plan: 'basic' },
  ]);
}

export async function markInvoicePaid(id: string): Promise<void> {
  const list = await listSaasInvoices();
  const next = list.map(i => i.id === id ? { ...i, status: 'paid' as const, paidAt: now() } : i);
  await AsyncStorage.setItem(K.invoices, JSON.stringify(next));
}

export async function listSaasSubscriptions(): Promise<SaasSubscription[]> {
  return getOrSeed<SaasSubscription[]>(K.subs, [
    { id: 's1', tenantId: 't1', tenantName: 'ACME Solar A.Ş.', plan: 'enterprise', cycle: 'yearly', status: 'active', nextBillingAt: daysFromNow(180), mrr: 4500, paymentMethod: 'invoice' },
    { id: 's2', tenantId: 't2', tenantName: 'Güneş Mühendislik Ltd.', plan: 'pro', cycle: 'yearly', status: 'active', nextBillingAt: daysFromNow(95), mrr: 1200, paymentMethod: 'card', cardLast4: '4242' },
    { id: 's3', tenantId: 't3', tenantName: 'BatuTeknik', plan: 'pro', cycle: 'monthly', status: 'past_due', nextBillingAt: daysAgo(5), mrr: 1200, paymentMethod: 'card', cardLast4: '0309' },
    { id: 's4', tenantId: 't4', tenantName: 'EnerjiPro Saha', plan: 'basic', cycle: 'monthly', status: 'trialing', nextBillingAt: daysFromNow(18), mrr: 0, paymentMethod: 'card', cardLast4: '5588' },
    { id: 's5', tenantId: 't5', tenantName: 'OptikGES', plan: 'basic', cycle: 'monthly', status: 'active', nextBillingAt: daysFromNow(12), mrr: 450, paymentMethod: 'card', cardLast4: '1117' },
    { id: 's6', tenantId: 't6', tenantName: 'YeşilEnerji A.Ş.', plan: 'enterprise', cycle: 'yearly', status: 'active', nextBillingAt: daysFromNow(25), mrr: 4500, paymentMethod: 'invoice' },
  ]);
}

// --- Super admin metrics
export async function getSaasSuperAdminMetrics(): Promise<SaasSuperAdminMetric[]> {
  const tenants = await listSaasTenants();
  const totalMrr = tenants.reduce((a, t) => a + t.mrr, 0);
  const activeT = tenants.filter(t => t.status === 'active').length;
  const trialT = tenants.filter(t => t.status === 'trial').length;
  const churnT = tenants.filter(t => t.status === 'cancelled' || t.status === 'suspended').length;
  return [
    { label: 'Toplam MRR', value: `₺${totalMrr.toLocaleString('tr-TR')}`, delta: 12.4, icon: 'trending-up', color: '#22c55e' },
    { label: 'Aktif Firma', value: String(activeT), delta: 8.1, icon: 'business', color: '#0ea5e9' },
    { label: 'Deneme', value: String(trialT), delta: 25.0, icon: 'flask', color: '#f59e0b' },
    { label: 'Kayıp/Askıda', value: String(churnT), delta: -5.0, icon: 'alert-circle', color: '#ef4444' },
    { label: 'Toplam Kullanıcı', value: String(tenants.reduce((a, t) => a + t.users, 0)), icon: 'people', color: '#a855f7' },
    { label: 'Toplam Depolama', value: `${(tenants.reduce((a, t) => a + t.storageMb, 0) / 1024).toFixed(1)} GB`, icon: 'cloud', color: '#06b6d4' },
  ];
}

// --- Tenant health
export async function listSaasTenantHealth(): Promise<SaasTenantHealth[]> {
  return getOrSeed<SaasTenantHealth[]>(K.health, [
    { tenantId: 't1', tenantName: 'ACME Solar A.Ş.', score: 92, status: 'healthy', lastLoginDaysAgo: 0, activeUsers7d: 28, workOrdersThisMonth: 412, usagePctOfLimit: 41, churnRiskFactors: [] },
    { tenantId: 't2', tenantName: 'Güneş Mühendislik Ltd.', score: 78, status: 'healthy', lastLoginDaysAgo: 1, activeUsers7d: 11, workOrdersThisMonth: 165, usagePctOfLimit: 58, churnRiskFactors: [] },
    { tenantId: 't3', tenantName: 'BatuTeknik', score: 32, status: 'churning', lastLoginDaysAgo: 14, activeUsers7d: 2, workOrdersThisMonth: 18, usagePctOfLimit: 12, churnRiskFactors: ['Fatura gecikmiş', 'Düşük kullanım', '14 gündür giriş yok'] },
    { tenantId: 't4', tenantName: 'EnerjiPro Saha', score: 65, status: 'at_risk', lastLoginDaysAgo: 3, activeUsers7d: 3, workOrdersThisMonth: 22, usagePctOfLimit: 18, churnRiskFactors: ['Deneme süresi yakında bitiyor'] },
    { tenantId: 't5', tenantName: 'OptikGES', score: 71, status: 'at_risk', lastLoginDaysAgo: 5, activeUsers7d: 4, workOrdersThisMonth: 41, usagePctOfLimit: 28, churnRiskFactors: ['Aktif kullanıcı sayısı düşük'] },
    { tenantId: 't6', tenantName: 'YeşilEnerji A.Ş.', score: 95, status: 'healthy', lastLoginDaysAgo: 0, activeUsers7d: 44, workOrdersThisMonth: 680, usagePctOfLimit: 62, churnRiskFactors: [] },
  ]);
}
