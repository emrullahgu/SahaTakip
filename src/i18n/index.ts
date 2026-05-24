// i18n/index.ts — POZ-DEV-325..327 Minimum bağımlılıksız i18n
import { useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import tr from './tr.json';
import en from './en.json';

export type Locale = 'tr' | 'en';
type Bundle = typeof tr;

const BUNDLES: Record<Locale, Bundle> = { tr, en };

let currentLocale: Locale = detectLocale();

function detectLocale(): Locale {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const lang = navigator.language?.toLowerCase() ?? '';
      return lang.startsWith('en') ? 'en' : 'tr';
    }
    const settings: any =
      NativeModules?.SettingsManager?.settings?.AppleLocale ||
      NativeModules?.SettingsManager?.settings?.AppleLanguages?.[0] ||
      NativeModules?.I18nManager?.localeIdentifier;
    if (typeof settings === 'string' && settings.toLowerCase().startsWith('en')) return 'en';
  } catch {
    // sessiz
  }
  return 'tr';
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(loc: Locale): void {
  currentLocale = loc;
}

/**
 * Nested key resolver: `t('common.save')` → "Kaydet"
 */
export function t(key: string, locale?: Locale): string {
  const loc = locale ?? currentLocale;
  const parts = key.split('.');
  let node: any = BUNDLES[loc];
  for (const p of parts) {
    if (node == null) break;
    node = node[p];
  }
  return typeof node === 'string' ? node : key;
}

export function useT() {
  const locale = currentLocale;
  return useMemo(
    () => ({
      t: (key: string) => t(key, locale),
      locale,
    }),
    [locale],
  );
}

/**
 * Para formatı — TR varsayılan, lokale bağlı.
 */
export function formatCurrency(value: number, currency: 'TRY' | 'USD' | 'EUR' = 'TRY'): string {
  try {
    return new Intl.NumberFormat(currentLocale === 'en' ? 'en-US' : 'tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatDate(date: Date | string | number, mode: 'short' | 'long' = 'short'): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(currentLocale === 'en' ? 'en-US' : 'tr-TR', {
      dateStyle: mode,
    }).format(d);
  } catch {
    return String(date);
  }
}
