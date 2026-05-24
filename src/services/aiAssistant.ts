// aiAssistant.ts — Faz 41 AI servis katmanı (mock, AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AiPermission, AiSession, AiMessage, AiPozSuggestion, AiQuoteDraft,
  AiWorkOrderSummary, AiCustomerInsight, AiRiskAlert, AiDailyReport, AiUsageLog,
  AiFeature, AiUserRole, AiAssistantProvider, AiRiskType, AiRiskLevel, AiRole,
} from '../types';

const K = {
  perms: 'ai_perms_v1', sessions: 'ai_sessions_v1', messages: 'ai_messages_v1',
  poz: 'ai_poz_v1', quotes: 'ai_quotes_v1', woSum: 'ai_wo_sum_v1',
  custIns: 'ai_cust_v1', risks: 'ai_risks_v1', daily: 'ai_daily_v1', usage: 'ai_usage_v1',
};

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
async function load<T>(k: string): Promise<T[]> { const r = await AsyncStorage.getItem(k); return r ? JSON.parse(r) : []; }
async function save<T>(k: string, v: T[]) { await AsyncStorage.setItem(k, JSON.stringify(v)); }

export const FEATURE_LABEL: Record<AiFeature, string> = {
  chat: 'Sohbet', poz_suggest: 'POZ Öneri', quote_draft: 'Teklif Taslağı',
  workorder_summary: 'İş Emri Özeti', customer_summary: 'Müşteri Özeti',
  risk_analysis: 'Risk Analizi', daily_report: 'Günlük Rapor', logs: 'Loglar',
};
export const FEATURE_ICON: Record<AiFeature, string> = {
  chat: 'chatbubbles-outline', poz_suggest: 'pricetag-outline', quote_draft: 'document-text-outline',
  workorder_summary: 'newspaper-outline', customer_summary: 'person-outline',
  risk_analysis: 'warning-outline', daily_report: 'calendar-outline', logs: 'list-outline',
};
export const ROLE_LABEL: Record<AiUserRole, string> = { admin: 'Yönetici', manager: 'Müdür', staff: 'Personel', sales: 'Satış' };
export const ROLE_COLOR: Record<AiUserRole, string> = { admin: '#ef4444', manager: '#a855f7', staff: '#0ea5e9', sales: '#f59e0b' };
export const PROVIDER_LABEL: Record<AiAssistantProvider, string> = { openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini', local: 'Yerel' };
export const RISK_COLOR: Record<AiRiskLevel, string> = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };
export const RISK_LABEL: Record<AiRiskLevel, string> = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik' };
export const RISK_TYPE_LABEL: Record<AiRiskType, string> = {
  delay: 'Gecikme', sla: 'SLA İhlali', low_stock: 'Düşük Stok',
  vehicle_maintenance: 'Araç Bakım', customer_churn: 'Müşteri Kaybı',
};

// Permissions
async function seedPerms(): Promise<AiPermission[]> {
  const list = await load<AiPermission>(K.perms);
  if (list.length) return list;
  const roles: AiUserRole[] = ['admin', 'manager', 'staff', 'sales'];
  const features: AiFeature[] = ['chat', 'poz_suggest', 'quote_draft', 'workorder_summary', 'customer_summary', 'risk_analysis', 'daily_report', 'logs'];
  const seed: AiPermission[] = [];
  roles.forEach(r => features.forEach(f => {
    const enabled = r === 'admin' ? true
      : r === 'manager' ? f !== 'logs'
      : r === 'sales' ? ['chat', 'quote_draft', 'customer_summary'].includes(f)
      : ['chat', 'poz_suggest', 'workorder_summary'].includes(f);
    seed.push({ id: uid(), role: r, feature: f, enabled });
  }));
  await save(K.perms, seed); return seed;
}
export async function listPermissions() { return seedPerms(); }
export async function togglePermission(id: string) {
  const list = await load<AiPermission>(K.perms);
  const i = list.findIndex(p => p.id === id);
  if (i >= 0) { list[i].enabled = !list[i].enabled; await save(K.perms, list); }
}

