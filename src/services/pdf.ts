import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { Quote } from '../types';
import { calcLineTotal } from '../context/AppContext';
import { BRAND } from '../config/brand';
import { LOGO_DATA_URI } from '../config/logoBase64';

const COMPANY = BRAND.company;

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Üretilen HTML'i platforma uygun biçimde PDF olarak teslim eder.
 *  - web: yeni sekmede açar + otomatik yazdırma diyaloğu (kullanıcı "PDF olarak
 *    kaydet" seçer). Popup engellenirse HTML dosyası olarak indirir.
 *  - native: dosyaya yazıp paylaşım menüsünü açar.
 * (Önceden web'de paylaşım desteklenmediği için PDF hiç teslim edilmiyordu.)
 */
export async function deliverPdf(
  html: string,
  opts: { fileName: string; dialogTitle: string },
): Promise<{ uri: string }> {
  if (Platform.OS === 'web') {
    try {
      const w = typeof window !== 'undefined' ? window.open('', '_blank') : null;
      if (w && w.document) {
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 400);
        return { uri: 'about:blank' };
      }
      // Popup engellendi → HTML dosyası olarak indir (kullanıcı tarayıcıdan yazdırır)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = opts.fileName.replace(/\.(pdf|html)$/i, '') + '.html';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch { /* ignore */ } }, 0);
      return { uri: url };
    } catch (e) {
      console.warn('[pdf] web teslim başarısız', e);
      return { uri: '' };
    }
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: opts.dialogTitle,
      UTI: 'com.adobe.pdf',
    });
  }
  return { uri };
}

