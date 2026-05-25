/**
 * expo-sharing web shim
 * ----------------------
 * Stock expo-sharing web build çoğunlukla no-op. Bu shim, blob/file URI
 * verildiğinde tarayıcıda indirme veya yeni sekmede açma yapar.
 */

async function isAvailableAsync() {
  return typeof window !== 'undefined';
}

async function shareAsync(uri, options = {}) {
  if (!uri || typeof window === 'undefined') return;

  // Blob URL'ler (expo-print web shim'inden) zaten yeni sekmede açılıp
  // otomatik print diyaloğunu tetikledi → tekrar paylaşım/indirme gereksiz.
  if (typeof uri === 'string' && uri.startsWith('blob:')) return;

  // Web Share API varsa onu tercih et (mobile browser)
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      // dialog title varsa onu kullan, yoksa default
      uri.startsWith('http')
    ) {
      try {
        await navigator.share({ url: uri, title: options.dialogTitle || 'Paylaş' });
        return;
      } catch (e) {
        // user cancelled / not allowed; fall through to download
      }
    }
  } catch (e) {}

  // Download via anchor
  try {
    const a = document.createElement('a');
    a.href = uri;
    // mimeType pdf ise filename ile indir
    const isPdf = (options.mimeType || '').includes('pdf');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = options.dialogTitle
      ? `${String(options.dialogTitle).replace(/[^\w\-]+/g, '_')}${isPdf ? '.pdf' : ''}`
      : `sahatakip-${ts}${isPdf ? '.pdf' : ''}`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch (e) {} }, 0);
  } catch (e) {
    console.warn('[expo-sharing.web] failed', e);
    // Last resort: open in new tab
    try { window.open(uri, '_blank'); } catch (er) {}
  }
}

module.exports = {
  __esModule: true,
  isAvailableAsync,
  shareAsync,
};
