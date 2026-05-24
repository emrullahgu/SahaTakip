// users service — POZ-DEV-098 AppUser CRUD via AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRole, AppUser } from '../types';

const KEY = '@SahaTakip:app_users';

export const ROLE_LABEL_TR: Record<AppRole, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  engineer: 'Mühendis',
  technician: 'Tekniker',
  sales: 'Satış',
  viewer: 'Görüntüleyici',
};

export const ROLE_COLOR: Record<AppRole, string> = {
  admin: '#dc2626',
  manager: '#8b5cf6',
  engineer: '#0ea5e9',
  technician: '#16a34a',
  sales: '#f59e0b',
  viewer: '#64748b',
};

export const ROLE_ORDER: AppRole[] = ['admin', 'manager', 'engineer', 'technician', 'sales', 'viewer'];

function seed(): AppUser[] {
  const now = new Date().toISOString();
  return [
    { id: 'u-seed-1', name: 'Sistem Yöneticisi', email: 'admin@sahatakip.local', role: 'admin', active: true, createdAt: now },
    { id: 'u-seed-2', name: 'Operasyon Müdürü', email: 'mudur@sahatakip.local', role: 'manager', active: true, createdAt: now },
    { id: 'u-seed-3', name: 'Saha Mühendisi', email: 'muhendis@sahatakip.local', role: 'engineer', active: true, createdAt: now },
  ];
}

export async function listUsers(): Promise<AppUser[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      await AsyncStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as AppUser[];
  } catch {
    return [];
  }
}

export async function saveUsers(users: AppUser[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(users));
}

export async function upsertUser(u: AppUser): Promise<AppUser[]> {
  const list = await listUsers();
  const idx = list.findIndex(x => x.id === u.id);
  if (idx >= 0) list[idx] = u; else list.unshift(u);
  await saveUsers(list);
  return list;
}

export async function deleteUsers(ids: string[]): Promise<AppUser[]> {
  const list = await listUsers();
  const next = list.filter(x => !ids.includes(x.id));
  await saveUsers(next);
  return next;
}

export async function bulkUpdate(ids: string[], patch: Partial<AppUser>): Promise<AppUser[]> {
  const list = await listUsers();
  const next = list.map(u => ids.includes(u.id) ? { ...u, ...patch } : u);
  await saveUsers(next);
  return next;
}

export function makeUser(input: Omit<AppUser, 'id' | 'createdAt' | 'active'> & { active?: boolean }): AppUser {
  return {
    id: 'u-' + Math.random().toString(36).slice(2, 10),
    createdAt: new Date().toISOString(),
    active: input.active !== false,
    ...input,
  } as AppUser;
}
