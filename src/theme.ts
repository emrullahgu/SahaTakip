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

export const colors = {
  bg: {
    primary: '#020617',
    secondary: '#0f172a',
    card: '#1e293b',
  },
  border: {
    primary: '#1e293b',
    secondary: '#334155',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
    faint: '#64748b',
  },
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
};
