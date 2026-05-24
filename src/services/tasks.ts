// POZ-DEV-232: Görev Takip servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskPriority, TaskStatus } from '../types';

const KEY = 'tasks_v1';

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  review: 'İncelemede',
  done: 'Tamamlandı',
  cancelled: 'İptal',
};
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '#64748b',
  in_progress: '#0ea5e9',
  review: '#a855f7',
  done: '#22c55e',
  cancelled: '#ef4444',
};
export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
};
export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: '#64748b',
  normal: '#0ea5e9',
  high: '#f59e0b',
  urgent: '#ef4444',
};
export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'cancelled'];

export async function listTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const all = raw ? (JSON.parse(raw) as Task[]) : [];
  return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
export async function getTask(id: string): Promise<Task | undefined> {
  return (await listTasks()).find(t => t.id === id);
}
export async function saveTask(t: Omit<Task, 'id' | 'createdAt'> & { id?: string }): Promise<Task> {
  const all = await listTasks();
  if (t.id) {
    const idx = all.findIndex(x => x.id === t.id);
    if (idx >= 0) {
      const wasCompleted = all[idx].status === 'done';
      const nowCompleted = t.status === 'done';
      all[idx] = {
        ...all[idx],
        ...t,
        id: t.id,
        updatedAt: new Date().toISOString(),
        completedAt: nowCompleted && !wasCompleted ? new Date().toISOString() : all[idx].completedAt,
      } as Task;
      await AsyncStorage.setItem(KEY, JSON.stringify(all));
      return all[idx];
    }
  }
  const created: Task = {
    ...t,
    id: `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    completedAt: t.status === 'done' ? new Date().toISOString() : undefined,
  };
  all.unshift(created);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return created;
}
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const all = await listTasks();
  const idx = all.findIndex(x => x.id === id);
  if (idx < 0) return;
  all[idx].status = status;
  all[idx].updatedAt = new Date().toISOString();
  if (status === 'done' && !all[idx].completedAt) all[idx].completedAt = new Date().toISOString();
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}
export async function deleteTask(id: string): Promise<void> {
  const all = await listTasks();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(x => x.id !== id)));
}
export function tasksOverdue(tasks: Task[]): Task[] {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done' && t.status !== 'cancelled');
}
