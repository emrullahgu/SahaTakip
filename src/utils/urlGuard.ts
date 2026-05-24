// urlGuard.ts — POZ-DEV-336 URL şema beyaz listesi (Linking.openURL koruması)
import { Linking, Alert } from 'react-native';

const ALLOWED_SCHEMES = new Set([
  'https:',
  'http:', // gerekirse kaldırılabilir
  'mailto:',
  'tel:',
  'sms:',
  'sahatakip:', // deep link
]);

const BLOCKED_HOSTS = new Set<string>([
  // Bilinen kötü host'lar burada listelenir.
]);

export interface OpenUrlResult {
  ok: boolean;
  reason?: string;
}

/**
 * Güvenli `Linking.openURL` sarmalayıcısı.
 * - Yalnız beyaz listedeki şemalara izin verir.
 * - `javascript:` / `data:` / bilinmeyen şemaları bloklar.
 */
export async function openUrlSafe(rawUrl: string, opts?: { silent?: boolean }): Promise<OpenUrlResult> {
  const url = String(rawUrl ?? '').trim();
  if (!url) return { ok: false, reason: 'empty' };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    if (!opts?.silent) Alert.alert('Geçersiz URL', url.slice(0, 80));
    return { ok: false, reason: 'invalid-url' };
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    if (!opts?.silent) Alert.alert('Engellendi', `İzin verilmeyen şema: ${parsed.protocol}`);
    return { ok: false, reason: 'scheme-not-allowed' };
  }

  if (parsed.host && BLOCKED_HOSTS.has(parsed.host)) {
    if (!opts?.silent) Alert.alert('Engellendi', `Yasaklı host: ${parsed.host}`);
    return { ok: false, reason: 'blocked-host' };
  }

  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      if (!opts?.silent) Alert.alert('Açılamadı', url);
      return { ok: false, reason: 'cannot-open' };
    }
    await Linking.openURL(url);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!opts?.silent) Alert.alert('Hata', msg);
    return { ok: false, reason: msg };
  }
}

export function isAllowedScheme(url: string): boolean {
  try {
    return ALLOWED_SCHEMES.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
