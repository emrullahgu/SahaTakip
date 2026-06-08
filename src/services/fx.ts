// fx.ts — Runtime döviz kuru servisi (TCMB günlük kuru).
// Ürün kataloğundaki yabancı para (EUR/USD) fiyatları build zamanında bir kez
// TL'ye çevriliyordu (scripts/convert-products.mjs); o kur bayatlıyordu. Bu servis
// uygulama çalışırken TCMB'nin günlük kur bültenini çekip gün içi cache'ler ve
// fiyatı CANLI kurla hesaplamayı sağlar. Çevrimdışı/CORS durumunda güvenli
// varsayılana (build kuru) düşer.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FxRates {
  USD: number;
  EUR: number;
  date: string;                          // TCMB bülten tarihi (gg.aa.yyyy) ya da ISO
  source: 'TCMB' | 'cache' | 'fallback';
}

// realProducts.ts build kuruyla uyumlu güvenli varsayılan (TCMB 22.05.2026).
export const FX_FALLBACK: FxRates = { USD: 45.6353, EUR: 52.9552, date: '22.05.2026', source: 'fallback' };
// Yabancı para güvenlik marjı (convert-products.mjs ile aynı): kur dalgalanmasına
// karşı birim başına eklenir.
export const FX_MARGIN_TRY = 1.5;

const CACHE_KEY = '@SahaTakip:fx_rates_v1';
const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

interface CachedFx { rates: FxRates; day: string }

/** TCMB today.xml içeriğinden USD/EUR ForexSelling oranlarını ayrıştırır. Saf fonksiyon → test edilebilir. */
export function parseTcmbXml(xml: string): { USD?: number; EUR?: number; date?: string } {
  const out: { USD?: number; EUR?: number; date?: string } = {};
  const dateM = xml.match(/Tarih="([^"]+)"/);
  if (dateM) out.date = dateM[1];
  const grab = (code: string): number | undefined => {
    const re = new RegExp(`<Currency[^>]*CurrencyCode="${code}"[\\s\\S]*?<ForexSelling>\\s*([0-9.,]+)\\s*</ForexSelling>`);
    const m = xml.match(re);
    if (!m) return undefined;
    const n = Number(m[1].replace(',', '.'));
    return isFinite(n) && n > 0 ? n : undefined;
  };
  const usd = grab('USD'); if (usd) out.USD = usd;
  const eur = grab('EUR'); if (eur) out.EUR = eur;
  return out;
}

/** Bir tutarı kaynak para biriminden TL'ye çevirir (yabancı parada güvenlik marjı eklenir). Saf fonksiyon. */
export function convertToTry(
  amount: number,
  currency: string | undefined,
  rates: FxRates,
  opts: { margin?: number } = {},
): number {
  const cur = (currency || 'TL').toUpperCase();
  if (cur === 'TL' || cur === 'TRY') return amount;
  const rate = cur === 'USD' ? rates.USD : cur === 'EUR' ? rates.EUR : null;
  if (!rate || !(rate > 0)) return amount; // bilinmeyen döviz → olduğu gibi
  const margin = opts.margin ?? FX_MARGIN_TRY;
  return amount * (rate + margin);
}

/**
 * Bir katalog kaleminin CANLI birim TL fiyatını hesaplar.
 * - TL ürün: baked `price` (zaten iskontolu liste fiyatı) olduğu gibi.
 * - Yabancı para ürün: liste fiyatı (döviz) × (1 − tedarikçi iskontosu) × güncel kur.
 *   (Böylece build zamanındaki bayat kur değil, bugünün TCMB kuru kullanılır.)
 */
export function liveUnitPriceTry(
  mat: { price: number; currency?: string; listPrice?: number; discountRate?: number },
  rates: FxRates,
): number {
  const cur = (mat.currency || 'TL').toUpperCase();
  const isForeign = cur !== 'TL' && cur !== 'TRY';
  if (!isForeign) return mat.price;
  if (mat.listPrice == null || !(mat.listPrice > 0)) return mat.price; // orijinal döviz fiyatı yok → baked
  const netForeign = mat.listPrice * (1 - (mat.discountRate ?? 0) / 100);
  const tl = convertToTry(netForeign, cur, rates);
  return Math.round(tl * 100) / 100;
}

let _mem: FxRates | null = null;
let _memDay: string | null = null;

async function fetchTcmb(timeoutMs = 8000): Promise<FxRates | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(TCMB_URL, { signal: ctrl.signal });
    if (!res.ok) return null;
    const xml = await res.text();
    const p = parseTcmbXml(xml);
    if (p.USD && p.EUR) {
      return { USD: p.USD, EUR: p.EUR, date: p.date || new Date().toISOString().slice(0, 10), source: 'TCMB' };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Günlük TCMB kurunu getirir. Sıra: bellek → bugünün cache'i → canlı TCMB →
 * bayat cache → fallback. Gün içinde tek ağ isteği yapılır (cache).
 */
export async function getFxRates(force = false): Promise<FxRates> {
  const today = new Date().toISOString().slice(0, 10);
  if (!force && _mem && _memDay === today) return _mem;

  // 1) Bugünün cache'i
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as CachedFx;
        if (c.day === today && c.rates?.USD > 0 && c.rates?.EUR > 0) {
          _mem = { ...c.rates, source: 'cache' }; _memDay = today;
          return _mem;
        }
      }
    } catch { /* ignore */ }
  }

  // 2) Canlı TCMB
  const live = await fetchTcmb();
  if (live) {
    _mem = live; _memDay = today;
    try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ rates: live, day: today } as CachedFx)); } catch { /* ignore */ }
    return live;
  }

  // 3) Bayat cache (herhangi bir gün) — fallback'ten iyidir
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const c = JSON.parse(raw) as CachedFx;
      if (c.rates?.USD > 0 && c.rates?.EUR > 0) {
        _mem = { ...c.rates, source: 'cache' }; _memDay = today;
        return _mem;
      }
    }
  } catch { /* ignore */ }

  // 4) Güvenli varsayılan
  _mem = FX_FALLBACK; _memDay = today;
  return FX_FALLBACK;
}

/** Bellek önbelleğini temizler (test/yenileme için). */
export function clearFxCache(): void { _mem = null; _memDay = null; }
