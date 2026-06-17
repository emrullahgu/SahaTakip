import type { WorkOrder } from '../types';
import { BRAND } from '../config/brand';
import { LOGO_DATA_URI } from '../config/logoBase64';
import { deliverPdf } from './pdf';

const COMPANY = BRAND.company;

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildWorkOrderHtml(wo: WorkOrder): string {
  const materialsRows = (wo.materials || [])
    .map((m: any, idx) => {
      // Satır iskontosunu UYGULA — kayıtlı materialCost iskontolu; PDF iskontosuz
      // gösterirse imzalı belge ile maliyet çelişirdi (denetim). qty/quantity esnek.
      const qty = Number(m.qty ?? m.quantity) || 0;
      const price = Number(m.price) || 0;
      const disc = Math.min(100, Math.max(0, Number(m.discountPct) || 0));
      const unit = price * (1 - disc / 100);
      return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(m.name)}${disc > 0 ? ` <span style="color:#dc2626;font-size:9px">−%${disc}</span>` : ''}</td>
        <td class="center">${qty}</td>
        <td class="right">${fmt(unit)} ₺</td>
        <td class="right">${fmt(qty * unit)} ₺</td>
      </tr>
    `;
    })
    .join('');

  // Çoklu foto: yeni beforePhotos/afterPhotos dizilerini kullan; yoksa eski tekil alana düş.
  const beforeList = (wo.beforePhotos && wo.beforePhotos.length ? wo.beforePhotos : (wo.beforePhoto ? [wo.beforePhoto] : []))
    .filter(Boolean);
  const afterList = (wo.afterPhotos && wo.afterPhotos.length ? wo.afterPhotos : (wo.afterPhoto ? [wo.afterPhoto] : []))
    .filter(Boolean);
  const photoBox = (label: string, src: string) =>
    `<div class="photo-box"><div class="l">${escapeHtml(label)}</div><img src="${escapeHtml(src)}"/></div>`;
  const photosHtml = [
    ...beforeList.map((p, i) => photoBox(`ÖNCESİ${beforeList.length > 1 ? ' ' + (i + 1) : ''}`, p)),
    ...afterList.map((p, i) => photoBox(`SONRASI${afterList.length > 1 ? ' ' + (i + 1) : ''}`, p)),
    ...(wo.formPhoto ? [photoBox('SERVİS FORMU', wo.formPhoto)] : []),
  ].join('');

  // İmza: SignaturePad onu data:application/json (stroke koordinatları) olarak üretir.
  // <img> bunu render EDEMEZ → her imzalı belgede bozuk-görsel ikonu çıkıyordu.
  // Stroke'ları inline SVG'ye çevir; zaten data:image/* veya http ise <img> kullan.
  const sigSvg = signatureToSvg(wo.signatureUri);
  const sigHtml = sigSvg
    ? sigSvg
    : (wo.signatureUri && /^(data:image\/|https?:)/i.test(wo.signatureUri)
        ? `<img src="${escapeHtml(wo.signatureUri)}"/>`
        : '<div style="height:60px"></div>');

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
      ${sigHtml}
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

/** base64 → utf-8 string (atob / Buffer fallback; SignaturePad'in toBase64'ünün tersi). */
function decodeBase64(b64: string): string {
  const g: any = globalThis as any;
  if (typeof atob === 'function') {
    try { return decodeURIComponent(escape(atob(b64))); } catch { try { return atob(b64); } catch { /* fallthrough */ } }
  }
  if (g.Buffer) { try { return g.Buffer.from(b64, 'base64').toString('utf-8'); } catch { /* fallthrough */ } }
  return '';
}

/**
 * SignaturePad imzasını (data:application/json;base64 → {w,h,strokes}) inline SVG'ye çevirir.
 * Saf fonksiyon → test edilebilir. expo-print <img src="data:application/json"> render edemez;
 * bu yüzden stroke'ları SVG path'lerine dökeriz (native + web + offline'da görünür).
 * Girdi JSON-imza değilse (data:image/*, http, boş) null döner → çağıran <img> kullanır.
 */
export function signatureToSvg(dataUri: string | undefined, opts?: { stroke?: string }): string | null {
  if (!dataUri || !dataUri.startsWith('data:application/json')) return null;
  try {
    const b64 = dataUri.split(',')[1] || '';
    const payload = JSON.parse(decodeBase64(b64)) as {
      w?: number; h?: number; strokes?: { x: number; y: number; start?: boolean }[];
    };
    const strokes = Array.isArray(payload.strokes) ? payload.strokes : [];
    if (strokes.length < 2) return null;
    const w = Number(payload.w) || 300;
    const h = Number(payload.h) || 150;
    // Stroke'ları `start` bayrağına göre ayrı path'lere böl (kalem kaldırılınca yeni çizgi).
    const paths: string[] = [];
    let cur: string[] = [];
    for (const p of strokes) {
      const x = Number(p.x); const y = Number(p.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (p.start && cur.length) { paths.push(cur.join(' ')); cur = []; }
      cur.push(`${cur.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    if (cur.length) paths.push(cur.join(' '));
    if (!paths.length) return null;
    const stroke = opts?.stroke || '#1f2937';
    const ds = paths
      .map(d => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" style="max-height:60px">${ds}</svg>`;
  } catch {
    return null;
  }
}

/** Uzak http(s) görselini base64 data-URI'ye indirir. expo-print native render'ı uzak
 *  URL'leri güvenilir indirmiyor (offline/auth bucket'ta boş çıkıyordu) → gömülü base64. */
async function toDataUri(src?: string): Promise<string | undefined> {
  if (!src || src.startsWith('data:') || !/^https?:/i.test(src)) return src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const dataUri: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return dataUri || src;
  } catch {
    return src; // indirilemezse orijinali bırak (en azından çevrimiçi web'de çalışır)
  }
}

/** PDF'ten önce tüm foto/imza URL'lerini base64'e gömer (saf builder'ı bozmadan). */
async function inlineWorkOrderImages(wo: WorkOrder): Promise<WorkOrder> {
  const resolveArr = async (arr?: string[]) =>
    arr && arr.length ? (await Promise.all(arr.map(toDataUri))).filter((x): x is string => !!x) : arr;
  const [beforePhotos, afterPhotos, beforePhoto, afterPhoto, formPhoto, signatureUri] = await Promise.all([
    resolveArr(wo.beforePhotos),
    resolveArr(wo.afterPhotos),
    toDataUri(wo.beforePhoto),
    toDataUri(wo.afterPhoto),
    toDataUri(wo.formPhoto),
    // İmza JSON-stroke ise dokunma (SVG'ye çevrilecek); yalnız http görsel imzayı göm.
    wo.signatureUri && /^https?:/i.test(wo.signatureUri) ? toDataUri(wo.signatureUri) : Promise.resolve(wo.signatureUri),
  ]);
  return {
    ...wo,
    beforePhotos,
    afterPhotos,
    beforePhoto: beforePhoto ?? '',   // tip: beforePhoto/afterPhoto zorunlu string
    afterPhoto: afterPhoto ?? '',
    formPhoto,
    signatureUri,
  };
}

export async function generateAndShareWorkOrderPdf(wo: WorkOrder): Promise<{ uri: string }> {
  // Görselleri önce base64'e göm — native/offline yazdırmada boş kutu çıkmasın.
  const resolved = await inlineWorkOrderImages(wo);
  const html = buildWorkOrderHtml(resolved);
  return deliverPdf(html, {
    fileName: `Servis-Formu-${wo.id}.pdf`,
    dialogTitle: `Servis Formu ${wo.id}`,
  });
}
