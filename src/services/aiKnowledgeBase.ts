// aiKnowledgeBase.ts — NotebookLM benzeri yerel bilgi tabanı.
// Kullanıcı not / e-posta dökümü / WhatsApp özetleri / teknik dökümanları
// yapıştırır; Copilot context oluştururken bu kayıtları kullanır.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ai_kb_docs_v1';

export interface KbDoc {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: 'manual' | 'email' | 'whatsapp' | 'notebooklm' | 'other';
  createdAt: string;
  updatedAt: string;
}

function uid(): string {
  return 'kb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export async function listDocs(): Promise<KbDoc[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as KbDoc[]) : [];
  } catch { return []; }
}

export async function saveDocs(list: KbDoc[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertDoc(d: Omit<KbDoc, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<KbDoc> {
  const list = await listDocs();
  const nowIso = new Date().toISOString();
  if (d.id) {
    const idx = list.findIndex(x => x.id === d.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...d, id: d.id, updatedAt: nowIso };
      await saveDocs(list);
      return list[idx];
    }
  }
  const fresh: KbDoc = {
    id: uid(),
    title: d.title,
    content: d.content,
    tags: d.tags || [],
    source: d.source || 'manual',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await saveDocs([fresh, ...list]);
  return fresh;
}

export async function deleteDoc(id: string): Promise<void> {
  const list = await listDocs();
  await saveDocs(list.filter(d => d.id !== id));
}

/** Basit keyword/recency retrieval — Copilot context için top-K döner. */
export async function retrieveRelevant(query: string, topK = 5): Promise<KbDoc[]> {
  const list = await listDocs();
  if (!query.trim()) return list.slice(0, topK);
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const scored = list.map(d => {
    const hay = (d.title + ' ' + d.content + ' ' + d.tags.join(' ')).toLowerCase();
    let score = 0;
    for (const t of terms) {
      const matches = hay.split(t).length - 1;
      score += matches;
    }
    // recency bonus
    const ageDays = (Date.now() - new Date(d.updatedAt).getTime()) / 86400000;
    score += Math.max(0, 5 - ageDays / 30);
    return { d, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(x => x.score > 0).slice(0, topK).map(x => x.d);
}
