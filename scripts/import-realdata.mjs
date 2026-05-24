// scripts/import-realdata.mjs
// Reads `realdata/excel-to-json*.json` files and emits TS seed modules under src/data/.
// Run:  node scripts/import-realdata.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REAL = path.join(ROOT, 'realdata');
const OUT = path.join(ROOT, 'src', 'data');

const slug = (s, fallback = 'x') =>
  String(s || fallback)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || fallback;

const excelToISO = (serial) => {
  if (typeof serial !== 'number' || !Number.isFinite(serial)) return undefined;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
};

const readSheet = (file) => {
  const j = JSON.parse(fs.readFileSync(path.join(REAL, file), 'utf-8'));
  const key = Object.keys(j)[0];
  return j[key];
};

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v) => (v == null ? '' : String(v).trim());

// =============================================================
// 1) EMPLOYEES
// =============================================================
const empRaw = readSheet('excel-to-json.json');
const employees = empRaw
  .filter((r) => str(r['Çalışanın adı soyadı']))
  .map((r, i) => {
    const name = str(r['Çalışanın adı soyadı']);
    const role = str(r['Kategori']) || 'Personel';
    const wage = num(r['TL Bakiye']); // gerçek balance; aylık ücret meta'sı yok
    return {
      id: `emp-${String(i + 1).padStart(3, '0')}-${slug(name)}`,
      name,
      role: role.replace(/\s+/g, ' '),
      tcNo: str(r['TC Kimlik Numarası']),
      email: str(r['E-posta adresi']),
      monthlyWage: 0,
      dailyRate: 0,
      balanceTL: wage,
      balanceUSD: num(r['USD Bakiye']),
      balanceEUR: num(r['EUR Bakiye']),
      balanceGBP: num(r['GBP Bakiye']),
      attendance: { Pzt: 'Geldi', Sal: 'Geldi', Çar: 'Geldi', Per: 'Geldi', Cum: 'Geldi', Cmt: 'Gelmedi', Paz: 'Gelmedi' },
      daysWorked: 5,
    };
  });

// =============================================================
// 2) CUSTOMERS / SUPPLIERS
// =============================================================
const cusRaw = readSheet('excel-to-json (5).json');
const customers = cusRaw
  .filter((r) => str(r['Müşteri/tedarikçi ismi']))
  .map((r, i) => {
    const title = str(r['Müşteri/tedarikçi ismi']);
    const balance = num(r['TL Bakiye']);
    return {
      id: `cust-${String(i + 1).padStart(4, '0')}-${slug(title)}`,
      shortName: title.split(/\s+/).slice(0, 3).join(' '),
      title,
      taxNumber: str(r['Vergi numarası/TC kimlik no']) || undefined,
      taxOffice: str(r['Vergi dairesi']) || undefined,
      email: str(r['E-posta']) || undefined,
      address: str(r['Adres']) || undefined,
      city: str(r['İl']) || undefined,
      region: str(r['İlçe']) || undefined,
      type: balance < 0 ? 'Tedarikçi' : 'Aktif',
      currentBalance: balance,
    };
  });

// =============================================================
// 3) MATERIAL CATALOG (file 4 — Logo Hizmet ve Ürünler)
// =============================================================
const matRaw = readSheet('excel-to-json (4).json');
const materials = matRaw
  .filter((r) => str(r['Ürün/hizmet ismi']))
  .map((r, i) => {
    const name = str(r['Ürün/hizmet ismi']);
    const sale = num(r['Satış fiyatı']);
    const buy = num(r['Alış fiyatı']);
    const price = sale > 0 ? sale : buy;
    return {
      id: `mat-${String(i + 1).padStart(4, '0')}`,
      name,
      price,
      buyPrice: buy,
      vatRate: num(r['KDV oranı']) || 20,
      unit: str(r['Birim']) || 'Adet',
      stock: num(r['Stok Miktarı']),
      currency: str(r['Satış döviz']) || 'TRL',
    };
  })
  .filter((m) => m.name.length > 0);

// =============================================================
// 4) POZ CATALOG — files 1, 2, 3 birleşimi
// =============================================================
const inferCategory = (name, marka, birim) => {
  const t = (name || '').toLocaleLowerCase('tr-TR');
  if (/keşif|projelendirme|raporlama|mühendislik|topraklama ölç|test ölç/.test(t)) return 'Mühendislik';
  if (/montaj|söküm|işçilik|demontaj|kurulum|bakım|servis/.test(t)) return 'İşçilik';
  if (/nakliye|ulaşım|sevkiyat|kargo/.test(t)) return 'Ulaşım';
  if (marka) return 'Malzeme';
  if (birim && /birim|hizmet/i.test(birim)) return 'Servis';
  return 'Malzeme';
};

const pozMap = new Map();
const addPoz = (key, item) => {
  const existing = pozMap.get(key);
  if (!existing) pozMap.set(key, item);
};