// Sessions & Messages
async function seedSessions(): Promise<AiSession[]> {
  const list = await load<AiSession>(K.sessions);
  if (list.length) return list;
  const seed: AiSession[] = [
    { id: 's1', title: 'Trafo bakım planı', feature: 'chat', createdAt: now(), updatedAt: now(), messageCount: 6, tokenTotal: 842 },
    { id: 's2', title: 'GES teklif taslağı', feature: 'quote_draft', createdAt: now(), updatedAt: now(), messageCount: 4, tokenTotal: 1284 },
  ];
  await save(K.sessions, seed);
  const msgs: AiMessage[] = [
    { id: uid(), sessionId: 's1', role: 'user', content: '50kVA trafo bakımı için POZ önerir misin?', createdAt: now() },
    { id: uid(), sessionId: 's1', role: 'assistant', content: 'POZ-26.110.1001 (Trafo Periyodik Bakım) öneririm. Test+temizlik+yağ analizi içerir.', createdAt: now(), tokens: 120, sources: ['POZ Kataloğu', 'TEDAŞ-2024'], approved: true },
  ];
  await save(K.messages, msgs);
  return seed;
}
export async function listSessions() { return seedSessions(); }
export async function createSession(title: string, feature: AiFeature): Promise<AiSession> {
  const list = await load<AiSession>(K.sessions);
  const s: AiSession = { id: uid(), title, feature, createdAt: now(), updatedAt: now(), messageCount: 0, tokenTotal: 0 };
  list.unshift(s); await save(K.sessions, list); return s;
}
export async function deleteSession(id: string) {
  const list = await load<AiSession>(K.sessions);
  await save(K.sessions, list.filter(s => s.id !== id));
  const msgs = await load<AiMessage>(K.messages);
  await save(K.messages, msgs.filter(m => m.sessionId !== id));
}
export async function listMessages(sessionId: string): Promise<AiMessage[]> {
  await seedSessions();
  const all = await load<AiMessage>(K.messages);
  return all.filter(m => m.sessionId === sessionId);
}
export async function sendMessage(sessionId: string, content: string): Promise<AiMessage> {
  const msgs = await load<AiMessage>(K.messages);
  const user: AiMessage = { id: uid(), sessionId, role: 'user', content, createdAt: now() };
  msgs.push(user);
  // Mock assistant reply
  const reply: AiMessage = {
    id: uid(), sessionId, role: 'assistant',
    content: mockReply(content),
    createdAt: now(),
    tokens: 80 + Math.floor(Math.random() * 200),
    sources: ['POZ Kataloğu'],
  };
  msgs.push(reply); await save(K.messages, msgs);
  // Update session
  const sess = await load<AiSession>(K.sessions);
  const i = sess.findIndex(s => s.id === sessionId);
  if (i >= 0) { sess[i].messageCount += 2; sess[i].tokenTotal += reply.tokens || 0; sess[i].updatedAt = now(); await save(K.sessions, sess); }
  // Log usage
  await logUsage('chat', 'openai', Math.floor(content.length / 4), reply.tokens || 0, true);
  return reply;
}
export async function approveMessage(id: string) {
  const msgs = await load<AiMessage>(K.messages);
  const i = msgs.findIndex(m => m.id === id);
  if (i >= 0) { msgs[i].approved = true; await save(K.messages, msgs); }
}
function mockReply(q: string): string {
  const l = q.toLowerCase();
  if (l.includes('poz')) return 'POZ-26.110.1001 (Trafo Periyodik Bakım) önerilir. Test, temizlik, yağ analizi içerir.';
  if (l.includes('teklif')) return 'Müşteri profili ve geçmiş tekliflere göre 3 kalemli teklif taslağı hazırladım. Detay için POZ önerilerine bakın.';
  if (l.includes('rapor')) return 'Bugün tamamlanan 12 iş emrinden 10 başarılı, 2 ertelendi. SLA hedefi %92.';
  if (l.includes('risk')) return '3 araç bakım süresi yaklaşıyor (Plaka A,B,C). 2 müşteride SLA risk seviyesi yüksek.';
  return 'İsteğinizi anladım. Daha fazla bilgi için ilgili modülü kontrol edebilirsiniz.';
}

