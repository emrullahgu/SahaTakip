// SahaTakip — Logo renkleri: Navy Blue (#1e40af) + Vibrant Green (#22c55e)
// Slogan: SAHADA · TAKİPTE · KONTROLDE
export const brand = {
  blue: '#1e40af',
  blueLight: '#3b82f6',
  blueDark: '#1e3a8a',
  green: '#22c55e',
  greenLight: '#4ade80',
  greenDark: '#16a34a',
};

// ─────────────────────────────────────────────────────────────
// Tema modu: ekranlar StyleSheet.create ile module-scope'ta
// renkleri donduruyor. Bu yüzden mod, modül yüklenmeden ÖNCE
// senkron olarak tespit edilmeli (web: localStorage, native:
// global stamp). Mod değişimi themeMode.setThemeMode() içinden
// yeniden yüklemeyle uygulanır.
// ─────────────────────────────────────────────────────────────
export const THEME_STORAGE_KEY = 'sahatakip.themeMode';

function readInitialMode(): 'light' | 'dark' {
  try {
    const g: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
    if (g && (g.__SAHATAKIP_THEME__ === 'light' || g.__SAHATAKIP_THEME__ === 'dark')) {
      return g.__SAHATAKIP_THEME__;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(THEME_STORAGE_KEY);
      if (v === 'light' || v === 'dark') return v;
    }
  } catch {
    /* sessiz */
  }
  // Varsayılan: açık renk tema (kullanıcı sonradan seçtiyse o tercih kaydedilip yüklenir)
  return 'light';
}

export const __activeThemeMode: 'light' | 'dark' = readInitialMode();

try {
  (globalThis as any).__SAHATAKIP_THEME__ = __activeThemeMode;
} catch {
  /* sessiz */
}

const DARK_TOKENS = {
  bg: { primary: '#020617', secondary: '#0f172a', card: '#1e293b' },
  border: { primary: '#1e293b', secondary: '#334155' },
  text: { primary: '#f1f5f9', secondary: '#cbd5e1', muted: '#94a3b8', faint: '#64748b' },
};

const LIGHT_TOKENS = {
  bg: { primary: '#ffffff', secondary: '#f1f5f9', card: '#ffffff' },
  border: { primary: '#e2e8f0', secondary: '#cbd5e1' },
  text: { primary: '#0f172a', secondary: '#334155', muted: '#475569', faint: '#94a3b8' },
};

const __TOKENS = __activeThemeMode === 'light' ? LIGHT_TOKENS : DARK_TOKENS;

export const colors = {
  bg: { ...__TOKENS.bg, tertiary: __TOKENS.bg.secondary },
  border: { ...__TOKENS.border, default: __TOKENS.border.primary },
  text: __TOKENS.text,
  // PRIMARY (yeşil) — logo yeşili
  emerald: {
    default: brand.green,
    light: brand.greenLight,
    dark: brand.greenDark,
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.30)',
  },
  // SECONDARY (lacivert) — logo mavisi
  indigo: {
    default: brand.blue,
    dark: brand.blueDark,
    light: brand.blueLight,
    bg: 'rgba(30, 64, 175, 0.15)',
    border: 'rgba(30, 64, 175, 0.35)',
  },
  blue: {
    default: brand.blueLight,
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.30)',
  },
  amber: {
    default: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.30)',
  },
  rose: {
    default: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.30)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  // Semantic style objects (spread into StyleSheet entries)
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  title: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};
