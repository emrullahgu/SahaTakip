// services/ai.ts — POZ-DEV-090..092 AI core (OpenAI/Claude/mock)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { AiProvider, AiSettings, DamageAnalysis, DamageSeverity, PozSuggestion, VoiceReport } from '../types';
import { POZ_CATALOG, PozItem } from '../data/pozCatalog';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const SETTINGS_KEY = '@SahaTakip:ai_settings';
const SETTINGS_REMOTE_KEY = 'ai_settings'; // app_settings.key
const VOICE_KEY = '@SahaTakip:voice_reports';

const DEFAULT_MODEL: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  claude: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
  mock: 'mock',
};

// Sağlayıcı kartına tıklandığında otomatik dolduracağımız built-in anahtarlar —
// kaynak koda gömmek yerine .env (EXPO_PUBLIC_*) üzerinden okunur.
export function getBuiltinKey(p: AiProvider): string | undefined {
  switch (p) {
    case 'openai': return process.env.EXPO_PUBLIC_OPENAI_KEY;
    case 'claude': return process.env.EXPO_PUBLIC_CLAUDE_KEY;
    case 'gemini': return process.env.EXPO_PUBLIC_GEMINI_KEY;
    default: return undefined;
  }
}

// Remote (Supabase) → tüm kullanıcılar tarafından paylaşılan ayarları çek.
// Admin bir kere yazar, herkes okur. RLS bunu zorunlu kılar.
async function fetchRemoteAiSettings(): Promise<AiSettings | null> {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_REMOTE_KEY)
      .maybeSingle();
    if (error || !data?.value) return null;
    const v = data.value as AiSettings;
    if (v?.provider && v.provider !== 'mock' && v.apiKey) return v;
    return null;
  } catch {
    return null;
  }
}

async function pushRemoteAiSettings(s: AiSettings): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id ?? null;
    await supabase
      .from('app_settings')
      .upsert({ key: SETTINGS_REMOTE_KEY, value: s, updated_by: uid, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch {
    // RLS reddi (non-admin) sessizce geçilir — yerel kayıt yine de yapılır.
  }
}

export async function getAiSettings(): Promise<AiSettings> {
  // 1) Yerel cache (en hızlı)
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AiSettings;
      if (parsed.provider && parsed.provider !== 'mock' && parsed.apiKey) return parsed;
    }
  } catch { /* ignore */ }

  // 2) Supabase paylaşımlı ayar (admin'in yazdığı, herkes okuyabilir)
  const remote = await fetchRemoteAiSettings();
  if (remote) {
    try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(remote)); } catch { /* ignore */ }
    return remote;
  }

  // 3) Fallback: .env'den seed et (yalnızca anahtar girilmemişse).
  const envProv = (process.env.EXPO_PUBLIC_AI_DEFAULT_PROVIDER || '').toLowerCase() as AiProvider;
  const envKey =
    envProv === 'openai' ? process.env.EXPO_PUBLIC_OPENAI_KEY :
    envProv === 'claude' ? process.env.EXPO_PUBLIC_CLAUDE_KEY :
    envProv === 'gemini' ? process.env.EXPO_PUBLIC_GEMINI_KEY :
    undefined;
  if (envProv && envKey && envProv !== 'mock') {
    return { provider: envProv, apiKey: envKey, model: DEFAULT_MODEL[envProv] };
  }
  // İkincil: hangi anahtar varsa onu kullan (öncelik: gemini > openai > claude).
  if (process.env.EXPO_PUBLIC_GEMINI_KEY) return { provider: 'gemini', apiKey: process.env.EXPO_PUBLIC_GEMINI_KEY, model: DEFAULT_MODEL.gemini };
  if (process.env.EXPO_PUBLIC_OPENAI_KEY) return { provider: 'openai', apiKey: process.env.EXPO_PUBLIC_OPENAI_KEY, model: DEFAULT_MODEL.openai };
  if (process.env.EXPO_PUBLIC_CLAUDE_KEY) return { provider: 'claude', apiKey: process.env.EXPO_PUBLIC_CLAUDE_KEY, model: DEFAULT_MODEL.claude };

  return { provider: 'mock' };
}

export async function setAiSettings(s: AiSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  // Admin yazdıysa Supabase'e de gönder ki diğer kullanıcılar da kullansın.
  await pushRemoteAiSettings(s);
}

/** Uygulama açılışında çağrılır — remote ayarları cache'e indirip non-admin kullanıcıların hemen kullanmasını sağlar. */
export async function syncRemoteAiSettings(): Promise<void> {
  const remote = await fetchRemoteAiSettings();
  if (remote) {
    try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(remote)); } catch { /* ignore */ }
  }
}

export const AI_PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: 'OpenAI (ChatGPT)',
  claude: 'Anthropic (Claude)',
  gemini: 'Google (Gemini)',
  mock: 'Demo (yerel)',
};

