// One-shot: ürünler.json -> src/data/realProducts.ts (with brand & category)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'ürünler.json');
const OUT = path.join(ROOT, 'src', 'data', 'realProducts.ts');

// ─── FX rates ────────────────────────────────────────────────────────────────
// Live fetch from TCMB (Türkiye Cumhuriyet Merkez Bankası) günlük kur bülteni.
// Fallback: env vars FX_USD / FX_EUR, then safe defaults.
async function loadFx() {
  const fallback = {
    TL: 1, TRY: 1,
    USD: Number(process.env.FX_USD) || 45.64,
    EUR: Number(process.env.FX_EUR) || 53.00,
    _src: 'fallback',
    _date: new Date().toISOString().slice(0, 10),
  };
  try {
    const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const dateMatch = xml.match(/Tarih="([^"]+)"/);
    const grab = (code) => {
      const re = new RegExp(`<Currency[^>]*CurrencyCode="${code}"[\\s\\S]*?<ForexSelling>([0-9.]+)</ForexSelling>`);
      const m = xml.match(re);
      return m ? Number(m[1]) : null;
    };
    const usd = grab('USD');
    const eur = grab('EUR');
    if (usd && eur) {
      return { TL: 1, TRY: 1, USD: usd, EUR: eur, _src: 'TCMB', _date: dateMatch?.[1] || '?' };
    }
  } catch (e) {
    console.warn('[FX] TCMB fetch failed, using fallback:', e?.message || e);
  }
  return fallback;
}

const FX = await loadFx();
// Yabancı para birimi başına eklenen güvenlik marjı (TL). Env: FX_MARGIN_TL=1.5
const FX_MARGIN_TL = Number(process.env.FX_MARGIN_TL) || 1.5;
console.log(`[FX] ${FX._src} (${FX._date}) → USD=${FX.USD}, EUR=${FX.EUR} (+${FX_MARGIN_TL} TL marj)`);

const CATEGORY_RULES = [
  { cat: 'Trafo', re: /\b(trafo|transform)/i },
  { cat: 'Direk & Travers & Konsol', re: /\b(demir direk|beton direk|travers|konsol|kafes direk|kafa direği|putrel|lente|gergi|kuşgöz|kg\s?\d|tandor|askı kanca|hat ay)/i },
  { cat: 'İzolatör', re: /(izol[aâ]t[öo]r|porselen|silikon zincir|asıcı klemens)/i },
  { cat: 'Topraklama & Paratoner', re: /(toprakla|paratoner|toprak çubu|toprak elektro|göğüsleme|earth)/i },
  { cat: 'EV Şarj İstasyonu', re: /(ev charger|chargebox|şarj istas|charger)/i },
  { cat: 'OG / AG Hücre & Kesici', re: /\b(o\.?g\.?|orta gerilim|y[üu]k ay[ıi]r|kesici|disjonkt|hücre|rmu|sf6|ayır[ıi]c[ıi])/i },
  { cat: 'Sigorta & Otomatik Şalter', re: /(sigorta|otomat|mcb|mccb|acb|kompakt|nh sig|kaçak akım|kA\b.*(?:A\s?$| A )|B-eğri|C-eğri|D-eğri|amperaj)/i },
  { cat: 'Kontaktör & Termik & Röle', re: /(kontakt[öo]r|termik|röle|aşırı yük|rele)/i },
  { cat: 'Kompanzasyon (Reaktör/Kondansatör)', re: /(kompanzasyon|reakt[öo]r|kondansat[öo]r|capacitor|reaktif)/i },
  { cat: 'Sürücü / İnvertör / Soft Starter', re: /(s[üu]r[üu]c[üu]|invert[öo]r|inverter|soft start|vfd|frekans)/i },
  { cat: 'PLC / HMI / Otomasyon', re: /(plc|hmi|operat[öo]r panel|cpu modül|i\/o modül|servo|modicon)/i },
  { cat: 'Ölçü & Analizör & Sayaç', re: /(sayaç|sayac|multimetre|ampermetre|voltmetre|wattmetre|analiz[öo]r|analyzer|akım trafosu|ölçü trafosu|gerilim trafosu|mpr-|epr-|cpr-|kwh metre|frekansmetre)/i },
  { cat: 'Aydınlatma & Armatür', re: /(led|armat[üu]r|projekt[öo]r|spot|ayd[ıi]nlatma|sokak lamb|cadde lamb|aplik|floresan|ampul)/i },
  { cat: 'Pano & Kabinet & Tablo', re: /(\bpano\b|kabinet|\bkabin\b|sac tablo|dağıtım kutu|enclosure|sıva üstü|sıva altı tablo)/i },
  { cat: 'Kablo Kanalı & Boru', re: /(kablo kanal|spiral boru|halogen|conduit|kablo tava|kablo merdiven|kanal kapak|uks |uky )/i },
  { cat: 'Kablo & Tel & Halat', re: /(\bkablo\b|nyy|nyaf|nhxmh|nhmh|nha|yvv|yvz|h07|h05|\btel\b|halat|iletken|\bbara\b|\bnya\b)/i },
  { cat: 'Bağlantı Elemanları', re: /(klemens|kelep[çc]e|klips|kanca|civata|\bvida\b|somun|\bpul\b|kroşe|konektör|terminal|\blug\b|pabuç|rakor)/i },
  { cat: 'UPS & Akü', re: /(\bups\b|aküm[üu]l|\bakü\b|battery|enerji depo|chargebox)/i },
  { cat: 'Yenilenebilir Enerji (GES/Rüzgar)', re: /(güneş panel|\bsolar\b|fotovoltaik|rüzgar|\bpv\b)/i },
  { cat: 'Buton & Sinyal & Kumanda', re: /(\bbuton\b|sinyal lamb|joystick|sel[ee]ktör|switch|kumanda|XB|harmony|sinyalizasyon)/i },
];

