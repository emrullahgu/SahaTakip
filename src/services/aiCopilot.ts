// aiCopilot.ts — Sistemi bilen, araç çağırabilen AI asistanı.
// Gerçek LLM çağrıları services/ai.ts içindeki provider-agnostic `chat()`
// fonksiyonu üzerinden yapılır (OpenAI / Claude / Gemini).
//
// Copilot her isteğin başında uygulamadan canlı snapshot toplar (bugünün iş
// emirleri, bekleyen onaylar, son müşteriler, POZ kataloğu örneği, KB
// dökümanları) ve sistem promptu olarak modele iletir. Bu sayede sahaya özgü
// ve gerçek verilere dayalı yanıt üretir.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { chat as llmChat, chatWithFallback, getAiSettings } from './ai';
import { retrieveRelevant, KbDoc } from './aiKnowledgeBase';
import { POZ_CATALOG } from '../data/pozCatalog';
import type { WorkOrder, Customer, Quote, Employee } from '../types';

const HIST_KEY = 'ai_copilot_history_v1';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CopilotSnapshot {
  workOrders: WorkOrder[];
  customers: Customer[];
  quotes: Quote[];
  employees: Employee[];
  currentUserName?: string;
}

function uid() { return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6); }
function todayKey() { return new Date().toISOString().slice(0, 10); }

export async function loadHistory(): Promise<CopilotMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(HIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveHistory(msgs: CopilotMessage[]): Promise<void> {
  // Son 50 mesajı sakla — token şişmesini önler.
  const trimmed = msgs.slice(-50);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(trimmed));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HIST_KEY);
}

/** Sistemden canlı snapshot al → AI promptu için kompakt JSON özet üret. */
function summarizeSnapshot(snap: CopilotSnapshot, kbDocs: KbDoc[]): string {
  const today = todayKey();
  const pendingWO = snap.workOrders.filter(w => w.status === 'Onay Bekliyor');
  const inProgress = snap.workOrders.filter(w => w.status === 'Başladı');
  const todayWO = snap.workOrders.filter(w => (w.plannedStart || w.date || '').slice(0, 10) === today);
  const overdueWO = snap.workOrders.filter(w => {
    if (!w.plannedEnd) return false;
    return new Date(w.plannedEnd).getTime() < Date.now() && w.status !== 'Tamamlandı' && w.status !== 'Faturalandırıldı';
  });

  const recentCustomers = snap.customers.slice(0, 10).map(c => ({
    id: c.id,
    name: c.shortName || c.title,
    type: c.type,
    city: c.city,
  }));

  const recentQuotes = snap.quotes.slice(0, 8).map(q => ({
    id: q.id,
    customer: q.customerName,
    total: q.grandTotal,
    status: q.status,
  }));

  const pozSample = POZ_CATALOG.slice(0, 12).map(p => ({
    code: p.id,
    name: p.name,
    unit: p.unit,
    price: p.materialPrice + p.installPrice,
  }));

  return [
    `# Canlı Sistem Verisi (${new Date().toLocaleString('tr-TR')})`,
    `Bugün: ${today}`,
    `Aktif kullanıcı: ${snap.currentUserName || 'bilinmiyor'}`,
    ``,
    `## İş Emirleri Özet`,
    `- Bugün planlı: ${todayWO.length}`,
    `- Devam eden: ${inProgress.length}`,
    `- Onay bekleyen: ${pendingWO.length}`,
    `- Geciken (SLA aşımı): ${overdueWO.length}`,
    todayWO.length ? `### Bugünün İşleri\n${todayWO.slice(0, 8).map(w => `- ${w.id} | ${w.client} | ${w.serviceName} | ${w.status} | müh: ${w.engineer}`).join('\n')}` : '',
    overdueWO.length ? `### Geciken İşler\n${overdueWO.slice(0, 5).map(w => `- ${w.id} | ${w.client} | ${w.serviceName} | bitmesi gereken: ${w.plannedEnd}`).join('\n')}` : '',
    pendingWO.length ? `### Onay Bekleyen Servis Raporları\n${pendingWO.slice(0, 5).map(w => `- ${w.id} | ${w.client} | ${w.serviceName} | müh: ${w.engineer}`).join('\n')}` : '',
    ``,
    `## Son Müşteriler (örnek)`,
    recentCustomers.map(c => `- ${c.id} | ${c.name} | ${c.type || ''} | ${c.city || ''}`).join('\n'),
    ``,
    `## Son Teklifler`,
    recentQuotes.length ? recentQuotes.map(q => `- ${q.id} | ${q.customer} | ₺${q.total} | ${q.status}`).join('\n') : '(yok)',
    ``,
    `## POZ Kataloğu Örneği (toplam ${POZ_CATALOG.length} kalem)`,
    pozSample.map(p => `- ${p.code} | ${p.name} | ${p.unit} | ₺${p.price}`).join('\n'),
    ``,
    kbDocs.length ? `## Bilgi Tabanı (kullanıcı yüklediği dokümanlar)\n${kbDocs.map(d => `### ${d.title}\n${d.content.slice(0, 1200)}`).join('\n\n')}` : '',
  ].filter(Boolean).join('\n');
}

