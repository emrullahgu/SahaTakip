// todos.ts — Kişisel "Yapılacaklar" listesi (Microsoft To-Do tarzı).
// Cihazda AsyncStorage'da saklanır; kullanıcıya özel basit checklist.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sahatakip.todos.v1';

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  important: boolean;
  createdAt: string;
  dueDate?: string;   // YYYY-MM-DD
  note?: string;
}

function uid() {
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function listTodos(): Promise<TodoItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr: TodoItem[] = raw ? JSON.parse(raw) : [];
    // Önce tamamlanmamış + önemli üstte, sonra tarihe göre.
    return arr.sort((a, b) =>
      Number(a.done) - Number(b.done) ||
      Number(b.important) - Number(a.important) ||
      (b.createdAt > a.createdAt ? 1 : -1),
    );
  } catch { return []; }
}

async function saveAll(list: TodoItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function addTodo(title: string, opts?: { dueDate?: string; important?: boolean; note?: string }): Promise<TodoItem> {
  const list = await rawList();
  const t: TodoItem = {
    id: uid(), title: title.trim(), done: false,
    important: opts?.important ?? false,
    createdAt: new Date().toISOString(),
    dueDate: opts?.dueDate, note: opts?.note,
  };
  await saveAll([t, ...list]);
  return t;
}

export async function toggleTodo(id: string): Promise<void> {
  const list = await rawList();
  await saveAll(list.map(t => t.id === id ? { ...t, done: !t.done } : t));
}

export async function toggleImportant(id: string): Promise<void> {
  const list = await rawList();
  await saveAll(list.map(t => t.id === id ? { ...t, important: !t.important } : t));
}

export async function updateTodo(id: string, patch: Partial<Pick<TodoItem, 'title' | 'dueDate' | 'note' | 'important'>>): Promise<void> {
  const list = await rawList();
  await saveAll(list.map(t => t.id === id ? { ...t, ...patch } : t));
}

export async function deleteTodo(id: string): Promise<void> {
  const list = await rawList();
  await saveAll(list.filter(t => t.id !== id));
}

export async function clearCompleted(): Promise<void> {
  const list = await rawList();
  await saveAll(list.filter(t => !t.done));
}

/** Sıralamasız ham liste (yazma işlemleri için). */
async function rawList(): Promise<TodoItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