const BRAND_FALLBACK = {
  'TEDAŞ': 'Hat Ekipmanları (TEDAŞ)',
  'ABB': 'ABB Elektrifikasyon (Sigorta & Şalter)',
  'ENTES': 'ENTES Ölçü & Kompanzasyon',
  'Schneider Alçak Gerilim': 'Schneider Alçak Gerilim',
  'Schneider Endüstriyel Otomasyon': 'Schneider Otomasyon',
  'Özak Kablo & Mutlusan': 'Özak / Mutlusan',
  'Serer Kablo': 'Serer Kablo',
  'POFACO': 'POFACO',
};

function categorize(desc, brand) {
  const s = String(desc || '');
  for (const r of CATEGORY_RULES) if (r.re.test(s)) return r.cat;
  return BRAND_FALLBACK[brand] || 'Diğer';
}

function slugCode(brand, code) {
  return `prd-${String(brand).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${String(code).replace(/[^a-zA-Z0-9]+/g, '-')}`.slice(0, 80);
}

function escapeJsonStr(s) {
  return String(s);
}

let raw = fs.readFileSync(SRC, 'utf8').replace(/^\uFEFF/, '').trim();
if (!raw.startsWith('[')) raw = '[' + raw + ']';
const items = JSON.parse(raw);
console.log('Loaded', items.length, 'rows from ürünler.json');

const seenId = new Set();
const out = [];
for (const r of items) {
  const brand = String(r['Marka'] || '').trim() || 'Diğer';
  const code = String(r['Ürün Kodu'] || '').trim();
  const desc = String(r['Ürün Açıklaması'] || '').trim();
  const listPrice = Number(r['Liste Fiyatı'] || 0);
  const currency = String(r['Döviz'] || 'TL').toUpperCase();
  const discountRate = Number(r['İskonto Oranı %'] || 0);
  const discountedPrice = Number(r['İskontolu Fiyat'] || listPrice);
  if (!desc) continue;

  const fx = FX[currency] || 1;
  // Güvenlik marjı: USD/EUR gibi yabancı para birimlerine +1.5 TL ekle ki kur dalgalanmasında zarar yapmayalım.
  const isForeign = currency !== 'TL' && currency !== 'TRY';
  const fxWithMargin = isForeign ? fx + FX_MARGIN_TL : fx;
  const priceTL = Math.round(discountedPrice * fxWithMargin * 100) / 100;

  const baseId = slugCode(brand, code || desc.slice(0, 30));
  let id = baseId;
  let n = 2;
  while (seenId.has(id)) { id = `${baseId}-${n++}`; }
  seenId.add(id);

  const name = code ? `${code} — ${desc}` : desc;
  out.push({
    id,
    name,
    price: priceTL,
    brand,
    code,
    category: categorize(desc, brand),
    currency,
    listPrice: Math.round(listPrice * 100) / 100,
    discountRate,
  });
}

console.log('Output rows:', out.length);
const byCat = {};
for (const r of out) byCat[r.category] = (byCat[r.category] || 0) + 1;
console.log('Categories:');
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) console.log(' ', k, v);

const banner = `// AUTO-GENERATED by scripts/convert-products.mjs — do not edit by hand.
// Source: ürünler.json (${items.length} rows; ${out.length} valid)
// FX rates used to derive TL price — source: ${FX._src} (${FX._date}): USD=${FX.USD}, EUR=${FX.EUR} (yabancı para için +${FX_MARGIN_TL} TL güvenlik marjı)
import type { MaterialCatalogItem } from '../types';

export const REAL_PRODUCTS: MaterialCatalogItem[] = ${JSON.stringify(out)};
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, banner, 'utf8');
console.log('Wrote', OUT, `(${(banner.length / 1024).toFixed(1)} KB)`);