// Tek seferlik bağlantı testi — UI'daki "Test" butonu için.
export async function pingAi(s: AiSettings): Promise<{ ok: boolean; message: string; sample?: string }> {
  if (s.provider === 'mock') {
    return { ok: true, message: 'Demo modu — gerçek bağlantı yok.' };
  }
  if (!s.apiKey) {
    return { ok: false, message: 'API anahtarı boş.' };
  }
  try {
    const out = await chat('Merhaba, kısa bir Türkçe selam ver.', s, 'Sen kısa cevap veren bir Türkçe asistansın.');
    const sample = (out || '').trim().slice(0, 120);
    if (!sample) return { ok: false, message: 'Sağlayıcı boş cevap döndü.' };
    return { ok: true, message: 'Bağlantı başarılı.', sample };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Bilinmeyen hata' };
  }
}

// ---------- Provider-agnostic chat call ----------
async function chat(prompt: string, settings: AiSettings, systemPrompt?: string): Promise<string> {
  if (settings.provider === 'mock' || !settings.apiKey) {
    throw new Error('AI provider yapılandırılmamış. Demo modda çalışılıyor.');
  }
  const model = settings.model || DEFAULT_MODEL[settings.provider];
  if (settings.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? '';
  }
  if (settings.provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
    const json = await res.json();
    return json.content?.[0]?.text ?? '';
  }
  if (settings.provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
  throw new Error('Bilinmeyen sağlayıcı');
}

// ---------- POZ-DEV-090: Smart POZ suggestion ----------
const TR_LOWER = (s: string) => s.toLocaleLowerCase('tr-TR');

function scoreByKeywords(query: string, p: PozItem): number {
  const q = TR_LOWER(query);
  const tokens = q.split(/[\s,;./()-]+/).filter(t => t.length >= 3);
  if (tokens.length === 0) return 0;
  const hay = TR_LOWER(`${p.name} ${p.description || ''} ${p.category}`);
  let hits = 0;
  let partial = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hits++;
    else if (t.length >= 4 && hay.includes(t.slice(0, 4))) partial++;
  }
  const ratio = (hits + partial * 0.5) / tokens.length;
  return Math.round(ratio * 100);
}

export async function suggestPozFromDescription(description: string): Promise<PozSuggestion[]> {
  if (!description.trim()) return [];
  const settings = await getAiSettings();

  // Local keyword fallback (always runs first)
  const local = POZ_CATALOG
    .map(p => ({ p, score: scoreByKeywords(description, p) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map<PozSuggestion>(({ p, score }) => ({
      pozId: p.id,
      name: p.name,
      unit: p.unit,
      unitPrice: p.materialPrice + p.installPrice,
      score,
      reason: 'Anahtar kelime eşleşmesi',
    }));

  if (settings.provider === 'mock' || !settings.apiKey) return local;

  // AI-enriched: ask model to pick top 5 from candidate list
  const candidates = local.length > 0 ? local.slice(0, 12) : POZ_CATALOG.slice(0, 30).map(p => ({
    pozId: p.id, name: p.name, unit: p.unit, unitPrice: p.materialPrice + p.installPrice, score: 0,
  }));
  const list = candidates.map(c => `- ${c.pozId} | ${c.name} | ${c.unit} | ${c.unitPrice}₺`).join('\n');
  const prompt = `Aşağıdaki saha iş tanımına en uygun POZ kalemlerini öner.\n\nİŞ TANIMI:\n${description}\n\nADAY POZLAR:\n${list}\n\nSadece JSON dizisi döndür (max 5 öneri):\n[{"pozId":"...","score":0-100,"reason":"kısa gerekçe"}]`;
  try {
    const out = await chat(prompt, settings, 'Sen bir Türkçe konuşan teklif uzmanısın. SADECE JSON döndür.');
    const match = out.match(/\[[\s\S]*\]/);
    if (!match) return local;
    const arr = JSON.parse(match[0]) as Array<{ pozId: string; score: number; reason?: string }>;
    return arr.map(a => {
      const c = candidates.find(x => x.pozId === a.pozId);
      if (!c) return null;
      return { ...c, score: a.score, reason: a.reason || 'AI önerisi' } as PozSuggestion;
    }).filter((x): x is PozSuggestion => !!x);
  } catch {
    return local;
  }
}

// ---------- POZ-DEV-091: Photo damage analysis ----------
function mockAnalyze(context?: string): DamageAnalysis {
  const lc = TR_LOWER(context || '');
  let severity: DamageSeverity = 'medium';
  let findings = ['Görsel ön inceleme tamamlandı'];
  let recs = ['Yerinde detaylı inceleme önerilir'];
  let cost = 1500;
  if (lc.includes('yangin') || lc.includes('yanık') || lc.includes('kısa devre')) {
    severity = 'critical';
    findings = ['Yanık izi tespit edildi', 'İzolasyon bozulmuş olabilir', 'Bağlantı noktaları renk değiştirmiş'];
    recs = ['ACİL: enerjiyi kesin', 'Yetkili teknisyen gönderin', 'Yangın söndürücü hazır bulundurun'];
    cost = 8500;
  } else if (lc.includes('akıntı') || lc.includes('su') || lc.includes('nem')) {
    severity = 'high';
    findings = ['Nem/su izleri tespit edildi', 'Korozyon başlangıcı görülüyor'];
    recs = ['Sızıntı kaynağını kapatın', 'Etkilenen bileşenleri değiştirin', 'Topraklama kontrolü yapın'];
    cost = 4200;
  } else if (lc.includes('eski') || lc.includes('aşınma')) {
    severity = 'low';
    findings = ['Genel aşınma görülüyor', 'Fonksiyonel'];
    recs = ['Periyodik bakım planına alın'];
    cost = 800;
  }
  return {
    severity,
    findings,
    recommendations: recs,
    estimatedCost: cost,
    confidence: 72,
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzePhoto(imageUri: string, context?: string): Promise<DamageAnalysis> {
  const settings = await getAiSettings();
  if (settings.provider === 'mock' || !settings.apiKey) {
    return { ...mockAnalyze(context), imageUri };
  }
  // Real vision call (OpenAI only — needs base64). Fall back to mock on error.
  try {
    if (settings.provider !== 'openai') return { ...mockAnalyze(context), imageUri };
    const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as never });
    const prompt = `Bu fotoğraftaki elektrik/mekanik hasarı analiz et. Türkçe SADECE şu JSON formatında cevap ver:\n{"severity":"low|medium|high|critical","findings":["..."],"recommendations":["..."],"estimatedCost":<TL sayı>,"confidence":<0-100>}\nBağlam: ${context || 'yok'}`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        }],
        temperature: 0.2,
      }),
    });
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('parse');
    const obj = JSON.parse(m[0]);
    return {
      severity: obj.severity,
      findings: Array.isArray(obj.findings) ? obj.findings : [],
      recommendations: Array.isArray(obj.recommendations) ? obj.recommendations : [],
      estimatedCost: typeof obj.estimatedCost === 'number' ? obj.estimatedCost : undefined,
      confidence: typeof obj.confidence === 'number' ? obj.confidence : 70,
      imageUri,
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    return { ...mockAnalyze(context), imageUri };
  }
}

