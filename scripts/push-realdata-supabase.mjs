// scripts/push-realdata-supabase.mjs
// Pushes generated real data (customers + materials + poz catalog) into Supabase.
// Requires env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (NOT anon key).
//
// Usage:
//   $env:SUPABASE_URL="https://xxx.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
//   node scripts/push-realdata-supabase.mjs --tables=customers,materials
//
// Default tables: customers
// Tables supported: customers, materials, poz_catalog
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REAL = path.join(ROOT, 'realdata');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY env değişkenlerini ayarla.');
  process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const tables = (args.tables || 'customers').split(',').map((s) => s.trim());
const CHUNK = Number(args.chunk || 500);
const DRY = args.dry === 'true';

const slug = (s) => String(s || '').toLocaleLowerCase('tr-TR')
  .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
  .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v) => (v == null ? '' : String(v).trim());

const readSheet = (file) => {
  const j = JSON.parse(fs.readFileSync(path.join(REAL, file), 'utf-8'));
  const k = Object.keys(j)[0];
  return j[k];
};

const sb = async (pathStr, init = {}) => {
  const r = await fetch(`${URL}${pathStr}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
      ...(init.headers || {}),
    },
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`${pathStr} → ${r.status} ${txt}`);
  }
  return r;
};

const upsertChunked = async (table, rows, onConflict) => {
  console.log(`→ ${table}: ${rows.length} satır${DRY ? ' (DRY RUN)' : ''}`);
  if (DRY) { console.log('  ilk satır:', JSON.stringify(rows[0]).slice(0, 200)); return; }
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    await sb(`/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      body: JSON.stringify(slice),
    });
    process.stdout.write(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  console.log(`\n  ✓ ${table} tamamlandı.`);
};

// ---------- customers ----------
if (tables.includes('customers')) {
  const raw = readSheet('excel-to-json (5).json');
  const rows = raw.filter((r) => str(r['Müşteri/tedarikçi ismi'])).map((r) => {
    const title = str(r['Müşteri/tedarikçi ismi']);
    const bal = num(r['TL Bakiye']);
    return {
      // Customers tablosunu UUID id ile dolduruyoruz; ID'yi server üretir.
      // Eşsizlik için tax_number, yoksa shortName + city üzerinden eşle.
      short_name: title.split(/\s+/).slice(0, 3).join(' ').slice(0, 60),
      title,
      tax_number: str(r['Vergi numarası/TC kimlik no']) || null,
      tax_office: str(r['Vergi dairesi']) || null,
      email: str(r['E-posta']) || null,
      address: str(r['Adres']) || null,
      city: str(r['İl']) || null,
      type: bal < 0 ? 'Tedarikçi' : 'Aktif',
      current_balance: bal,
    };
  });
  await upsertChunked('customers', rows, 'title');
}

// ---------- materials → material_catalog ----------
if (tables.includes('materials')) {
  const raw = readSheet('excel-to-json (4).json');
  const rows = raw.filter((r) => str(r['Ürün/hizmet ismi'])).map((r, i) => ({
    id: `mat-${String(i + 1).padStart(4, '0')}`,
    name: str(r['Ürün/hizmet ismi']),
    price: num(r['Satış fiyatı']) || num(r['Alış fiyatı']),
  }));
  await upsertChunked('material_catalog', rows, 'id');
}

// ---------- poz_catalog ----------
if (tables.includes('poz_catalog')) {
  const txt = fs.readFileSync(path.join(ROOT, 'src', 'data', 'realPozCatalog.ts'), 'utf-8');
  const m = txt.match(/=\s*(\[[\s\S]*\]);\s*$/m);
  if (!m) { console.error('realPozCatalog.ts parse edilemedi'); process.exit(2); }
  const arr = JSON.parse(m[1]);
  await upsertChunked('poz_catalog', arr.map((p) => ({
    id: p.id, name: p.name, description: p.description ?? null,
    category: p.category, unit: p.unit,
    material_price: p.materialPrice, install_price: p.installPrice,
    dismantle_price: p.dismantlePrice ?? 0, vat_rate: p.vatRate,
    default_overhead: p.defaultOverhead, default_profit: p.defaultProfit,
  })), 'id');
}

console.log('Bitti.');
