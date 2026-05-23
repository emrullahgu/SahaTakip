import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// .env değişkenleri Expo tarafından EXPO_PUBLIC_ prefix ile yüklenir
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] .env dosyasında EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı değil. Çevrimdışı mod kullanılacak.'
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// =============================================================
// AUTH HELPERS
// =============================================================
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// =============================================================
// CRUD HELPERS (yapı hazırlık — UI tarafı entegre etmiyor henüz)
// =============================================================
export const db = {
  quotes: {
    list: () => supabase.from('quotes').select('*, quote_lines(*)').order('created_at', { ascending: false }),
    insert: (row: any) => supabase.from('quotes').insert(row).select().single(),
    update: (id: string, patch: any) => supabase.from('quotes').update(patch).eq('id', id),
    delete: (id: string) => supabase.from('quotes').delete().eq('id', id),
  },
  customers: {
    list: () => supabase.from('customers').select('*').order('short_name'),
    insert: (row: any) => supabase.from('customers').insert(row).select().single(),
    update: (id: string, patch: any) => supabase.from('customers').update(patch).eq('id', id),
  },
  workOrders: {
    list: () => supabase.from('work_orders').select('*, work_order_materials(*)').order('created_at', { ascending: false }),
    insert: (row: any) => supabase.from('work_orders').insert(row).select().single(),
    update: (id: string, patch: any) => supabase.from('work_orders').update(patch).eq('id', id),
  },
  employees: {
    list: () => supabase.from('employees').select('*'),
  },
};
