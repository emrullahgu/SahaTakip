// themeMode.ts — POZ-DEV-328..330 Light/Dark token + useTheme hook
// Mevcut `theme.ts` koyu tema varsayılan; bu modül light counterpart + toggle sağlar.
import { useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { brand } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';

const DARK_PALETTE = {
  bg: { primary: '#020617', secondary: '#0f172a', card: '#1e293b' },
  border: { primary: '#1e293b', secondary: '#334155' },
  text: { primary: '#f1f5f9', secondary: '#cbd5e1', muted: '#94a3b8', faint: '#64748b' },
};

const LIGHT_PALETTE = {
  bg: { primary: '#ffffff', secondary: '#f8fafc', card: '#ffffff' },
  border: { primary: '#e2e8f0', secondary: '#cbd5e1' },
  text: { primary: '#0f172a', secondary: '#334155', muted: '#64748b', faint: '#94a3b8' },
};

export function getPalette(mode: 'light' | 'dark') {
  return mode === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
}

let storedMode: ThemeMode = 'dark';

export function getThemeMode(): ThemeMode {
  return storedMode;
}

export function setThemeMode(m: ThemeMode): void {
  storedMode = m;
}

export function useTheme() {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(storedMode);

  const effective: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return system === 'light' ? 'light' : 'dark';
    return mode;
  }, [mode, system]);

  const palette = useMemo(() => getPalette(effective), [effective]);

  const updateMode = useCallback((m: ThemeMode) => {
    setStoredMode(m);
    setMode(m);
  }, []);

  return { mode, effective, palette, brand, setMode: updateMode };
}

function setStoredMode(m: ThemeMode) {
  storedMode = m;
}
