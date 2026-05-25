/**
 * expo-print web shim — v2
 * ------------------------
 * Web'de gerçek PDF üretemeyiz (expo-print native API gerektirir). Bu shim,
 * HTML içeriğini bir Blob URL'sine sarıp yeni bir tarayıcı sekmesinde açar.
 * HTML'in `<head>`'ine enjekte edilen küçük bir script otomatik olarak
 * `window.print()` tetikler — kullanıcı tarayıcının "Hedef → PDF olarak kaydet"
 * seçeneğiyle gerçek bir PDF dosyası üretir.
 *
 * Eski strateji (gizli iframe + srcdoc) Chromium'da load timing yarışı
 * yüzünden boş iframe ile print() çağırıyor ve hiçbir şey olmuyordu.
 *
 * Geri dönen URI:
 *   - Yeni sekme açıldıysa veya iframe fallback'e düşüldüyse: blob:... URL.
 *     Sharing.web shim'i bu URL'yi no-op olarak ele alıyor (print sekmesi
 *     zaten kullanıcı eylemini halletti).
 */

const Orientation = { portrait: 'portrait', landscape: 'landscape' };

function extractTitle(html) {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return (m && m[1].trim()) || 'SahaTakip Belgesi';
}

function buildPrintableHtml(html) {
  const autoPrintScript = `<script>
    (function(){
      function go(){
        try { window.focus(); window.print(); } catch(e){ console.warn('print failed', e); }
      }
      if (document.readyState === 'complete') {
        setTimeout(go, 400);
      } else {
        window.addEventListener('load', function(){ setTimeout(go, 400); });
      }
    })();
  </script>`;

  const printCss = `<style>
    @media print {
      @page { margin: 12mm; size: auto; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
  </style>`;

  const inject = autoPrintScript + printCss;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, inject + '</head>');
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${inject}</head>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>SahaTakip PDF</title>${inject}</head><body>${html}</body></html>`;
}

function cleanupOldIframes() {
  try {
    document.querySelectorAll('iframe[data-sahatakip-print]').forEach(el => {
      try { el.remove(); } catch (_) {}
    });
  } catch (_) {}
}

function fallbackToIframe(url) {
  cleanupOldIframes();
  try {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('data-sahatakip-print', '1');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    iframe.src = url;
    setTimeout(() => {
      try { iframe.remove(); } catch (_) {}
    }, 180000);
  } catch (e) {
    console.warn('[expo-print.web] iframe fallback failed', e);
  }
}

async function printToFileAsync(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { uri: '', base64: undefined, numberOfPages: 0 };
  }
  const html = String(options.html ?? '');
  if (!html) {
    return { uri: '', base64: undefined, numberOfPages: 0 };
  }

  const printable = buildPrintableHtml(html);
  let url = '';
  try {
    const blob = new Blob([printable], { type: 'text/html;charset=utf-8' });
    url = URL.createObjectURL(blob);
  } catch (e) {
    console.warn('[expo-print.web] blob creation failed', e);
    return { uri: '', base64: undefined, numberOfPages: 0 };
  }

  let opened = null;
  try {
    opened = window.open(url, '_blank');
  } catch (_) {
    opened = null;
  }

  if (!opened) {
    // Popup blocked → iframe fallback
    fallbackToIframe(url);
  }

  // Revoke Blob URL after the print dialog has had time
  setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch (_) {}
  }, 180000);

  return { uri: url, base64: undefined, numberOfPages: 1 };
}

async function print(options = {}) {
  return printToFileAsync(options);
}

async function selectPrinter() {
  throw new Error('selectPrinter is only available on iOS');
}

module.exports = {
  __esModule: true,
  default: { Orientation, print, printToFileAsync, selectPrinter },
  Orientation,
  print,
  printToFileAsync,
  selectPrinter,
};