// POZ suggestion
async function seedPoz(): Promise<AiPozSuggestion[]> {
  const list = await load<AiPozSuggestion>(K.poz);
  if (list.length) return list;
  const seed: AiPozSuggestion[] = [
    { id: uid(), description: '50kVA trafo periyodik bakım', pozCode: '26.110.1001', pozName: 'Trafo Bakım', confidence: 0.92, unitPrice: 4500, createdAt: now() },
    { id: uid(), description: 'GES panel temizliği 100 panel', pozCode: '26.220.1051', pozName: 'PV Panel Temizlik', confidence: 0.84, unitPrice: 28, createdAt: now() },
    { id: uid(), description: 'OSOS sayaç kurulumu', pozCode: '26.310.2010', pozName: 'AMR Sayaç', confidence: 0.78, unitPrice: 850, createdAt: now() },
  ];
  await save(K.poz, seed); return seed;
}
export async function listPozSuggestions() { return seedPoz(); }
export async function suggestPoz(description: string): Promise<AiPozSuggestion> {
  const list = await load<AiPozSuggestion>(K.poz);
  const codes = ['26.110.1001', '26.220.1051', '26.310.2010', '26.450.5001'];
  const names = ['Trafo Bakım', 'PV Panel Temizlik', 'AMR Sayaç', 'OG Hat Kesim'];
  const i = Math.floor(Math.random() * codes.length);
  const s: AiPozSuggestion = {
    id: uid(), description, pozCode: codes[i], pozName: names[i],
    confidence: 0.6 + Math.random() * 0.35,
    unitPrice: 500 + Math.floor(Math.random() * 4500),
    createdAt: now(),
  };
  list.unshift(s); await save(K.poz, list);
  await logUsage('poz_suggest', 'openai', 50, 80, true);
  return s;
}
export async function acceptPoz(id: string, accepted: boolean) {
  const list = await load<AiPozSuggestion>(K.poz);
  const i = list.findIndex(p => p.id === id);
  if (i >= 0) { list[i].accepted = accepted; await save(K.poz, list); }
}

// Quote draft
async function seedQuotes(): Promise<AiQuoteDraft[]> {
  const list = await load<AiQuoteDraft>(K.quotes);
  if (list.length) return list;
  const seed: AiQuoteDraft[] = [
    {
      id: 'qd1', customerName: 'Demo Elektrik A.Ş.', surveyText: '3 trafo + 2 km OG hat bakımı',
      items: [
        { pozCode: '26.110.1001', pozName: 'Trafo Bakım', qty: 3, unitPrice: 4500 },
        { pozCode: '26.450.5001', pozName: 'OG Hat Kesim', qty: 2, unitPrice: 12000 },
      ],
      totalAmount: 3 * 4500 + 2 * 12000, createdAt: now(), status: 'draft',
    },
  ];
  await save(K.quotes, seed); return seed;
}
export async function listQuoteDrafts() { return seedQuotes(); }
export async function generateQuoteDraft(customerName: string, surveyText: string): Promise<AiQuoteDraft> {
  const list = await load<AiQuoteDraft>(K.quotes);
  const items = [
    { pozCode: '26.110.1001', pozName: 'Trafo Bakım', qty: 1 + Math.floor(Math.random() * 3), unitPrice: 4500 },
    { pozCode: '26.220.1051', pozName: 'PV Panel Temizlik', qty: 50 + Math.floor(Math.random() * 100), unitPrice: 28 },
  ];
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const d: AiQuoteDraft = { id: uid(), customerName, surveyText, items, totalAmount: total, createdAt: now(), status: 'draft' };
  list.unshift(d); await save(K.quotes, list);
  await logUsage('quote_draft', 'openai', 200, 400, true);
  return d;
}
export async function setQuoteDraftStatus(id: string, status: AiQuoteDraft['status']) {
  const list = await load<AiQuoteDraft>(K.quotes);
  const i = list.findIndex(q => q.id === id);
  if (i >= 0) { list[i].status = status; await save(K.quotes, list); }
}
export async function getQuoteDraft(id: string): Promise<AiQuoteDraft | undefined> {
  const list = await load<AiQuoteDraft>(K.quotes);
  return list.find(q => q.id === id);
}

