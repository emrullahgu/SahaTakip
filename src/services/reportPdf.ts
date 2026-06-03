// reportPdf.ts — POZ-DEV-066
// Rapor PDF üretimi + paylaşımı (expo-print).

import type { Report } from '../types';
import { BRAND } from '../config/brand';
import { LOGO_DATA_URI } from '../config/logoBase64';
import { deliverPdf } from './pdf';

const COMPANY = BRAND.company;

const fmtNum = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const fmtMoney = (n: number) => fmtNum(n) + ' ₺';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function periodLabel(period: Report['period']) {
  return period === 'daily' ? 'Günlük' : period === 'weekly' ? 'Haftalık' : 'Aylık';
}

function bucketRows(rows: { label: string; value: number }[], money = false) {
  if (!rows.length) {
    return '<tr><td colspan="2" class="muted center">Kayıt yok</td></tr>';
  }
  return rows
    .map(
      r => `
      <tr>
        <td>${escapeHtml(r.label)}</td>
        <td class="right">${money ? fmtMoney(r.value) : fmtNum(r.value)}</td>
      </tr>
    `,
    )
    .join('');
}

function buildHtml(r: Report): string {
  const k = r.kpi;
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Rapor ${escapeHtml(r.startDate)} - ${escapeHtml(r.endDate)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px 36px; }
  .logo { height: 40px; width: auto; display: block; margin-bottom: 10px; }
  h1 { margin: 0 0 4px; }
  .sub { color: #6b7280; margin-bottom: 24px; font-size: 13px; }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .kpi { flex: 1 1 30%; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }
  .kpi small { color: #6b7280; display: block; font-size: 11px; }
  .kpi strong { font-size: 16px; }
  h2 { margin: 24px 0 8px; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; }
  .right { text-align: right; }
  .center { text-align: center; }
  .muted { color: #9ca3af; }
  .footer { margin-top: 28px; color: #9ca3af; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <img class="logo" src="${LOGO_DATA_URI}" alt="${escapeHtml(COMPANY.name)}" />
  <h1>${periodLabel(r.period)} Rapor</h1>
  <div class="sub">${escapeHtml(r.startDate)} → ${escapeHtml(r.endDate)} · Oluşturuldu: ${new Date(
    r.generatedAt,
  ).toLocaleString('tr-TR')}</div>

  <div class="kpi-grid">
    <div class="kpi"><small>Toplam İş</small><strong>${k.workOrdersTotal}</strong></div>
    <div class="kpi"><small>Tamamlanan</small><strong>${k.workOrdersCompleted}</strong></div>
    <div class="kpi"><small>Açık</small><strong>${k.workOrdersOpen}</strong></div>
    <div class="kpi"><small>İptal</small><strong>${k.workOrdersCancelled}</strong></div>
    <div class="kpi"><small>Ciro</small><strong>${fmtMoney(k.revenue)}</strong></div>
    <div class="kpi"><small>Maliyet</small><strong>${fmtMoney(k.cost)}</strong></div>
    <div class="kpi"><small>Kâr</small><strong>${fmtMoney(k.profit)}</strong></div>
    <div class="kpi"><small>İşçilik (saat)</small><strong>${fmtNum(k.laborMinutes / 60)}</strong></div>
    <div class="kpi"><small>Müşteri Sayısı</small><strong>${k.customersTouched}</strong></div>
    <div class="kpi"><small>Teklif Açıldı</small><strong>${k.quotesCreated}</strong></div>
    <div class="kpi"><small>Teklif Kabul</small><strong>${k.quotesAccepted}</strong></div>
    <div class="kpi"><small>SLA İhlali</small><strong>${k.slaBreaches}</strong></div>
  </div>

  <h2>Durum Dağılımı</h2>
  <table>
    <thead><tr><th>Durum</th><th class="right">Adet</th></tr></thead>
    <tbody>${bucketRows(r.byStatus)}</tbody>
  </table>

  <h2>Saha Personeli Cirosu</h2>
  <table>
    <thead><tr><th>Personel</th><th class="right">Tutar</th></tr></thead>
    <tbody>${bucketRows(r.byEngineer, true)}</tbody>
  </table>

  <h2>Müşteri Cirosu (İlk 10)</h2>
  <table>
    <thead><tr><th>Müşteri</th><th class="right">Tutar</th></tr></thead>
    <tbody>${bucketRows(r.byCustomer, true)}</tbody>
  </table>

  ${r.notes ? `<h2>Notlar</h2><p>${escapeHtml(r.notes)}</p>` : ''}

  <div class="footer">${escapeHtml(COMPANY.name)} · ${new Date().getFullYear()}</div>
</body>
</html>`;
}

export async function generateAndShareReportPdf(r: Report): Promise<{ uri: string }> {
  const html = buildHtml(r);
  return deliverPdf(html, {
    fileName: `Rapor-${r.startDate}.pdf`,
    dialogTitle: `Rapor ${r.startDate}`,
  });
}
