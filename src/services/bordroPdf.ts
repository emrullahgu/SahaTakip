// bordroPdf.ts — Markalı bordro PDF'i (tek personel veya toplu liste).
// Kolonlar: İsim Soyisim · TC · Anlaşılan net · Gün · Mesai · Hakediş · Avans · Prim
//           · Resmi maaş · Ek ödeme · Toplam. @page margin 0 (tarayıcı başlık/altbilgi yok).
import { deliverPdf } from './pdf';
import { LOGO_DATA_URI } from '../config/logoBase64';
import { BRAND } from '../config/brand';
import { calcBordro, fmtTRY } from './bordroEngine';
import type { Bordro } from '../types';

const esc = (s: string) => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));

function rowsHtml(rows: Bordro[]): { body: string; totalToplam: number } {
  let totalToplam = 0;
  const body = rows.map((b, i) => {
    const t = calcBordro(b);
    totalToplam += t.total;
    return `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(b.fullName)}</td>
      <td class="c">${esc(b.nationalId)}</td>
      <td class="r">${fmtTRY(b.agreedNet)}</td>
      <td class="c">${b.workedDays}</td>
      <td class="r">${fmtTRY(t.overtimePay)}</td>
      <td class="r">${fmtTRY(t.hakedis)}</td>
      <td class="r">${fmtTRY(b.advance)}</td>
      <td class="r">${fmtTRY(b.bonus)}</td>
      <td class="r">${fmtTRY(b.officialSalary)}</td>
      <td class="r">${fmtTRY(b.extraPayment)}</td>
      <td class="r b">${fmtTRY(t.total)}</td>
    </tr>`;
  }).join('');
  return { body, totalToplam };
}

function buildHtml(period: string, rows: Bordro[]): string {
  const { body, totalToplam } = rowsHtml(rows);
  const c = BRAND.company;
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/>
<title>Bordro ${esc(period)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; color: #1f2937; margin: 0; padding: 28px 32px; font-size: 10px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { height: 42px; }
  .co { text-align: right; }
  .co .n { font-size: 18px; font-weight: 900; color: #1e40af; }
  .co .s { font-size: 8px; color: #22c55e; font-weight: 800; letter-spacing: .5px; }
  .co .i { font-size: 8px; color: #6b7280; margin-top: 2px; }
  h1 { font-size: 15px; margin: 0 0 10px; color: #111827; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e5e7eb; padding: 5px 6px; }
  th { background: #1e40af; color: #fff; font-size: 9px; text-align: left; }
  td.c { text-align: center; } td.r { text-align: right; } td.b { font-weight: 800; color: #1e40af; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tfoot td { background: #eef2ff; font-weight: 800; }
  .foot { margin-top: 14px; font-size: 8px; color: #9ca3af; text-align: center; }
</style></head>
<body>
  <div class="head">
    <img class="logo" src="${LOGO_DATA_URI}" alt="logo"/>
    <div class="co">
      <div class="n">${esc(c.name)}</div>
      <div class="s">${esc(BRAND.appSlogan)}</div>
      <div class="i">VKN: ${esc(c.taxNumber)} · ${esc(c.phone)}</div>
    </div>
  </div>
  <h1>Bordro — ${esc(period)}${rows.length === 1 ? ' · ' + esc(rows[0].fullName) : ` · ${rows.length} personel`}</h1>
  <table>
    <thead><tr>
      <th>#</th><th>İsim Soyisim</th><th>TC</th><th>Anlaşılan net</th><th>Gün</th><th>Mesai</th>
      <th>Hakediş</th><th>Avans</th><th>Prim</th><th>Resmi maaş</th><th>Ek ödeme</th><th>Toplam</th>
    </tr></thead>
    <tbody>${body}</tbody>
    ${rows.length > 1 ? `<tfoot><tr><td colspan="11" style="text-align:right">GENEL TOPLAM (Net)</td><td class="r">${fmtTRY(totalToplam)}</td></tr></tfoot>` : ''}
  </table>
  <div class="foot">${esc(c.legalName)} · ${esc(period)} dönemi bordrosu · SahaTakip ile üretildi</div>
</body></html>`;
}

/** Tek personel bordrosu PDF. */
export async function exportBordroSingle(b: Bordro): Promise<{ uri: string }> {
  return deliverPdf(buildHtml(b.period, [b]), {
    fileName: `bordro-${b.period}-${(b.fullName || 'personel').replace(/\s+/g, '_')}.pdf`,
    dialogTitle: 'Bordro PDF',
  });
}

/** Toplu (dönemdeki tüm personel) bordro PDF. */
export async function exportBordroBulk(period: string, rows: Bordro[]): Promise<{ uri: string }> {
  return deliverPdf(buildHtml(period, rows), {
    fileName: `bordro-${period}-tum-personel.pdf`,
    dialogTitle: 'Toplu Bordro PDF',
  });
}
