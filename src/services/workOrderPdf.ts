import type { WorkOrder } from '../types';
import { BRAND } from '../config/brand';
import { LOGO_DATA_URI } from '../config/logoBase64';
import { deliverPdf } from './pdf';

const COMPANY = BRAND.company;

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildWorkOrderHtml(wo: WorkOrder): string {
  const materialsRows = (wo.materials || [])
    .map((m, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(m.name)}</td>
        <td class="center">${m.qty}</td>
        <td class="right">${fmt(m.price)} ₺</td>
        <td class="right">${fmt(m.qty * m.price)} ₺</td>
      </tr>
    `)
    .join('');

  // Çoklu foto: yeni beforePhotos/afterPhotos dizilerini kullan; yoksa eski tekil alana düş.
  const beforeList = (wo.beforePhotos && wo.beforePhotos.length ? wo.beforePhotos : (wo.beforePhoto ? [wo.beforePhoto] : []))
    .filter(Boolean);
  const afterList = (wo.afterPhotos && wo.afterPhotos.length ? wo.afterPhotos : (wo.afterPhoto ? [wo.afterPhoto] : []))
    .filter(Boolean);
  const photoBox = (label: string, src: string) =>
    `<div class="photo-box"><div class="l">${escapeHtml(label)}</div><img src="${src}"/></div>`;
  const photosHtml = [
    ...beforeList.map((p, i) => photoBox(`ÖNCESİ${beforeList.length > 1 ? ' ' + (i + 1) : ''}`, p)),
    ...afterList.map((p, i) => photoBox(`SONRASI${afterList.length > 1 ? ' ' + (i + 1) : ''}`, p)),
    ...(wo.formPhoto ? [photoBox('SERVİS FORMU', wo.formPhoto)] : []),
  ].join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Servis Formu - ${escapeHtml(wo.id)}</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: 'Helvetica', Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; font-size: 11px; }
  .logo { height: 42px; width: auto; display: block; margin-bottom: 8px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 20px; }
  .company { font-size: 20px; font-weight: 900; color: #1e40af; }
  .company .contact { font-size: 9px; color: #6b7280; margin-top: 6px; line-height: 1.5; }
  .doc-type { text-align: right; }
  .doc-type h1 { margin: 0; font-size: 24px; color: #1f2937; }
  .section-title { font-size: 12px; font-weight: 800; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 20px 0 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
  .field { margin-bottom: 6px; }
  .field .l { color: #6b7280; font-weight: 700; font-size: 10px; text-transform: uppercase; }
  .field .v { color: #1f2937; margin-top: 2px; font-size: 11px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #1e40af; color: #fff; padding: 8px; font-size: 10px; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .right { text-align: right; }
  .center { text-align: center; }
  .photos { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  .photo-box { width: calc(33.33% - 7px); text-align: center; }
  .photo-box img { width: 100%; height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  .photo-box .l { color: #6b7280; font-weight: 700; font-size: 9px; text-transform: uppercase; margin-bottom: 3px; }
  table.cost td { padding: 7px 8px; }
  table.cost .total-row td { font-weight: 800; color: #1e40af; border-top: 2px solid #1e40af; font-size: 12px; }
  .signature-box { display: flex; gap: 40px; margin-top: 40px; }
  .sign { flex: 1; border-top: 1px solid #1f2937; padding-top: 8px; text-align: center; }
  .sign img { max-height: 60px; margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      <img class="logo" src="${LOGO_DATA_URI}" alt="${escapeHtml(COMPANY.name)}" />
      <small style="font-size: 10px; color: #22c55e;">${escapeHtml(COMPANY.tagline)}</small>
      <div class="contact">${escapeHtml(COMPANY.address.replace(/\n/g, ' '))}<br/>${escapeHtml(COMPANY.phone)} · ${escapeHtml(COMPANY.email)}<br/>${escapeHtml(COMPANY.taxOffice)} · VKN: ${escapeHtml(COMPANY.taxNumber)}</div>
    </div>
    <div class="doc-type">
      <h1>SERVİS FORMU</h1>
      <div style="margin-top: 4px;">Form No: <strong>${escapeHtml(wo.id)}</strong></div>
      <div>Tarih: ${escapeHtml(wo.date || '')}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="section-title" style="margin-top:0">Müşteri Bilgileri</div>
      <div class="field"><div class="l">Firma</div><div class="v">${escapeHtml(wo.client)}</div></div>
      <div class="field"><div class="l">Hizmet</div><div class="v">${escapeHtml(wo.serviceName)}</div></div>
    </div>
    <div class="info-box">
      <div class="section-title" style="margin-top:0">Servis Bilgileri</div>
      <div class="field"><div class="l">Teknisyen/Mühendis</div><div class="v">${escapeHtml(wo.assignedToName || wo.engineer)}</div></div>
      <div class="field"><div class="l">Durum</div><div class="v">${escapeHtml(wo.status)}</div></div>
    </div>
  </div>

  <div class="section-title">İş Notları</div>
  <div class="info-box" style="min-height: 60px;">
    ${escapeHtml(wo.notes || 'Not eklenmemiş.')}
  </div>

  ${wo.materials?.length ? `
    <div class="section-title">Kullanılan Malzemeler</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th>Malzeme Adı</th>
          <th style="width:60px">Adet</th>
          <th style="width:80px">Birim Fiyat</th>
          <th style="width:80px">Toplam</th>
        </tr>
      </thead>
      <tbody>${materialsRows}</tbody>
    </table>
  ` : ''}

  <div class="section-title">Masraflar / Maliyet Özeti</div>
  <table class="cost">
    <tbody>
      <tr><td>Malzeme Toplamı</td><td class="right">${fmt(wo.materialCost || 0)} ₺</td></tr>
      <tr><td>İşçilik</td><td class="right">${fmt(wo.laborCost || 0)} ₺</td></tr>
      <tr><td>Yol / Yemek Masrafı</td><td class="right">${fmt(wo.otherCost || 0)} ₺</td></tr>
      <tr class="total-row"><td>Teklif Tutarı (KDV dahil)</td><td class="right">${fmt(wo.quoteAmount || 0)} ₺</td></tr>
    </tbody>
  </table>

  ${photosHtml ? `
  <div class="section-title">Fotoğraflar</div>
  <div class="photos">${photosHtml}</div>
  ` : ''}

  <div class="signature-box">
    <div class="sign">
      <div class="l">Teknisyen İmzası</div>
      <div>${escapeHtml(wo.assignedToName || wo.engineer)}</div>
    </div>
    <div class="sign">
      <div class="l">Müşteri Onayı</div>
      ${wo.signatureUri ? `<img src="${wo.signatureUri}"/>` : '<div style="height:60px"></div>'}
      <div>Kaşe / İmza</div>
    </div>
  </div>

  <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 9px;">
    ${escapeHtml(COMPANY.legalName)} · Bu belge elektronik ortamda oluşturulmuştur.
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

export async function generateAndShareWorkOrderPdf(wo: WorkOrder): Promise<{ uri: string }> {
  const html = buildWorkOrderHtml(wo);
  return deliverPdf(html, {
    fileName: `Servis-Formu-${wo.id}.pdf`,
    dialogTitle: `Servis Formu ${wo.id}`,
  });
}
