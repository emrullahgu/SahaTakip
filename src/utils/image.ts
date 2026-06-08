// image.ts — fotoğraf yardımcıları.
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface ResizedImage { uri: string; base64?: string }

/**
 * Fotoğrafı yüklemeden ÖNCE küçültür: en geniş kenar ~maxWidth, JPEG sıkıştırma.
 * 12MP saha fotoğrafları base64 olarak 4-5 MB tutuyordu; bu hem belleği hem de
 * mobil veri/yükleme süresini şişiriyordu. Kamera fotoğrafları zaten >maxWidth
 * olduğundan upscale olmaz. Hata olursa orijinali döndürür (yükleme engellenmez).
 */
export async function resizeForUpload(
  uri: string,
  opts: { maxWidth?: number; compress?: number; base64?: boolean } = {},
): Promise<ResizedImage> {
  const { maxWidth = 1280, compress = 0.6, base64 = false } = opts;
  try {
    const out = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format: SaveFormat.JPEG, base64 },
    );
    return { uri: out.uri || uri, base64: out.base64 ?? undefined };
  } catch {
    return { uri, base64: undefined };
  }
}
