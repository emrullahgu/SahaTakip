// ====================================================================
// RoleGuard — POZ-DEV-007
// Belirtilen rollere sahip olmayan kullanıcılardan içeriği gizler.
// ====================================================================

import React from 'react';
import { useAuth, UserRole } from '../context/AuthContext';

interface Props {
  allow: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function RoleGuard({ allow, fallback = null, children }: Props) {
  const { profile, isDemoMode } = useAuth();
  // Demo mode = admin (her şeyi görür)
  if (isDemoMode) return <>{children}</>;
  const role = profile?.role ?? 'engineer';
  if (allow.includes(role)) return <>{children}</>;
  return <>{fallback}</>;
}

export function useHasRole(allow: UserRole[]): boolean {
  const { profile, isDemoMode } = useAuth();
  if (isDemoMode) return true;
  return allow.includes(profile?.role ?? 'engineer');
}
