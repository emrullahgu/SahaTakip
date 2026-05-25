import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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

const isWeb = Platform.OS === 'web';

/**
 * Supabase env değişkenleri tanımlıysa true; aksi halde uygulama "demo / offline" modda
 * çalışır ve tüm auth/CRUD çağrıları kısa devre yapılır.
 */
export const SUPABASE_CONFIGURED: boolean = !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    // Native'de AsyncStorage; web'de tarayıcının localStorage'ı default kullanılır.
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web'de e-posta linkinden dönen hash fragment'tan session'ı yakala.
    // Native'de URL parsing kullanılmaz (deep link AuthContext'te ele alınır).
    detectSessionInUrl: isWeb,
    flowType: 'pkce',
  },
});

/**
 * E-posta onay / şifre sıfırlama linklerinin yönleneceği URL.
 *
 * Öncelik sırası:
 *   1) `EXPO_PUBLIC_SITE_URL` env (production canonical URL) — her zaman tercih.
 *   2) Web + non-localhost `window.location.origin`.
 *   3) Native deep link: `sahatakip://auth-callback`.
 *
 * NEDEN: Geliştirme/preview için localhost veya geçici Netlify deploy URL'sinden
 * signup yapıldığında, kullanıcıya gönderilen e-postadaki onay linki
 * `http://localhost:xxxx/auth-callback` olarak gidiyor ve alıcı bu linki
 * kendi cihazında açamıyor. Production URL env üzerinden zorlanarak
 * gerçek dağıtım adresine yönlendirme garantilenir.
 *
 * NOT: Bu URL'in Supabase Dashboard → Authentication → URL Configuration →
 * Redirect URLs listesinde TANIMLI olması zorunludur. Aksi halde Supabase
 * varsayılan Site URL'e düşer.
 */
export function getAuthRedirectUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_SITE_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, '')}/auth-callback`;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // Localhost / 127.0.0.1 / LAN IP'ten gelen e-posta linkleri alıcının
    // tarayıcısında çalışmaz. Bu durumda native scheme'a düşmek de yanlış
    // olur; bilinçli bir uyarı bırakıp yine origin döndürüyoruz ki
    // geliştirici aynı makinede testi tamamlayabilsin.
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(origin);
    if (isLocal) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Supabase] Auth redirect URL ${origin}/auth-callback localhost'tur. ` +
        `Üretim için netlify.toml içine EXPO_PUBLIC_SITE_URL ekleyin (örn. https://<site>.netlify.app).`
      );
    }
    return `${origin}/auth-callback`;
  }

  return 'sahatakip://auth-callback';
}

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
    options: {
      data: { full_name: fullName },
      emailRedirectTo: getAuthRedirectUrl(),
    },
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