// Work order summaries
async function seedWoSum(): Promise<AiWorkOrderSummary[]> {
  const list = await load<AiWorkOrderSummary>(K.woSum);
  if (list.length) return list;
  const seed: AiWorkOrderSummary[] = [
    { id: uid(), workOrderId: 'WO-2024-0451', summary: '3 saatte tamamlandı. Trafo yağı temizlendi, koruma röleleri test edildi. Sonuç: OK.', highlights: ['Yağ değişimi', 'Röle testi başarılı', 'Müşteri imzası alındı'], createdAt: now() },
    { id: uid(), workOrderId: 'WO-2024-0452', summary: 'Panel temizliği 4 saatte 80 panelde uygulandı. 2 panelde kablo gevşekliği tespit edildi.', highlights: ['80 panel temizlendi', '2 kablo onarımı', 'Verim ölçümü +%4'], createdAt: now() },
  ];
  await save(K.woSum, seed); return seed;
}
export async function listWoSummaries() { return seedWoSum(); }
export async function summarizeWorkOrder(workOrderId: string): Promise<AiWorkOrderSummary> {
  const list = await load<AiWorkOrderSummary>(K.woSum);
  const s: AiWorkOrderSummary = {
    id: uid(), workOrderId,
    summary: `${workOrderId} işi mock özet: saha çalışması başarıyla tamamlandı, kalite kontrol formu dolduruldu.`,
    highlights: ['Form tamamlandı', 'Fotoğraf eklendi', 'Müşteri onayı alındı'],
    createdAt: now(),
  };
  list.unshift(s); await save(K.woSum, list);
  await logUsage('workorder_summary', 'openai', 300, 250, true);
  return s;
}

// Customer insight
async function seedCust(): Promise<AiCustomerInsight[]> {
  const list = await load<AiCustomerInsight>(K.custIns);
  if (list.length) return list;
  const seed: AiCustomerInsight[] = [
    { id: uid(), customerId: 'c1', customerName: 'Demo Elektrik A.Ş.', summary: 'Son 12 ayda 18 iş emri, 4 teklif. Ortalama ödeme süresi 24 gün. SLA uyumu %94.', quotesCount: 4, workOrdersCount: 18, totalRevenue: 248000, lastVisitAt: now(), createdAt: now() },
    { id: uid(), customerId: 'c2', customerName: 'Test Mühendislik Ltd.', summary: 'Yeni müşteri, 2 teklif gönderildi 1 onaylandı. Tahsilat sorunu yok.', quotesCount: 2, workOrdersCount: 3, totalRevenue: 42000, createdAt: now() },
  ];
  await save(K.custIns, seed); return seed;
}
export async function listCustomerInsights() { return seedCust(); }
export async function generateCustomerInsight(customerId: string, customerName: string): Promise<AiCustomerInsight> {
  const list = await load<AiCustomerInsight>(K.custIns);
  const c: AiCustomerInsight = {
    id: uid(), customerId, customerName,
    summary: `${customerName} için otomatik özet: aktif müşteri, son ziyaret 7 gün önce. Risk düşük.`,
    quotesCount: Math.floor(Math.random() * 10), workOrdersCount: Math.floor(Math.random() * 25),
    totalRevenue: Math.floor(Math.random() * 500000), lastVisitAt: now(), createdAt: now(),
  };
  list.unshift(c); await save(K.custIns, list);
  await logUsage('customer_summary', 'openai', 250, 200, true);
  return c;
}