export function buildQuoteHtml(quote: Quote): string {
  const lineRows = quote.lines
    .map((line, idx) => {
      const calc = calcLineTotal(line);
      const overheadAmt = calc.withOverhead - calc.afterDiscount;
      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><strong>${escapeHtml(line.pozId)}</strong><br/><small>${escapeHtml(line.pozName)}</small></td>
          <td class="center">${line.quantity} ${escapeHtml(line.unit)}</td>
          <td class="right">${fmt(line.materialPrice)} ₺</td>
          <td class="right">${fmt(line.installPrice)} ₺</td>
          <td class="right">${line.withDismantle ? fmt(line.dismantlePrice) + ' ₺' : '<span class="muted">—</span>'}</td>
          <td class="right">${overheadAmt > 0 ? fmt(overheadAmt) + ' ₺' : '<span class="muted">—</span>'}</td>
          <td class="right"><strong>${fmt(calc.withProfit)} ₺</strong></td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(quote.number)} - Teklif</title>
<style>
  /* margin:0 → tarayıcı yazdırırken sayfa kenarına tarih/saat/başlık/URL BASMAZ */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica', 'Arial', sans-serif;
    color: #1f2937;
    margin: 0;
    padding: 32px 36px;
    font-size: 11px;
    line-height: 1.45;
  }
  .logo { height: 46px; width: auto; margin-bottom: 8px; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #1e40af;
    padding-bottom: 18px;
    margin-bottom: 24px;
  }
  .company { }
  .company .name { font-size: 22px; font-weight: 900; color: #1e40af; letter-spacing: 0.5px; }
  .company .slogan { font-size: 9px; color: #22c55e; font-weight: 800; letter-spacing: 2px; margin-top: 2px; }
  .company .info { font-size: 10px; color: #6b7280; margin-top: 6px; }
  .doc-info { text-align: right; }
  .doc-info .label { font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .doc-info .number { font-size: 18px; font-weight: 900; color: #1f2937; margin-top: 2px; }
  .doc-info .date { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .doc-info .status {
    display: inline-block;
    margin-top: 8px;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 800;
    background: #ecfdf5;
    color: #15803d;
    border: 1px solid #86efac;
  }
  .section-title {
    font-size: 10px;
    font-weight: 900;
    color: #1e40af;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 18px 0 8px;
  }
  .box {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px 14px;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .field { margin-bottom: 6px; }
  .field .l { font-size: 9px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .field .v { font-size: 11px; color: #1f2937; margin-top: 2px; }
  .title-box {
    background: #1e40af;
    color: #fff;
    padding: 10px 14px;
    border-radius: 6px;
    margin: 18px 0 0;
  }
  .title-box .l { font-size: 9px; opacity: 0.7; text-transform: uppercase; font-weight: 700; }
  .title-box .v { font-size: 14px; font-weight: 800; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1e40af; color: #fff; padding: 8px 6px; font-size: 9px; text-transform: uppercase; font-weight: 800; }
  td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: top; }
  td.center { text-align: center; }
  td.right { text-align: right; font-variant-numeric: tabular-nums; }
  small { color: #6b7280; font-size: 9px; }
  .muted { color: #9ca3af; }
  .totals {
    margin-top: 18px;
    width: 320px;
    margin-left: auto;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px 14px;
  }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .row.grand {
    border-top: 2px solid #1e40af;
    margin-top: 6px;
    padding-top: 8px;
    font-size: 14px;
    font-weight: 900;
    color: #1e40af;
  }
  .notes { margin-top: 22px; padding: 12px 14px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; }
  .notes .l { font-size: 9px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 1px; }
  .notes .v { font-size: 11px; color: #78350f; margin-top: 4px; white-space: pre-wrap; }
  .footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #6b7280;
  }
  .sign-box {
    margin-top: 36px;
    display: flex;
    justify-content: space-between;
    gap: 30px;
  }
  .sign {
    flex: 1;
    border-top: 1px solid #1f2937;
    padding-top: 6px;
    font-size: 10px;
    text-align: center;
    color: #6b7280;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      <img class="logo" src="${LOGO_DATA_URI}" alt="${escapeHtml(COMPANY.name)}" />
      <div class="slogan">${escapeHtml(COMPANY.tagline)}</div>
      <div class="info">${escapeHtml(COMPANY.address.replace(/\n/g, ' '))}<br/>${escapeHtml(COMPANY.email)} · ${escapeHtml(COMPANY.phone)} · ${escapeHtml(COMPANY.website)}<br/>${escapeHtml(COMPANY.taxOffice)} · VKN: ${escapeHtml(COMPANY.taxNumber)}</div>
    </div>
    <div class="doc-info">
      <div class="label">Teklif No</div>
      <div class="number">${escapeHtml(quote.number)}</div>
      <div class="date">Tarih: ${escapeHtml(quote.date)}${quote.validUntil ? `<br/>Geçerlilik: ${escapeHtml(quote.validUntil)}` : ''}</div>
      <div class="status">${escapeHtml(quote.status)}</div>
    </div>
  </div>

  <div class="section-title">Müşteri Bilgileri</div>
  <div class="box">
    <div class="field">
      <div class="l">Resmi Ünvan</div>
      <div class="v"><strong>${escapeHtml(quote.customerTitle || quote.customerName)}</strong></div>
    </div>
    ${quote.customerTitle ? `<div class="field"><div class="l">Kısa Ad</div><div class="v">${escapeHtml(quote.customerName)}</div></div>` : ''}
  </div>

  <div class="title-box">
    <div class="l">Teklif Konusu</div>
    <div class="v">${escapeHtml(quote.title)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px">Sıra</th>
        <th>Poz / İş Tanımı</th>
        <th style="width:70px">Miktar</th>
        <th style="width:80px">Malzeme B.F.</th>
        <th style="width:80px">Montaj B.F.</th>
        <th style="width:80px">Demontaj B.F.</th>
        <th style="width:80px">Genel Gider</th>
        <th style="width:90px">Tutar (KDV Hariç)</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Ara Toplam (KDV Hariç)</span><span>${fmt(quote.subtotal)} ₺</span></div>
    <div class="row"><span>KDV Toplamı</span><span>${fmt(quote.vatTotal)} ₺</span></div>
    <div class="row grand"><span>GENEL TOPLAM</span><span>${fmt(quote.grandTotal)} ₺</span></div>
  </div>

  ${quote.notes ? `<div class="notes"><div class="l">Notlar / Şartlar</div><div class="v">${escapeHtml(quote.notes)}</div></div>` : ''}

  <div class="sign-box">
    <div class="sign">Hazırlayan<br/><strong style="color:#1f2937">${escapeHtml(quote.engineer)}</strong></div>
    <div class="sign">Müşteri Kaşe / İmza</div>
  </div>

  <div class="footer">
    <div>Bu teklif sistem tarafından üretilmiştir.</div>
    <div>${escapeHtml(COMPANY.legalName)} © ${COMPANY.copyrightYear}</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Tüm PDF'ler arasında ortak kullanılan HTML-escape (XSS / bozuk layout önler). */
export const escapePdfHtml = escapeHtml;

/**
 * Ekran-içi PDF üreticilerinin (puantaj, mesai, denetim, yönetici raporu vb.)
 * tek tip marka başlığı kullanması için ortak yardımcı. Logo + gerçek firma adı
 * (BRAND) ekler — böylece her PDF aynı kurumsal kimlikle çıkar.
 * `<style>` bloğuna PDF_BRAND_CSS eklenmeli.
 */
export const PDF_BRAND_CSS = `
  .pdf-brand { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1e40af; padding-bottom:14px; margin-bottom:18px; }
  .pdf-brand .pdf-logo { height:40px; width:auto; display:block; margin-bottom:8px; }
  .pdf-brand .pdf-title { font-size:20px; font-weight:900; color:#1e40af; letter-spacing:0.3px; }
  .pdf-brand .pdf-sub { font-size:10px; color:#6b7280; margin-top:4px; }
`;

export function pdfBrandHeader(title: string, subtitle?: string, rightText?: string): string {
  const right = rightText ?? `Hazırlanma: ${new Date().toLocaleString('tr-TR')}`;
  return `<div class="pdf-brand">
    <div>
      <img class="pdf-logo" src="${LOGO_DATA_URI}" alt="${escapeHtml(COMPANY.name)}" />
      <div class="pdf-title">${escapeHtml(title)}</div>
      <div class="pdf-sub">${escapeHtml(COMPANY.name)}${subtitle ? ' · ' + escapeHtml(subtitle) : ''}</div>
    </div>
    <div class="pdf-sub">${escapeHtml(right)}</div>
  </div>`;
}

/**
 * Teklif PDF'i oluşturur ve cihazda paylaşım menüsünü açar.
 */
export async function generateAndShareQuotePdf(quote: Quote): Promise<{ uri: string }> {
  const html = buildQuoteHtml(quote);
  return deliverPdf(html, {
    fileName: `Teklif-${quote.number}.pdf`,
    dialogTitle: `Teklif ${quote.number}`,
  });
}

/**
 * PDF'i sadece üretir, paylaşmadan URI döner (preview / kayıt için).
 */
export async function generateQuotePdf(quote: Quote): Promise<string> {
  const html = buildQuoteHtml(quote);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

// ====================================================================
// POZ-DEV-022 — Puantaj (Attendance) Raporu (PDF + CSV)
// ====================================================================

import * as FileSystem from 'expo-file-system/legacy';
import type { Employee } from '../types';

/** YYYY-MM ay anahtarı için ayın tüm günlerini gez ve attendance['YYYY-MM-DD'] değerini kullan */
function monthDays(yyyyMm: string): string[] {
  const [y, m] = yyyyMm.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }).map(
    (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
  );
}

function buildAttendanceHtml(employees: Employee[], yyyyMm: string): string {
  const days = monthDays(yyyyMm);

  // Tek durum → harf/sınıf eşlemesi
  const statusMap: Record<string, { letter: string; cls: string; factor: number }> = {
    'Geldi':       { letter: 'G',  cls: 'ok',      factor: 1.0 },
    'Tam':         { letter: 'G',  cls: 'ok',      factor: 1.0 },
    'Yarım Gün':   { letter: 'Y',  cls: 'half',    factor: 0.5 },
    'Yarım':       { letter: 'Y',  cls: 'half',    factor: 0.5 },
    'İzinli':      { letter: 'İ',  cls: 'leave',   factor: 1.0 },
    'Raporlu':     { letter: 'R',  cls: 'sick',    factor: 0.0 },
    'Resmi Tatil': { letter: 'T',  cls: 'holiday', factor: 1.0 },
    'Eğitim':      { letter: 'E',  cls: 'train',   factor: 1.0 },
    'Mazeretsiz':  { letter: 'M',  cls: 'no',      factor: 0.0 },
    'Gelmedi':     { letter: '–',  cls: 'absent',  factor: 0.0 },
    'Yok':         { letter: '–',  cls: 'absent',  factor: 0.0 },
  };

  const headDates = days
    .map(d => `<th class="center">${d.slice(8)}</th>`)
    .join('');

  // Personel başına özet (bordro hesabı için)
  type Summary = {
    name: string; role: string; rate: number;
    geldi: number; yarim: number; izinli: number; raporlu: number;
    tatil: number; egitim: number; mazeretsiz: number; gelmedi: number;
    paidDays: number; wage: number;
  };
  const summaries: Summary[] = [];

  const rows = employees
    .map(e => {
      const counts: Record<string, number> = {};
      const cells = days
        .map(d => {
          const s = (e.attendance?.[d] ?? '').trim();
          if (s) counts[s] = (counts[s] ?? 0) + 1;
          const info = statusMap[s];
          if (!info) return `<td class="center empty"></td>`;
          return `<td class="center ${info.cls}">${info.letter}</td>`;
        })
        .join('');

      const geldi      = (counts['Geldi'] ?? 0) + (counts['Tam'] ?? 0);
      const yarim      = (counts['Yarım Gün'] ?? 0) + (counts['Yarım'] ?? 0);
      const izinli     = counts['İzinli'] ?? 0;
      const raporlu    = counts['Raporlu'] ?? 0;
      const tatil      = counts['Resmi Tatil'] ?? 0;
      const egitim     = counts['Eğitim'] ?? 0;
      const mazeretsiz = counts['Mazeretsiz'] ?? 0;
      const gelmedi    = (counts['Gelmedi'] ?? 0) + (counts['Yok'] ?? 0);

      const paidDays = geldi + izinli + tatil + egitim + yarim * 0.5;
      const wage = paidDays * (e.dailyRate || 0);

      summaries.push({
        name: e.name, role: e.role, rate: e.dailyRate || 0,
        geldi, yarim, izinli, raporlu, tatil, egitim, mazeretsiz, gelmedi,
        paidDays, wage,
      });

      return `
        <tr>
          <td><strong>${escapeHtml(e.name)}</strong><br/><small>${escapeHtml(e.role)}</small></td>
          ${cells}
          <td class="center"><strong>${paidDays}</strong></td>
          <td class="right"><strong>${fmt(wage)} ₺</strong></td>
        </tr>`;
    })
    .join('');

  // Bordro özet tablosu
  const bordroRows = summaries
    .map(
      s => `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong><br/><small>${escapeHtml(s.role)}</small></td>
        <td class="center">${s.geldi}</td>
        <td class="center">${s.yarim}</td>
        <td class="center">${s.izinli}</td>
        <td class="center">${s.raporlu}</td>
        <td class="center">${s.tatil}</td>
        <td class="center">${s.egitim}</td>
        <td class="center">${s.mazeretsiz}</td>
        <td class="center">${s.gelmedi}</td>
        <td class="center"><strong>${s.paidDays}</strong></td>
        <td class="right">${fmt(s.rate)} ₺</td>
        <td class="right"><strong>${fmt(s.wage)} ₺</strong></td>
      </tr>`
    )
    .join('');

  const totalPaidDays = summaries.reduce((a, s) => a + s.paidDays, 0);
  const totalWage = summaries.reduce((a, s) => a + s.wage, 0);

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8" />
<title>Puantaj ${yyyyMm}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 14mm; font-size: 9px; }
  .header { border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;}
  .title { font-size: 18px; font-weight: 900; color: #1e40af;}
  .sub { font-size: 10px; color: #6b7280; }
  .section-title { font-size: 13px; font-weight: 900; color: #1e40af; margin: 18px 0 8px 0; border-left: 4px solid #22c55e; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { background: #1e40af; color: #fff; padding: 5px 2px; font-size: 8px; font-weight: 800; word-wrap: break-word; }
  td { padding: 4px 2px; border-bottom: 1px solid #e5e7eb; font-size: 8.5px; word-wrap: break-word; }
  td.center { text-align: center; }
  td.right { text-align: right; font-variant-numeric: tabular-nums; }
  td.ok      { background: #ecfdf5; color: #15803d; font-weight: 800; }
  td.half    { background: #fef3c7; color: #b45309; font-weight: 800; }
  td.leave   { background: #fffbeb; color: #92400e; font-weight: 800; }
  td.sick    { background: #fef2f2; color: #991b1b; font-weight: 800; }
  td.holiday { background: #ede9fe; color: #5b21b6; font-weight: 800; }
  td.train   { background: #dbeafe; color: #1e40af; font-weight: 800; }
  td.no      { background: #fee2e2; color: #7f1d1d; font-weight: 800; }
  td.absent  { background: #f3f4f6; color: #4b5563; font-weight: 800; }
  td.empty   { color: #d1d5db; }
  /* Çok personelli puantaj birden fazla sayfaya taşarsa satırlar ortadan bölünmesin */
  tbody tr { page-break-inside: avoid; }
  tfoot td { background: #f1f5f9; font-weight: 900; }
  .legend { margin-top: 10px; font-size: 9px; color: #4b5563; line-height: 1.7; }
  .legend span { display: inline-block; margin-right: 14px; }
  .legend .box { display: inline-block; width: 10px; height: 10px; vertical-align: middle; margin-right: 4px; border-radius: 2px;}
  .bordro th { background: #16a34a; }
</style></head><body>
  <div class="header">
    <div>
      <div class="title">PUANTAJ &amp; BORDRO RAPORU</div>
      <div class="sub">${escapeHtml(COMPANY.name)} · ${escapeHtml(yyyyMm)}</div>
    </div>
    <div class="sub">Hazırlanma: ${new Date().toLocaleDateString('tr-TR')}</div>
  </div>

  <div class="section-title">Günlük Puantaj</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width: 14%">Personel</th>
        ${headDates}
        <th class="center" style="width: 6%">Gün</th>
        <th class="right" style="width: 8%">Hakediş</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="legend">
    <span><span class="box" style="background:#ecfdf5;border:1px solid #15803d"></span> G = Geldi</span>
    <span><span class="box" style="background:#fef3c7;border:1px solid #b45309"></span> Y = Yarım Gün</span>
    <span><span class="box" style="background:#fffbeb;border:1px solid #92400e"></span> İ = İzinli</span>
    <span><span class="box" style="background:#fef2f2;border:1px solid #991b1b"></span> R = Raporlu</span>
    <span><span class="box" style="background:#ede9fe;border:1px solid #5b21b6"></span> T = Resmi Tatil</span>
    <span><span class="box" style="background:#dbeafe;border:1px solid #1e40af"></span> E = Eğitim</span>
    <span><span class="box" style="background:#fee2e2;border:1px solid #7f1d1d"></span> M = Mazeretsiz</span>
    <span><span class="box" style="background:#f3f4f6;border:1px solid #4b5563"></span> – = Gelmedi</span>
  </div>

  <div class="section-title">Aylık Bordro Özeti</div>
  <table class="bordro">
    <thead>
      <tr>
        <th style="text-align:left; width: 18%">Personel</th>
        <th class="center">Geldi</th>
        <th class="center">Yarım</th>
        <th class="center">İzinli</th>
        <th class="center">Raporlu</th>
        <th class="center">Tatil</th>
        <th class="center">Eğitim</th>
        <th class="center">Mazeretsiz</th>
        <th class="center">Gelmedi</th>
        <th class="center">Toplam Gün</th>
        <th class="right">Günlük Ücret</th>
        <th class="right">Hakediş</th>
      </tr>
    </thead>
    <tbody>${bordroRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="9" class="right">TOPLAM</td>
        <td class="center">${totalPaidDays}</td>
        <td class="right">—</td>
        <td class="right">${fmt(totalWage)} ₺</td>
      </tr>
    </tfoot>
  </table>
</body></html>`;
}

/** Puantajı PDF olarak üret + paylaş */
export async function generateAndShareAttendancePdf(
  employees: Employee[],
  yyyyMm: string
): Promise<{ uri: string }> {
  const html = buildAttendanceHtml(employees, yyyyMm);
  return deliverPdf(html, {
    fileName: `Puantaj-${yyyyMm}.pdf`,
    dialogTitle: `Puantaj ${yyyyMm}`,
  });
}

/** Puantajı CSV olarak üret + paylaş (Excel'de açılır) */
export async function generateAndShareAttendanceCsv(
  employees: Employee[],
  yyyyMm: string
): Promise<{ uri: string }> {
  const days = monthDays(yyyyMm);
  const header = ['Personel', 'Rol', ...days, 'Geldi', 'Yarım', 'İzinli', 'Raporlu', 'Tatil', 'Eğitim', 'Mazeretsiz', 'Gelmedi', 'Toplam Gün', 'Günlük Ücret', 'Hakediş (TL)'].join(';');
  const csvStatusMap: Record<string, string> = {
    'Geldi': 'G', 'Tam': 'G',
    'Yarım Gün': 'Y', 'Yarım': 'Y',
    'İzinli': 'İ',
    'Raporlu': 'R',
    'Resmi Tatil': 'T',
    'Eğitim': 'E',
    'Mazeretsiz': 'M',
    'Gelmedi': '-', 'Yok': '-',
  };
  const lines = employees.map(e => {
    const counts: Record<string, number> = {};
    const cells = days.map(d => {
      const s = (e.attendance?.[d] ?? '').trim();
      if (s) counts[s] = (counts[s] ?? 0) + 1;
      return csvStatusMap[s] ?? '';
    });
    const geldi      = (counts['Geldi'] ?? 0) + (counts['Tam'] ?? 0);
    const yarim      = (counts['Yarım Gün'] ?? 0) + (counts['Yarım'] ?? 0);
    const izinli     = counts['İzinli'] ?? 0;
    const raporlu    = counts['Raporlu'] ?? 0;
    const tatil      = counts['Resmi Tatil'] ?? 0;
    const egitim     = counts['Eğitim'] ?? 0;
    const mazeretsiz = counts['Mazeretsiz'] ?? 0;
    const gelmedi    = (counts['Gelmedi'] ?? 0) + (counts['Yok'] ?? 0);
    const paidDays = geldi + izinli + tatil + egitim + yarim * 0.5;
    const wage = paidDays * (e.dailyRate || 0);
    return [
      `"${e.name}"`,
      `"${e.role}"`,
      ...cells,
      String(geldi), String(yarim), String(izinli), String(raporlu),
      String(tatil), String(egitim), String(mazeretsiz), String(gelmedi),
      String(paidDays),
      String((e.dailyRate || 0).toFixed(2)),
      String(wage.toFixed(2)),
    ].join(';');
  });
  // BOM ile Excel Türkçe karakterleri doğru okur
  const csv = '\ufeff' + [header, ...lines].join('\r\n');

  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `puantaj-${yyyyMm}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch {} }, 0);
      return { uri: url };
    } catch (e) {
      console.warn('[pdf.ts] CSV web download failed', e);
      return { uri: '' };
    }
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  const uri = `${dir}puantaj-${yyyyMm}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: `Puantaj ${yyyyMm} (CSV)`,
      UTI: 'public.comma-separated-values-text',
    });
  }
  return { uri };
}
