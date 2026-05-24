import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, getAuthRedirectUrl } from '../services/supabase';

// Env varsı burada lokal olarak kontrol et (cross-module ReferenceError’ı önlemek için).
const SUPABASE_CONFIGURED: boolean = !!(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export type UserRole = 'admin' | 'manager' | 'engineer' | 'field';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  approval_status?: ApprovalStatus;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOffline: boolean; // Supabase yapılandırılmamışsa true
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateProfile: (patch: Partial<Omit<UserProfile, 'id'>>) => Promise<{ error: string | null }>;
  // Demo mode bypass — Supabase olmadan da uygulamayı kullanabilmek için
  enterDemoMode: () => void;
  isDemoMode: boolean;
  hasPermission: (resource: string, action: 'R' | 'W') => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PERMISSIONS: Record<UserRole, Record<string, 'R' | 'W' | '-'>> = {
  admin: {
    customers: 'W',
    quotes: 'W',
    workOrders: 'W',
    employees: 'W',
    reports: 'W',
    finance: 'W',
    settings: 'W',
  },
  manager: {
    customers: 'W',
    quotes: 'W',
    workOrders: 'W',
    employees: 'W',
    reports: 'W',
    finance: 'R',
    settings: '-',
  },
  engineer: {
    customers: 'R',
    quotes: 'W',
    workOrders: 'W',
    employees: 'R',
    reports: 'R',
    finance: '-',
    settings: '-',
  },
  field: {
    customers: 'R',
    quotes: 'R',
    workOrders: 'W',
    employees: '-',
    reports: '-',
    finance: '-',
    settings: '-',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Initial session fetch
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Profile fetch
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });
    // Kullanıcı giriş yaptığında paylaşımlı AI ayarlarını arka planda senkronize et.
    import('../services/ai')
      .then(m => m.syncRemoteAiSettings?.())
      .catch(() => { /* ignore */ });
  }, [user]);

  const signIn = async (email: string, password: string) => {
    if (!SUPABASE_CONFIGURED) {
      return { error: 'Supabase yapılandırılmamış. Demo modda devam edin.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Onay durumu kontrolü artık AppNavigator tarafından profil yüklendikten sonra
    // PendingApprovalScreen ile yapılır (yarış koşulunu engellemek için).
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!SUPABASE_CONFIGURED) {
      return { error: 'Supabase yapılandırılmamış. Demo modda devam edin.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) return { error: error.message };
    // Supabase, e-posta onayı kapalıysa otomatik oturum oluşturur.
    // Yeni kullanıcı admin onayı bekleyeceği için bu oturumu hemen kapatıyoruz.
    if (data.session) {
      await supabase.auth.signOut();
    }
    return { error: null };
  };

  const signOut = async () => {
    if (SUPABASE_CONFIGURED) {
      await supabase.auth.signOut();
    }
    setIsDemoMode(false);
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const enterDemoMode = () => setIsDemoMode(true);

  const hasPermission = (resource: string, action: 'R' | 'W'): boolean => {
    // Demo mode = admin (her şeyi görür ve düzenler). Profil yoksa "field" (en kısıtlı).
    const role = profile?.role || (isDemoMode ? 'admin' : 'field');
    const perm = PERMISSIONS[role as UserRole]?.[resource];
    if (!perm || perm === '-') return false;
    if (action === 'W') return perm === 'W';
    return perm === 'R' || perm === 'W';
  };

  const resetPassword = async (email: string) => {
    if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl(),
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (newPassword: string) => {
    if (!SUPABASE_CONFIGURED) return { error: 'Supabase yapılandırılmamış.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (patch: Partial<Omit<UserProfile, 'id'>>) => {
    if (!user) return { error: 'Oturum yok' };
    if (!SUPABASE_CONFIGURED) {
      // Demo: yereldeki state'i güncelle
      setProfile(p => p ? { ...p, ...patch } : p);
      return { error: null };
    }
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (!error) setProfile(p => p ? { ...p, ...patch } as UserProfile : p);
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isOffline: !SUPABASE_CONFIGURED,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        enterDemoMode,
        isDemoMode,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
