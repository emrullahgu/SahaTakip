// themeMode.ts — Light/Dark token + tema değiştirme
// `theme.ts` aktif modu modül yüklenirken senkron olarak belirler.
// Buradaki setThemeMode kaydeder ve uygulamayı yeniden yükler.
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useColorScheme, Platform, Alert, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { brand, __activeThemeMode, THEME_STORAGE_KEY } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';

const DARK_PALETTE = {
  bg: { primary: '#020617', secondary: '#0f172a', card: '#1e293b' },
  border: { primary: '#1e293b', secondary: '#334155' },
  text: { primary: '#f1f5f9', secondary: '#cbd5e1', muted: '#94a3b8', faint: '#64748b' },
};

const LIGHT_PALETTE = {
  bg: { primary: '#ffffff', secondary: '#f1f5f9', card: '#ffffff' },
  border: { primary: '#e2e8f0', secondary: '#cbd5e1' },
  text: { primary: '#0f172a', secondary: '#334155', muted: '#475569', faint: '#94a3b8' },
};

export function getPalette(mode: 'light' | 'dark') {
  return mode === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
}

let storedMode: ThemeMode = __activeThemeMode;
let hydrated = false;

export function getThemeMode(): ThemeMode {
  return storedMode;
}

/**
 * AsyncStorage'tan kaydedilmiş modu yükler. Native'de aktiften farklıysa
 * tek seferlik bundle reload yapar (sonsuz döngüyü önlemek için bayrak).
 */
export async function hydrateThemeMode(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      storedMode = stored;
      // Not: Aktif tema artık index.js içinde AsyncStorage'tan senkron olarak
      // hidrate ediliyor. Burada reload TETİKLEMİYORUZ — boşuna çağrı olur.
    }
  } catch {
    /* sessiz */
  }
}

function tryReload(): boolean {
  // Web
  try {
    if (typeof window !== 'undefined' && (window as any).location?.reload) {
      (window as any).location.reload();
      return true;
    }
  } catch {
    /* sessiz */
  }
  // Native production — expo-updates her ortamda (dev/prod) çalışır
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Updates = require('expo-updates');
    if (Updates?.reloadAsync) {
      // Fire-and-forget; başarısız olursa DevSettings fallback'i denenir
      Updates.reloadAsync().catch(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const RN = require('react-native');
          RN?.DevSettings?.reload?.();
        } catch {
          /* sessiz */
        }
      });
      return true;
    }
  } catch {
    /* expo-updates yoksa devam */
  }
  // Native dev (Metro) fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RN = require('react-native');
    if (RN?.DevSettings?.reload) {
      RN.DevSettings.reload();
      return true;
    }
  } catch {
    /* sessiz */
  }
  return false;
}

export async function setThemeMode(m: ThemeMode): Promise<void> {
  storedMode = m;
  const sys = Appearance?.getColorScheme?.();
  const effective: 'light' | 'dark' =
    m === 'system' ? (sys === 'dark' ? 'dark' : 'light') : m;
  try {
    (globalThis as any).__SAHATAKIP_THEME__ = effective;
  } catch {
    /* sessiz */
  }
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, m);
  } catch {
    /* sessiz */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, effective);
    }
  } catch {
    /* sessiz */
  }
  if (effective === __activeThemeMode) return;
  try {
    (globalThis as any).__SAHATAKIP_THEME_RELOAD_DONE__ = false;
  } catch {
    /* sessiz */
  }
  const ok = tryReload();
  if (!ok) {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Tema Değiştirildi',
        `Yeni tema (${effective === 'dark' ? 'Koyu' : 'Açık'}) için uygulama yeniden başlatılacak.`,
        [
          {
            text: 'Şimdi Yeniden Başlat',
            onPress: () => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { BackHandler } = require('react-native');
                BackHandler.exitApp();
              } catch {
                /* sessiz */
              }
            },
          },
          { text: 'Sonra', style: 'cancel' },
        ],
      );
    } else {
      Alert.alert(
        'Tema Değiştirildi',
        'Yeni temanın uygulanması için uygulamayı kapatıp yeniden açın.'
      );
    }
  }
}

export function useTheme() {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(storedMode);

  useEffect(() => {
    hydrateThemeMode().then(() => setMode(storedMode));
  }, []);

  const effective: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return system === 'light' ? 'light' : 'dark';
    return mode;
  }, [mode, system]);

  const palette = useMemo(() => getPalette(effective), [effective]);

  const updateMode = useCallback((m: ThemeMode) => {
    setMode(m);
    void setThemeMode(m);
  }, []);

  return { mode, effective, palette, brand, setMode: updateMode };
}
