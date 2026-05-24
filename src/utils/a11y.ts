// a11y.ts — POZ-DEV-313..316 Erişilebilirlik yardımcıları
// Standart `accessibilityProps` üreticileri + min dokunma alanı.
import type { AccessibilityRole, AccessibilityProps } from 'react-native';

export const MIN_TOUCH_SIZE = 44; // WCAG 2.1 önerisi

export function a11yButton(label: string, hint?: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

export function a11yLink(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
  };
}

export function a11yInput(label: string, value?: string, error?: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityValue: value ? { text: value } : undefined,
    accessibilityHint: error,
    accessibilityState: error ? { selected: false } : undefined,
  };
}

export function a11yHeader(text: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'header',
    accessibilityLabel: text,
  };
}

export function a11yRole(role: AccessibilityRole, label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: role,
    accessibilityLabel: label,
  };
}

/**
 * `hitSlop` — küçük ikon butonlarda dokunma alanı genişletici.
 */
export const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };
export const HIT_SLOP_12 = { top: 12, bottom: 12, left: 12, right: 12 };
