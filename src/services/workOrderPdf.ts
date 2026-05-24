import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { WorkOrder } from '../types';

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildHtml(wo: WorkOrder): string {
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

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Servis Formu - ${escapeHtml(wo.id)}</title>
<style>
  body { font-family: 'Helvetica', Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; font-size: 11px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 20px; }
  .company { font-size: 20px; font-weight: 900; color: #1e40af; }
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
  .photos { display: flex; gap: 10px; margin-top: 20px; }
  .photo-box { flex: 1; text-align: center; }
  .photo-box img { width: 100%; height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  .signature-box { display: flex; gap: 40px; margin-top: 40px; }
  .sign { flex: 1; border-top: 1px solid #1f2937; padding-top: 8px; text-align: center; }
  .sign img { max-height: 60px; margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      SahaTakip<br/>
      <small style="font-size: 10px; color: #22c55e;">SAHADA · TAKİPTE · KONTROLDE</small>
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

  <div class="section-title">Fotoğraflar</div>
  <div class="photos">
    ${wo.beforePhoto ? `<div class="photo-box"><div class="l">ÖNCESİ</div><img src="${wo.beforePhoto}"/></div>` : ''}
    ${wo.afterPhoto ? `<div class="photo-box"><div class="l">SONRASI</div><img src="${wo.afterPhoto}"/></div>` : ''}
  </div>

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
    SahaTakip Mühendislik · Bu belge elektronik ortamda oluşturulmuştur.
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function generateAndShareWorkOrderPdf(wo: WorkOrder): Promise<{ uri: string }> {
  const html = buildHtml(wo);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Servis Formu ${wo.id}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return { uri };
}
