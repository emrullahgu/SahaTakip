/**
 * expo-image-manipulator web shim
 * --------------------------------
 * expo-image-manipulator@56.0.17 web'de bozuk paketleniyor (package.json
 * main: src/index.ts ama build/ yalnız .d.ts içeriyor → metro `./validators`'ı
 * çözemiyor, TÜM web bundle'ı çöküyordu). Bu shim web'de canvas ile GERÇEK
 * yeniden boyutlandırma yapar; herhangi bir hata olursa orijinali döndürür
 * (image.ts zaten hata halinde aynısını bekliyor).
 */

const SaveFormat = { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    try { img.crossOrigin = 'anonymous'; } catch (_) {}
    img.src = src;
  });
}

async function manipulateAsync(uri, actions = [], options = {}) {
  if (typeof document === 'undefined') return { uri, width: 0, height: 0, base64: undefined };
  try {
    const img = await loadImage(uri);
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;
    for (const a of actions) {
      if (a && a.resize && a.resize.width) {
        const w = a.resize.width;
        const ratio = w / (img.naturalWidth || img.width || w);
        targetW = w;
        targetH = a.resize.height || Math.round((img.naturalHeight || img.height) * ratio);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const mime = options.format === SaveFormat.PNG ? 'image/png' : 'image/jpeg';
    const quality = typeof options.compress === 'number' ? options.compress : 0.8;
    const dataUrl = canvas.toDataURL(mime, quality);
    return {
      uri: dataUrl,
      width: targetW,
      height: targetH,
      base64: options.base64 ? dataUrl.split(',')[1] : undefined,
    };
  } catch (_) {
    return { uri, width: 0, height: 0, base64: undefined };
  }
}

module.exports = {
  __esModule: true,
  default: { manipulateAsync, SaveFormat },
  manipulateAsync,
  SaveFormat,
};
