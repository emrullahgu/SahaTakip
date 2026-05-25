/**
 * expo-print web shim
 * --------------------
 * Web'de gerçek PDF üretemeyiz (expo-print native API gerektirir). Bunun
 * yerine HTML'i yeni bir sekmeye yazıp `window.print()` tetikliyoruz —
 * kullanıcı tarayıcının "Hedef → PDF olarak kaydet" seçeneğiyle gerçek bir
 * PDF üretir.
 *
 * ÖNEMLİ: `uri` olarak boş string döndürüyoruz çünkü blob içerisindeki HTML
 * `.pdf` uzantısıyla indirilirse PDF okuyucu "dokümanı yüklenemedi" hatası
 * verir. `expo-sharing.web.js` boş URI'yi no-op olarak ele alır.
 */

const Orientation = { portrait: 'portrait', landscape: 'landscape' };

function buildPrintableHtml(html) {
  const hasHtmlTag = /<html[\s>]/i.test(html);
  if (hasHtmlTag) return html;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>SahaTakip PDF</title></head><body>${html}</body></html>`;
}

async function printToFileAsync(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { uri: '', base64: undefined, numberOfPages: 0 };
  }
  const html = String(options.html ?? '');
  const printable = buildPrintableHtml(html);

  // STRATEJI: Async PDF üretiminden sonra `window.open` çoğu tarayıcıda popup
  // blocker tarafından engellenir (user gesture kaybolur). Bu yüzden gizli
  // iframe yöntemini birincil yöntem yapıyoruz — same-origin iframe.print()
  // tarayıcı print diyalogunu güvenilir biçimde açar ve sadece iframe içeriği
  // yazdırılır.

  const cleanupAfter = 120000; // 2 dk sonra iframe'i kaldır

  // Eski mevcut yazdırma iframe'lerini temizle
  try {
    document.querySelectorAll('iframe[data-sahatakip-print]').forEach(el => el.remove());
  } catch (_) {}

  await new Promise(resolve => {
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    try {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('data-sahatakip-print', '1');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      let launched = false;
      const triggerPrint = () => {
        try {
          const cw = iframe.contentWindow;
          if (!cw) return;
          const doc = cw.document;
          const imgs = doc ? Array.from(doc.images || []) : [];
          const pending = imgs.filter(i => !i.complete);
          const launch = () => {
            if (launched) return;
            launched = true;
            try { cw.focus(); cw.print(); } catch (e) { console.warn('[expo-print.web] print() failed', e); }
            done();
          };
          if (pending.length === 0) {
            setTimeout(launch, 150);
          } else {
            let remaining = pending.length;
            const finish = () => { if (--remaining <= 0) setTimeout(launch, 120); };
            pending.forEach(i => {
              i.addEventListener('load', finish, { once: true });
              i.addEventListener('error', finish, { once: true });
            });
            // Güvenlik için max 3 sn bekle, hepsi yüklenmezse yine yazdır
            setTimeout(launch, 3000);
          }
        } catch (e) {
          console.warn('[expo-print.web] triggerPrint failed', e);
          done();
        }
      };

      iframe.addEventListener('load', () => { triggerPrint(); }, { once: true });

      // Hidden iframe → srcdoc daha temiz çalışıyor (CSP'siz)
      try {
        iframe.srcdoc = printable;
      } catch (e) {
        const idoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (idoc) { idoc.open(); idoc.write(printable); idoc.close(); }
        // load event tetiklenmeyebilir
        setTimeout(triggerPrint, 400);
      }

      // Cleanup
      setTimeout(() => { try { iframe.remove(); } catch (_) {} }, cleanupAfter);

      // Resolve makul süre sonra — print diyaloğu modal olduğu için await edersek
      // arayüz kilitlenir. printToFileAsync'in 1-2 sn içinde dönmesi yeterli.
      setTimeout(done, 2000);
    } catch (e) {
      console.warn('[expo-print.web] iframe path failed', e);
      done();
    }
  });

  return { uri: '', base64: undefined, numberOfPages: 1 };
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

