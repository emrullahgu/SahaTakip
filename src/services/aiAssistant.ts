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
  return [];
}
export async function listPermissions() { return seedPerms(); }
export async function togglePermission(id: string) {
  const list = await load<AiPermission>(K.perms);
  const i = list.findIndex(p => p.id === id);
  if (i >= 0) { list[i].enabled = !list[i].enabled; await save(K.perms, list); }
}

// Sessions & Messages
async function seedSessions(): Promise<AiSession[]> {
  return [];
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
  // Önce gerçek Copilot LLM'ini dene; başarısız olursa mock'a düş.
  let replyText = '';
  let tokens = 0;
  try {
    const { askCopilot } = await import('./aiCopilot');
    // Bu katmanda canlı snapshot yok — boş snapshot ile gönderiyoruz; KB ve
    // sistem promptu yine de zenginleştirme yapacak.
    const prevMsgs = msgs
      .filter(m => m.sessionId === sessionId)
      .slice(-8)
      .map(m => ({
        id: m.id,
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      }));
    const res = await askCopilot(content, {
      workOrders: [],
      customers: [],
      quotes: [],
      employees: [],
      currentUserName: 'Kullanıcı',
    }, prevMsgs);
    if (res.provider !== 'mock' && res.reply) {
      replyText = res.reply;
      tokens = Math.max(60, Math.floor(res.reply.length / 4));
    }
  } catch {
    /* askCopilot başarısız → mock'a düş */
  }
  if (!replyText) {
    replyText = mockReply(content);
    tokens = 80 + Math.floor(Math.random() * 200);
  }
  const reply: AiMessage = {
    id: uid(), sessionId, role: 'assistant',
    content: replyText,
    createdAt: now(),
    tokens,
    sources: ['Copilot KB'],
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
  return [];
}
export async function listPozSuggestions() { return seedPoz(); }
export async function suggestPoz(description: string): Promise<AiPozSuggestion> {
  const list = await load<AiPozSuggestion>(K.poz);
  // GERÇEK 1119 kalemlik POZ kataloğundan eşleştir (anahtar kelime + LLM zenginleştirme).
  // Önceki sürüm rastgele sahte kodlar üretiyordu.
  let pozCode = '';
  let pozName = '';
  let unitPrice = 0;
  let confidence = 0.5;
  try {
    const { suggestPozFromDescription } = await import('./ai');
    const matches = await suggestPozFromDescription(description);
    if (matches.length) {
      const top = matches[0];
      pozCode = top.pozId;
      pozName = top.name;
      unitPrice = top.unitPrice;
      confidence = Math.min(0.99, Math.max(0.4, top.score / 100));
    }
  } catch { /* katalog erişilemezse boş bırak */ }
  const s: AiPozSuggestion = {
    id: uid(), description,
    pozCode: pozCode || '—',
    pozName: pozName || 'Eşleşen poz bulunamadı — açıklamayı detaylandırın',
    confidence,
    unitPrice,
    createdAt: now(),
  };
  list.unshift(s); await save(K.poz, list);
  await logUsage('poz_suggest', 'gemini', 50, 80, !!pozCode);
  return s;
}
export async function acceptPoz(id: string, accepted: boolean) {
  const list = await load<AiPozSuggestion>(K.poz);
  const i = list.findIndex(p => p.id === id);
  if (i >= 0) { list[i].accepted = accepted; await save(K.poz, list); }
}

// Quote draft
async function seedQuotes(): Promise<AiQuoteDraft[]> {
  return [];
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
  return [];
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
  return [];
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
  return [];
}
export async function listRiskAlerts() { return seedRisks(); }
export async function dismissRisk(id: string) {
  const list = await load<AiRiskAlert>(K.risks);
  const i = list.findIndex(r => r.id === id);
  if (i >= 0) { list[i].dismissed = true; await save(K.risks, list); }
}

// Daily report
async function seedDaily(): Promise<AiDailyReport[]> {
  return [];
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
  return [];
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