// ---------- POZ-DEV-092: Voice → report ----------
function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function listVoiceReports(): Promise<VoiceReport[]> {
  try {
    const raw = await AsyncStorage.getItem(VOICE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function saveVoiceReports(list: VoiceReport[]): Promise<void> {
  await AsyncStorage.setItem(VOICE_KEY, JSON.stringify(list));
}
export async function deleteVoiceReport(id: string): Promise<void> {
  const list = (await listVoiceReports()).filter(r => r.id !== id);
  await saveVoiceReports(list);
}

function mockSummarize(transcript: string): { summary: string; actionItems: string[] } {
  const lower = TR_LOWER(transcript);
  const sentences = transcript.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
  const summary = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
  const actions: string[] = [];
  const triggers = ['lazım', 'gerekli', 'gönder', 'al ', 'kontrol', 'değiştir', 'tamir', 'yarın', 'sonra', 'plan'];
  for (const s of sentences) {
    const sl = TR_LOWER(s);
    if (triggers.some(t => sl.includes(t))) actions.push(s);
  }
  return {
    summary: summary || transcript.slice(0, 200),
    actionItems: actions.slice(0, 6),
  };
}

export async function summarizeTranscript(transcript: string, ctx?: { customerName?: string; workOrderId?: string }): Promise<VoiceReport> {
  const settings = await getAiSettings();
  let summary = '';
  let actionItems: string[] = [];

  if (settings.provider !== 'mock' && settings.apiKey) {
    try {
      const prompt = `Aşağıdaki saha raporu transkriptini özetle ve eylem maddeleri çıkar.\n\nTRANSKRİPT:\n${transcript}\n\nSADECE JSON döndür:\n{"summary":"3-4 cümle özet","actionItems":["madde 1","madde 2"]}`;
      const out = await chat(prompt, settings, 'Sen bir Türkçe saha raporu asistanısın. SADECE JSON döndür.');
      const m = out.match(/\{[\s\S]*\}/);
      if (m) {
        const obj = JSON.parse(m[0]);
        summary = obj.summary || '';
        actionItems = Array.isArray(obj.actionItems) ? obj.actionItems : [];
      }
    } catch { /* fall through */ }
  }
  if (!summary) {
    const m = mockSummarize(transcript);
    summary = m.summary; actionItems = m.actionItems;
  }

  const rec: VoiceReport = {
    id: rid('vr'),
    transcript,
    summary,
    actionItems,
    customerName: ctx?.customerName,
    workOrderId: ctx?.workOrderId,
    createdAt: new Date().toISOString(),
  };
  const list = await listVoiceReports();
  list.unshift(rec);
  await saveVoiceReports(list);
  return rec;
}

export const SEVERITY_LABEL_TR: Record<DamageSeverity, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};
export const SEVERITY_COLOR_AI: Record<DamageSeverity, string> = {
  low: '#0ea5e9',
  medium: '#f59e0b',
  high: '#ea580c',
  critical: '#dc2626',
};
