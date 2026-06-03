// receiptPdf.ts — POZ-DEV-079
// Tahsilat makbuzu PDF + paylaş.

import { Payment } from '../types';
import { PAYMENT_METHODS, PAYMENT_STATUS_LABEL } from './payments';
import { BRAND } from '../config/brand';
import { deliverPdf } from './pdf';

const COMPANY = BRAND.company;

function fmtMoney(n: number, c: string = 'TRY'): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c === 'TRY' ? '₺' : c}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function esc(s: string | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function methodLabel(m: Payment['method']): string {
  return PAYMENT_METHODS.find(x => x.value === m)?.label ?? m;
}

export function buildReceiptHtml(p: Payment, company?: { title?: string; address?: string; tax?: string }): string {
  const vat = p.vatRate ? (p.amount * p.vatRate) / (100 + p.vatRate) : 0;
  const net = p.amount - vat;
  // Şirket bilgisi verilmezse BRAND (KOBİNERJİ) varsayılanları kullanılır.
  const co = {
    title: company?.title ?? COMPANY.legalName,
    address: company?.address ?? COMPANY.address.replace(/\n/g, ' '),
    tax: company?.tax ?? `${COMPANY.taxOffice} · VKN: ${COMPANY.taxNumber}`,
    contact: `${COMPANY.phone} · ${COMPANY.email} · ${COMPANY.website}`,
  };
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Makbuz ${esc(p.receiptNo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #555; font-size: 12px; }
  .box { border: 1px solid #ddd; border-radius: 8px; padding: 14px; margin-top: 14px; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
  .row span:first-child { color: #555; }
  .row span:last-child { font-weight: 600; }
  .total { font-size: 26px; font-weight: 800; color: #16a34a; }
  .status {
    display: inline-block; padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700; background: #ecfdf5; color: #047857;
  }
  .footer { margin-top: 24px; font-size: 11px; color: #777; text-align: center; }
  .sig { margin-top: 40px; display: flex; justify-content: space-between; }
  .sig div { width: 45%; border-top: 1px solid #aaa; padding-top: 6px; font-size: 11px; color: #555; text-align: center; }
</style>
</head>
<body>
  <div>
    <h1>TAHSİLAT MAKBUZU</h1>
    <div class="muted"><strong>${esc(co.title)}</strong></div>
    <div class="muted">${esc(co.address)}</div>
    <div class="muted">${esc(co.tax)}</div>
    <div class="muted">${esc(co.contact)}</div>
  </div>

  <div class="box">
    <div class="row"><span>Makbuz No</span><span>${esc(p.receiptNo)}</span></div>
    <div class="row"><span>Tarih</span><span>${fmtDate(p.receivedAt)}</span></div>
    <div class="row"><span>Müşteri</span><span>${esc(p.customerName)}</span></div>
    ${p.workOrderId ? `<div class="row"><span>İş Emri</span><span>${esc(p.workOrderId)}</span></div>` : ''}
    ${p.quoteId ? `<div class="row"><span>Teklif</span><span>${esc(p.quoteId)}</span></div>` : ''}
    <div class="row"><span>Ödeme Yöntemi</span><span>${esc(methodLabel(p.method))}</span></div>
    <div class="row"><span>Durum</span><span class="status">${esc(PAYMENT_STATUS_LABEL[p.status])}</span></div>
    ${p.receivedBy ? `<div class="row"><span>Tahsilatçı</span><span>${esc(p.receivedBy)}</span></div>` : ''}
  </div>

  <div class="box">
    ${p.vatRate ? `
      <div class="row"><span>Matrah</span><span>${fmtMoney(net, p.currency)}</span></div>
      <div class="row"><span>KDV (%${p.vatRate})</span><span>${fmtMoney(vat, p.currency)}</span></div>
    ` : ''}
    <div class="row" style="margin-top:8px"><span>TOPLAM</span><span class="total">${fmtMoney(p.amount, p.currency)}</span></div>
  </div>

  ${p.note ? `<div class="box"><div class="muted">Not</div><div>${esc(p.note)}</div></div>` : ''}

  <div class="sig">
    <div>Teslim Eden</div>
    <div>Teslim Alan</div>
  </div>

  <div class="footer">${esc(co.title)} · Bu makbuz elektronik ortamda oluşturulmuştur.</div>
</body>
</html>`;
}

export async function generateAndShareReceiptPdf(p: Payment): Promise<string | null> {
  const html = buildReceiptHtml(p);
  const { uri } = await deliverPdf(html, {
    fileName: `Makbuz-${p.receiptNo || p.id}.pdf`,
    dialogTitle: 'Makbuzu Paylaş',
  });
  return uri || null;
}
