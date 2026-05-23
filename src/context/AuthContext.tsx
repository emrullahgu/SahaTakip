import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export type UserRole = 'admin' | 'manager' | 'engineer' | 'field';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
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
  // Demo mode bypass — Supabase olmadan da uygulamayı kullanabilmek için
  enterDemoMode: () => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SUPABASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_URL !== 'https://YOUR-PROJECT.supabase.co' &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
  }, [user]);

  const signIn = async (email: string, password: string) => {
    if (!SUPABASE_CONFIGURED) {
      return { error: 'Supabase yapılandırılmamış. Demo modda devam edin.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!SUPABASE_CONFIGURED) {
      return { error: 'Supabase yapılandırılmamış. Demo modda devam edin.' };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
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
        enterDemoMode,
        isDemoMode,
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
