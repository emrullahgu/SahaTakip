// appUpdate.ts — APK OTA güncelleme kontrolü
// Uzaktaki bir manifest JSON dosyasını kontrol eder, yeni sürüm varsa
// kullanıcı tarayıcısı üzerinden APK indirip kurulumunu başlatır.
//
// Manifest formatı:
//   {
//     "version": "1.0.1",
//     "apkUrl": "https://.../sahatakip-1.0.1.apk",
//     "notes": "Sürüm notları",
//     "mandatory": false
//   }
import { Linking, Platform } from 'react-native';
import { openUrlSafe } from '../utils/urlGuard';
import AsyncStorage from '@react-native-async-storage/async-storage';
// app.json sürüm bilgisi için
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('../../app.json');

export type UpdateManifest = {
  version: string;
  apkUrl: string;
  notes?: string;
  mandatory?: boolean;
};

export type UpdateCheckResult =
  | { status: 'up-to-date'; current: string; latest: string }
  | { status: 'available'; current: string; latest: string; manifest: UpdateManifest }
  | { status: 'error'; message: string };

const MANIFEST_URL_KEY = 'sahatakip.updateManifestUrl';
const LAST_CHECK_KEY = 'sahatakip.updateLastCheck';
// Varsayılan: GitHub Releases API — her "latest" release otomatik okunur.
// .apk asset yüklenen ilk release "latest" olarak görülür.
export const DEFAULT_MANIFEST_URL = 'https://api.github.com/repos/emrullahgu/SahaTakip/releases/latest';

export function getCurrentVersion(): string {
  try {
    return appJson?.expo?.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function getManifestUrl(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(MANIFEST_URL_KEY);
    return v && v.trim() ? v.trim() : DEFAULT_MANIFEST_URL;
  } catch {
    return DEFAULT_MANIFEST_URL;
  }
}

export async function setManifestUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(MANIFEST_URL_KEY, url.trim());
}

export async function getLastCheck(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_CHECK_KEY);
  } catch {
    return null;
  }
}

/** Semver-benzeri karşılaştırma: 'a' > 'b' ise pozitif, eşitse 0, küçükse negatif. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-+]/).map(s => parseInt(s, 10) || 0);
  const pb = b.split(/[.\-+]/).map(s => parseInt(s, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function isValidManifest(m: unknown): m is UpdateManifest {
  if (!m || typeof m !== 'object') return false;
  const o = m as Record<string, unknown>;
  if (typeof o.version !== 'string' || !o.version.trim()) return false;
  if (typeof o.apkUrl !== 'string' || !/^https?:\/\//i.test(o.apkUrl)) return false;
  return true;
}

/** GitHub Releases API yanıtını UpdateManifest formatına çevirir. */
function parseGithubRelease(json: any): UpdateManifest | null {
  if (!json || typeof json !== 'object') return null;
  const tag = String(json.tag_name || json.name || '').trim();
  if (!tag) return null;
  const version = tag.replace(/^v/i, '');
  const assets: any[] = Array.isArray(json.assets) ? json.assets : [];
  const apkAsset = assets.find(a => typeof a?.browser_download_url === 'string' && /\.apk(\?|$)/i.test(a.browser_download_url));
  if (!apkAsset) return null;
  return {
    version,
    apkUrl: apkAsset.browser_download_url,
    notes: typeof json.body === 'string' ? json.body : undefined,
    mandatory: false,
  };
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const url = await getManifestUrl();
  const current = getCurrentVersion();
  if (!url) {
    return { status: 'error', message: 'Güncelleme sunucu adresi tanımlı değil. Ayarlardan girin.' };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (res.status === 404) {
      // Henüz yayınlanmış bir release yok → mevcut sürüm en güncel kabul edilir.
      try { await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString()); } catch { /* sessiz */ }
      return { status: 'up-to-date', current, latest: current };
    }
    if (!res.ok) {
      return { status: 'error', message: `Sunucu hatası: HTTP ${res.status}` };
    }
    const json = (await res.json()) as any;
    // GitHub Releases API → manifest çevrimi; aksi halde direkt manifest dolandırılır.
    let manifest: UpdateManifest | null = null;
    if (json && (json.tag_name || Array.isArray(json.assets))) {
      manifest = parseGithubRelease(json);
      if (!manifest) {
        return { status: 'error', message: 'GitHub release’ında .apk asset bulunamadı.' };
      }
    } else if (isValidManifest(json)) {
      manifest = json;
    } else {
      return { status: 'error', message: 'Manifest formatı geçersiz (version + apkUrl gerekli).' };
    }
    try {
      await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    } catch {
      /* sessiz */
    }
    const latest = manifest.version.trim();
    if (compareVersions(latest, current) > 0) {
      return { status: 'available', current, latest, manifest };
    }
    return { status: 'up-to-date', current, latest };
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Bağlantı zaman aşımı.' : (e?.message || 'Bilinmeyen hata');
    return { status: 'error', message: msg };
  }
}

/**
 * APK URL'ini cihazın tarayıcısında açar. Android indirme tamamlandığında
 * bildirimden dokunarak "Bilinmeyen kaynaklardan yüklemeye izin ver" akışı
 * üzerinden kurulum başlatılır.
 */
export async function startApkInstall(apkUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.open) {
      window.open(apkUrl, '_blank');
      return;
    }
  }
  const can = await Linking.canOpenURL(apkUrl).catch(() => true);
  if (can === false) {
    throw new Error('Bu cihazda indirme bağlantısı açılamadı.');
  }
  await openUrlSafe(apkUrl);
}