// Risk alerts
async function seedRisks(): Promise<AiRiskAlert[]> {
  const list = await load<AiRiskAlert>(K.risks);
  if (list.length) return list;
  const seed: AiRiskAlert[] = [
    { id: uid(), type: 'delay', level: 'high', title: '3 iş emri SLA sınırında', message: 'WO-0451, WO-0452, WO-0453 son 4 saat içinde tamamlanmalı.', createdAt: now() },
    { id: uid(), type: 'low_stock', level: 'medium', title: 'Trafo yağı azaldı', message: '50 lt kaldı, kritik eşik 100 lt.', createdAt: now() },
    { id: uid(), type: 'vehicle_maintenance', level: 'medium', title: '2 araç bakım zamanı geldi', message: 'Plaka A: 5000 km, Plaka B: 10000 km bakım yaklaşıyor.', createdAt: now() },
    { id: uid(), type: 'sla', level: 'critical', title: 'Müşteri SLA ihlali risk', message: 'Demo Elektrik A.Ş. için yanıt süresi %85’in altına düştü.', createdAt: now() },
    { id: uid(), type: 'customer_churn', level: 'low', title: 'Pasif müşteri', message: 'Test Mühendislik 60 gündür yeni teklif almadı.', createdAt: now() },
  ];
  await save(K.risks, seed); return seed;
}
export async function listRiskAlerts() { return seedRisks(); }
export async function dismissRisk(id: string) {
  const list = await load<AiRiskAlert>(K.risks);
  const i = list.findIndex(r => r.id === id);
  if (i >= 0) { list[i].dismissed = true; await save(K.risks, list); }
}

// Daily report
async function seedDaily(): Promise<AiDailyReport[]> {
  const list = await load<AiDailyReport>(K.daily);
  if (list.length) return list;
  const seed: AiDailyReport[] = [
    {
      id: uid(), date: new Date().toISOString().slice(0, 10),
      text: 'Bugün 14 iş emri açıldı, 12 tamamlandı. 3 acil durum kaydı. 5 yeni teklif gönderildi.',
      metrics: [
        { label: 'Açılan İş', value: '14' },
        { label: 'Tamamlanan', value: '12' },
        { label: 'Yeni Teklif', value: '5' },
        { label: 'SLA Uyumu', value: '%94' },
      ],
      createdAt: now(),
    },
  ];
  await save(K.daily, seed); return seed;
}
export async function listDailyReports() { return seedDaily(); }
export async function generateDailyReport(): Promise<AiDailyReport> {
  const list = await load<AiDailyReport>(K.daily);
  const r: AiDailyReport = {
    id: uid(), date: new Date().toISOString().slice(0, 10),
    text: 'Otomatik gün özeti: operasyon normal, kritik olay yok.',
    metrics: [
      { label: 'İş Emri', value: String(10 + Math.floor(Math.random() * 20)) },
      { label: 'Teklif', value: String(2 + Math.floor(Math.random() * 8)) },
      { label: 'Ziyaret', value: String(5 + Math.floor(Math.random() * 15)) },
      { label: 'SLA', value: `%${85 + Math.floor(Math.random() * 12)}` },
    ],
    createdAt: now(),
  };
  list.unshift(r); await save(K.daily, list);
  await logUsage('daily_report', 'openai', 400, 350, true);
  return r;
}

// Usage logs
async function seedUsage(): Promise<AiUsageLog[]> {
  const list = await load<AiUsageLog>(K.usage);
  if (list.length) return list;
  const features: AiFeature[] = ['chat', 'poz_suggest', 'quote_draft', 'workorder_summary'];
  const providers: AiAssistantProvider[] = ['openai', 'anthropic'];
  const seed: AiUsageLog[] = Array.from({ length: 12 }).map((_, i) => {
    const pTok = 100 + Math.floor(Math.random() * 400);
    const cTok = 100 + Math.floor(Math.random() * 300);
    return {
      id: uid(), feature: features[i % features.length], provider: providers[i % providers.length],
      promptTokens: pTok, completionTokens: cTok,
      costUsd: ((pTok * 0.003 + cTok * 0.006) / 1000),
      durationMs: 800 + Math.floor(Math.random() * 4000),
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      success: i !== 4,
      errorMessage: i === 4 ? 'Rate limit' : undefined,
    };
  });
  await save(K.usage, seed); return seed;
}
export async function listUsageLogs() { return seedUsage(); }
async function logUsage(feature: AiFeature, provider: AiAssistantProvider, pTok: number, cTok: number, success: boolean, errorMessage?: string) {
  const list = await load<AiUsageLog>(K.usage);
  list.unshift({
    id: uid(), feature, provider, promptTokens: pTok, completionTokens: cTok,
    costUsd: (pTok * 0.003 + cTok * 0.006) / 1000,
    durationMs: 500 + Math.floor(Math.random() * 3000),
    createdAt: now(), success, errorMessage,
  });
  await save(K.usage, list.slice(0, 200));
}
