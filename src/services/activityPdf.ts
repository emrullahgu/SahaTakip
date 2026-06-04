import { Alert } from 'react-native';
import type { WorkOrder, Quote } from '../types';
import { BRAND } from '../config/brand';
import { LOGO_DATA_URI } from '../config/logoBase64';
import { deliverPdf, escapePdfHtml as esc } from './pdf';

const COMPANY = BRAND.company;

const fmtTl = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateAndShareActivityPdf(
  date: string,
  workOrders: WorkOrder[],
  quotes: Quote[]
) {
  const dayWos = workOrders.filter(w => (w.date || '').slice(0, 10) === date);
  const dayQuotes = quotes.filter(q => (q.date || '').slice(0, 10) === date);

  const woRows = dayWos.map((w, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${esc(w.id)}</strong></td>
      <td>${esc(w.client)}</td>
      <td>${esc(w.serviceName)}</td>
      <td>${esc(w.status)}</td>
      <td class="right">${fmtTl(w.quoteAmount)} ₺</td>
    </tr>
  `).join('');

  const qRows = dayQuotes.map((q, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${esc(q.number)}</strong></td>
      <td>${esc(q.customerName)}</td>
      <td>${esc(q.title)}</td>
      <td>${esc(q.status)}</td>
      <td class="right">${fmtTl(q.grandTotal)} ₺</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Aktivite Raporu ${esc(date)}</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: 'Helvetica', Arial, sans-serif; margin: 0; padding: 30px; font-size: 11px; color: #333; }
  .logo { height: 40px; width: auto; display: block; margin-bottom: 8px; }
  h1 { color: #1e40af; margin-bottom: 5px; }
  .date { color: #666; margin-bottom: 20px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
  th { background: #f3f4f6; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .right { text-align: right; }
  .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #1e40af; border-left: 4px solid #22c55e; padding-left: 10px; }
  .footer { margin-top: 30px; text-align: center; color: #999; font-size: 9px; }
</style>
</head>
<body>
  <img class="logo" src="${LOGO_DATA_URI}" alt="${COMPANY.name}" />
  <h1>SAHA AKTİVİTE RAPORU</h1>
  <div class="date">Tarih: ${esc(date)}</div>

  <div class="section-title">İş Emirleri & Servisler (${dayWos.length})</div>
  <table>
    <thead><tr><th>#</th><th>ID</th><th>Müşteri</th><th>Hizmet</th><th>Durum</th><th class="right">Tutar</th></tr></thead>
    <tbody>${woRows || '<tr><td colspan="6" style="text-align:center">Kayıt yok</td></tr>'}</tbody>
  </table>

  <div class="section-title">Yeni Teklifler (${dayQuotes.length})</div>
  <table>
    <thead><tr><th>#</th><th>No</th><th>Müşteri</th><th>Konu</th><th>Durum</th><th class="right">Tutar</th></tr></thead>
    <tbody>${qRows || '<tr><td colspan="6" style="text-align:center">Kayıt yok</td></tr>'}</tbody>
  </table>

  <div class="footer">${COMPANY.legalName} · Otomatik Sistem Raporu</div>
</body>
</html>`;

  try {
    await deliverPdf(html, { fileName: `Aktivite-${date}.pdf`, dialogTitle: 'Aktivite Raporu' });
  } catch (e: any) {
    Alert.alert('Hata', e?.message || 'PDF oluşturulamadı');
  }
}