const SYSTEM_PROMPT_BASE = `Sen "Saha Copilot"sun — bir saha hizmetleri yönetim platformunun (elektrik bakım, OSOS, trafo servis) iç AI asistanısın.

Görevin:
- Teknik fiyat teklifleri hazırlamak (POZ kataloğunu ve malzeme fiyatlarını kullan)
- Kullanıcının günlük ajandasını gözden geçirip atladığı işleri bulmak
- Onay bekleyen servis raporlarını, gecikmiş iş emirlerini özetlemek
- Bilgi tabanındaki dökümanlardan (kullanıcının NotebookLM benzeri yüklediği notlar) cevap üretmek
- Türkçe, kısa ve eylem odaklı cevap vermek

Kurallar:
- Yalnızca aşağıdaki "Canlı Sistem Verisi" bölümünde verilen veri ve POZ kataloğuyla cevap üret. Veri yoksa uydurma — "verim yok" de.
- Fiyat teklifi istendiğinde: tablo formatında kalem/birim/adet/birim fiyat/tutar göster, KDV %20 ekle, toplamı vurgula.
- "Bugün ne yapmalıyım?" sorusuna: aktif kullanıcının bugün planlı işleri + geciken işleri + onay bekleyenleri listele.
- "Atladığım var mı?" sorusuna: geciken işleri + bekleyen onayları + son 7 gündeki kapanmamış işleri özetle.
- Asla API anahtarı, gizli bilgi ifşa etme.
- Markdown başlık ve liste kullan.`;

/** Ana Copilot çağrısı. */
export async function askCopilot(
  userMessage: string,
  snapshot: CopilotSnapshot,
  history: CopilotMessage[] = [],
): Promise<{ reply: string; provider: string; model?: string }> {
  const settings = await getAiSettings();
  if (settings.provider === 'mock' || !settings.apiKey) {
    return {
      reply: 'AI sağlayıcı yapılandırılmamış. **AI Ayarları** ekranından OpenAI / Claude / Gemini anahtarı girin. (Demo mod aktif — gerçek cevap üretilemiyor.)',
      provider: 'mock',
    };
  }

  // KB'den ilgili dokümanları getir
  const kbDocs = await retrieveRelevant(userMessage, 5);
  const liveContext = summarizeSnapshot(snapshot, kbDocs);

  // Son 8 mesajı geçmişten ekle
  const historyText = history.slice(-8).map(m =>
    `[${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}]: ${m.content}`
  ).join('\n');

  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n---\n${liveContext}\n\n---\n## Önceki Mesajlar\n${historyText || '(yok)'}`;

  try {
    const out = await chatWithFallback(userMessage, settings, systemPrompt);
    return { reply: out.reply || '(boş yanıt)', provider: out.usedProvider, model: out.usedModel };
  } catch (e: any) {
    return { reply: `Hata: ${e?.message || 'bilinmeyen'}`, provider: settings.provider };
  }
}

export interface QuickPrompt { label: string; icon: string; prompt: string; }
export const QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'Bugün ne yapmalıyım?', icon: 'calendar-outline', prompt: 'Bugün yapmam gereken işleri özetle. Önceliklendir.' },
  { label: 'Atladığım var mı?', icon: 'warning-outline', prompt: 'Geciken iş emirleri, onay bekleyen raporlar ve son 7 günde kapanmamış işleri listele. Atladığım kritik bir şey var mı?' },
  { label: '3+1 Ev Elektrik Teklifi', icon: 'home-outline', prompt: '3+1 (yaklaşık 110 m²) bir konut için komple elektrik tesisat fiyat teklifi hazırla. POZ kataloğundaki kalemleri kullan, KDV %20 ekle, toplamı tabloyla göster.' },
  { label: 'Trafo Bakım Teklifi', icon: 'flash-outline', prompt: 'Bir orta gerilim trafo merkezi (1 adet 1000 kVA trafo) için periyodik bakım fiyat teklifi hazırla. POZ kataloğundan uygun kalemleri seç.' },
  { label: 'Bekleyen Onayları Özetle', icon: 'checkmark-done-outline', prompt: 'Onay bekleyen servis raporlarını listele, her biri için müşteri, mühendis ve hizmet türünü belirt.' },
  { label: 'Geciken İşler', icon: 'time-outline', prompt: 'SLA aşımı yapmış / planlı bitiş tarihi geçmiş açık iş emirlerini listele. Müşteri ve sorumlu mühendis bilgisiyle birlikte göster.' },
];

/** İlerideki Gmail/WhatsApp entegrasyonu için pano-paste yardımcısı:
 *  Kullanıcı son e-postaları/mesajları KB'ye "inbox" tag'iyle ekler;
 *  bu fonksiyon onları tarayıp aksiyon önerisi üretir. */
export async function scanInboxAndSuggest(
  snapshot: CopilotSnapshot,
): Promise<string> {
  const inboxDocs = (await retrieveRelevant('inbox email whatsapp', 10)).filter(d =>
    d.tags?.includes('inbox') || d.source === 'email' || d.source === 'whatsapp'
  );
  if (!inboxDocs.length) {
    return 'Bilgi Tabanı\'na "inbox" etiketi ile e-posta veya WhatsApp özeti eklenmemiş. Önce **Bilgi Tabanı** ekranından son mesajlarınızı yapıştırın.';
  }
  const settings = await getAiSettings();
  if (settings.provider === 'mock' || !settings.apiKey) {
    return 'AI sağlayıcı yapılandırılmamış.';
  }
  const context = summarizeSnapshot(snapshot, inboxDocs);
  const out = await chatWithFallback(
    'Aşağıdaki gelen kutusu (e-posta / WhatsApp) özetlerini incele. Cevap bekleyen, randevu talebi içeren ya da iş emrine dönüşmesi gereken mesajları listele. Aksiyon önerileri ver.',
    settings,
    `${SYSTEM_PROMPT_BASE}\n\n---\n${context}`,
  );
  return out.reply || '(boş yanıt)';
}
