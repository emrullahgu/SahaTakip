import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Quote } from '../types';
import { calcLineTotal } from '../context/AppContext';

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildQuoteHtml(quote: Quote): string {
  const lineRows = quote.lines
    .map((line, idx) => {
      const calc = calcLineTotal(line);
      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><strong>${escapeHtml(line.pozId)}</strong><br/><small>${escapeHtml(line.pozName)}</small></td>
          <td class="center">${line.quantity} ${escapeHtml(line.unit)}</td>
          <td class="right">${fmt(line.materialPrice)} ₺</td>
          <td class="right">${fmt(line.installPrice)} ₺</td>
          <td class="right">${line.withDismantle ? fmt(line.dismantlePrice) + ' ₺' : '<span class="muted">—</span>'}</td>
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
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica', 'Arial', sans-serif;
    color: #1f2937;
    margin: 0;
    padding: 32px 36px;
    font-size: 11px;
    line-height: 1.45;
  }
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
      <div class="name">KOBINERJI</div>
      <div class="slogan">SAHADA · TAKİPTE · KONTROLDE</div>
      <div class="info">Mühendislik Hizmetleri · İzmir<br/>info@kobinerji.com · 0xxx xxx xx xx</div>
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
    <div>SahaTakip · KOBINERJI Mühendislik © 2025</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Teklif PDF'i oluşturur ve cihazda paylaşım menüsünü açar.
 */
export async function generateAndShareQuotePdf(quote: Quote): Promise<{ uri: string }> {
  const html = buildQuoteHtml(quote);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Teklif ${quote.number}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return { uri };
}

/**
 * PDF'i sadece üretir, paylaşmadan URI döner (preview / kayıt için).
 */
export async function generateQuotePdf(quote: Quote): Promise<string> {
  const html = buildQuoteHtml(quote);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}
