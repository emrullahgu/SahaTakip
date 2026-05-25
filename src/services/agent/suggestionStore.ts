// services/agent/suggestionStore.ts
// ---------------------------------------------------------------
// Otonom ajanın keşfettiği sistem önerilerini saklar (AsyncStorage).
// Her kayıt: severity (low|medium|high|critical), category, title,
// description, evidence (opsiyonel JSON), suggested_action, ts.
// ---------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sahatakip.agent.suggestions.v1';

export type SuggestionSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AgentSuggestion {
  id: string;
  createdAt: string;            // ISO
  category: string;             // 'data_quality' | 'workflow' | 'security' | 'performance' | 'business' | ...
  severity: SuggestionSeverity;
  title: string;
  description: string;
  evidence?: any;               // opsiyonel detay (sayı/örnek kayıt)
  suggestedAction?: string;
  status?: 'new' | 'reviewing' | 'applied' | 'dismissed';
}

async function read(): Promise<AgentSuggestion[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(list: AgentSuggestion[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
}

export const suggestionStore = {
  list: read,
  async add(s: Omit<AgentSuggestion, 'id' | 'createdAt' | 'status'>): Promise<AgentSuggestion> {
    const item: AgentSuggestion = {
      ...s,
      id: 'sg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    const list = await read();
    list.unshift(item);
    await write(list);
    return item;
  },
  async update(id: string, patch: Partial<AgentSuggestion>): Promise<boolean> {
    const list = await read();
    const idx = list.findIndex(s => s.id === id);
    if (idx < 0) return false;
    list[idx] = { ...list[idx], ...patch };
    await write(list);
    return true;
  },
  async remove(id: string): Promise<void> {
    const list = await read();
    await write(list.filter(s => s.id !== id));
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