// File 1 — ÜRÜN (kullanılan ürünler)
readSheet('excel-to-json (1).json').forEach((r, idx) => {
  const name = str(r['ÜRÜN']);
  if (!name) return;
  const marka = str(r['MARKA']);
  const unit = str(r['ÖLÇÜ']) || 'Adet';
  const price = num(r['BİRİM FİYAT']);
  const id = `POZ-RD1-${String(idx + 1).padStart(4, '0')}`;
  addPoz(slug(name) + '|' + slug(marka), {
    id,
    name: marka ? `${name} (${marka})` : name,
    description: undefined,
    category: inferCategory(name, marka, unit),
    unit,
    materialPrice: price,
    installPrice: 0,
    dismantlePrice: 0,
    vatRate: 20,
    defaultOverhead: 10,
    defaultProfit: 15,
    brand: marka || undefined,
  });
});

// File 2 — TANIM (teklif edilen ürünler)
readSheet('excel-to-json (2).json').forEach((r, idx) => {
  const name = str(r['TANIM']);
  if (!name) return;
  const marka = str(r['MARKA']);
  const unit = str(r['BİRİM']) || 'Adet';
  const price = num(r['İSKONTOLU BİRİM FİYAT']) || num(r['BİRİM FİYATI']);
  const id = `POZ-RD2-${String(idx + 1).padStart(4, '0')}`;
  addPoz(slug(name) + '|' + slug(marka), {
    id,
    name: marka ? `${name.slice(0, 90)} (${marka})` : name.slice(0, 110),
    description: name.length > 110 ? name : undefined,
    category: inferCategory(name, marka, unit),
    unit,
    materialPrice: price,
    installPrice: 0,
    dismantlePrice: 0,
    vatRate: 20,
    defaultOverhead: 10,
    defaultProfit: 15,
    brand: marka || undefined,
  });
});

// File 3 — TANIM (servis/mühendislik teklifleri)
readSheet('excel-to-json (3).json').forEach((r, idx) => {
  const name = str(r['TANIM']);
  if (!name) return;
  const unit = str(r['BİRİM']) || 'Adet';
  const price = num(r['BİRİM FİYAT']);
  const id = `POZ-RD3-${String(idx + 1).padStart(4, '0')}`;
  const cat = inferCategory(name, '', unit);
  addPoz(slug(name), {
    id,
    name: name.slice(0, 110),
    description: name.length > 110 ? name : undefined,
    category: cat,
    unit,
    materialPrice: cat === 'Malzeme' ? price : 0,
    installPrice: cat === 'Malzeme' ? 0 : price,
    dismantlePrice: 0,
    vatRate: Math.round((num(r['VERGİLER']) || 0.2) * 100),
    defaultOverhead: 10,
    defaultProfit: 15,
  });
});

const pozCatalog = Array.from(pozMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

// =============================================================
// WRITE TS files
// =============================================================
const header = `// AUTO-GENERATED by scripts/import-realdata.mjs — do not edit by hand.\n`;

const writeJsonAsTs = (file, exportName, type, data) => {
  const body = `${header}import type { ${type} } from '../types';\n\nexport const ${exportName}: ${type}[] = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(path.join(OUT, file), body, 'utf-8');
  console.log(`✓ ${file} (${data.length})`);
};

// Customers — Customer interface uyumu
writeJsonAsTs('realCustomers.ts', 'REAL_CUSTOMERS', 'Customer', customers);

// Employees — Employee interface'i extra alan kabul etmediği için sade tutuyoruz
const empClean = employees.map((e) => ({
  id: e.id, name: e.name, role: e.role,
  monthlyWage: e.monthlyWage, dailyRate: e.dailyRate,
  attendance: e.attendance, daysWorked: e.daysWorked,
}));
writeJsonAsTs('realEmployees.ts', 'REAL_EMPLOYEES', 'Employee', empClean);

// Materials — MaterialCatalogItem'a uyumlu (id, name, price)
const matClean = materials.map((m) => ({ id: m.id, name: m.name, price: m.price }));
writeJsonAsTs('realMaterials.ts', 'REAL_MATERIALS', 'MaterialCatalogItem', matClean);

// POZ Catalog — pozCatalog.ts içindeki tip
const pozBody = `${header}import type { PozItem } from './pozCatalog';\n\nexport const REAL_POZ_CATALOG: PozItem[] = ${JSON.stringify(pozCatalog.map((p) => {
  const { brand: _brand, ...rest } = p;
  return rest;
}), null, 2)};\n`;
fs.writeFileSync(path.join(OUT, 'realPozCatalog.ts'), pozBody, 'utf-8');
console.log(`✓ realPozCatalog.ts (${pozCatalog.length})`);

// Suppliers ekstra meta
const meta = {
  generatedAt: new Date().toISOString(),
  counts: { employees: empClean.length, customers: customers.length, materials: matClean.length, pozCatalog: pozCatalog.length },
};
fs.writeFileSync(path.join(OUT, 'realData.meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
console.log('Done.', meta.counts);
