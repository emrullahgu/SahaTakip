// ====================================================================
// photoUpload — Generic photo uploader to Supabase Storage "photos" bucket.
// Online + file:// kaynağı varsa Storage'a yükler ve public URL döner.
// Online ama URL/blob (web) ise olduğu gibi döner.
// Offline veya hata durumunda local URI fallback.
// ====================================================================
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const BUCKET = 'photos';

function guessContentType(uri: string): string {
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

/**
 * Yerel fotoğraf URI'sini Supabase Storage'a yükler ve public URL döner.
 * @param localUri ImagePicker'dan dönen uri (file:// veya web blob:)
 * @param folder Klasör örn. "work-orders/abc-id" / "expenses/xy-id"
 */
export async function uploadPhoto(localUri: string, folder: string): Promise<string> {
  if (!localUri) return localUri;
  if (!SUPABASE_CONFIGURED) return localUri;

  try {
    let buf: ArrayBuffer | Uint8Array | Buffer;
    const contentType = guessContentType(localUri);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${contentType.split('/')[1] || 'jpg'}`;
    const path = `${folder}/${fileName}`.replace(/\/+/g, '/');

    if (Platform.OS === 'web' || localUri.startsWith('http') || localUri.startsWith('blob:') || localUri.startsWith('data:')) {
      // Web/blob/data — fetch ile blob'a al
      const resp = await fetch(localUri);
      const blob = await resp.blob();
      buf = await blob.arrayBuffer();
    } else {
      // Native (file://) — FileSystem ile base64 oku
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      buf = Buffer.from(base64, 'base64');
    }

    const { error } = await supabase.storage.from(BUCKET).upload(path, buf as any, {
      contentType,
      upsert: false,
    });
    if (error) {
      console.warn('[photoUpload]', error.message);
      throw new Error(error.message);
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl || localUri;
  } catch (e: any) {
    console.warn('[photoUpload.exception]', e?.message ?? e);
    throw e instanceof Error ? e : new Error(String(e?.message ?? e));
  }
}
