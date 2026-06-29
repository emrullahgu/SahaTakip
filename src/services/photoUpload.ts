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

// ====================================================================
// uploadAttachment — Generic dosya yükleyici (pdf, video, görüntü, diğer).
// uploadPhoto ile aynı bucket/akış, ama content-type uzantıdan tahmin edilir
// ve özgün dosya adı korunur. Ofis görev ekleri vb. için.
// ====================================================================
const ATTACH_MIME: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', heic: 'image/heic', gif: 'image/gif',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', '3gp': 'video/3gpp',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip', txt: 'text/plain', csv: 'text/csv',
};
export type AttachmentKind = 'image' | 'video' | 'pdf' | 'audio' | 'other';
export function attachmentKind(nameOrUri: string): AttachmentKind {
  const ext = (nameOrUri.split('.').pop() || '').toLowerCase().split('?')[0];
  if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'gif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'm4v', '3gp', 'avi', 'mkv'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (['mp3', 'm4a', 'wav', 'aac'].includes(ext)) return 'audio';
  return 'other';
}

/**
 * Herhangi bir dosyayı Supabase Storage'a yükler, public URL döner.
 * @param localUri kaynak uri (file:// / blob: / data:)
 * @param folder klasör (örn. "office/cards/<cardId>")
 * @param originalName özgün dosya adı (uzantı/MIME için)
 */
export async function uploadAttachment(localUri: string, folder: string, originalName?: string): Promise<string> {
  if (!localUri) return localUri;
  if (!SUPABASE_CONFIGURED) return localUri;
  try {
    const nameForExt = originalName || localUri;
    const ext = (nameForExt.split('.').pop() || 'bin').toLowerCase().split('?')[0];
    const contentType = ATTACH_MIME[ext] || 'application/octet-stream';
    const safeBase = (originalName ? originalName.replace(/\.[^.]+$/, '') : 'file').replace(/[^\w.-]+/g, '_').slice(0, 40);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${ext}`;
    const path = `${folder}/${fileName}`.replace(/\/+/g, '/');

    let buf: ArrayBuffer | Uint8Array | Buffer;
    if (Platform.OS === 'web' || localUri.startsWith('http') || localUri.startsWith('blob:') || localUri.startsWith('data:')) {
      const resp = await fetch(localUri);
      buf = await (await resp.blob()).arrayBuffer();
    } else {
      const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      buf = Buffer.from(base64, 'base64');
    }
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf as any, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl || localUri;
  } catch (e: any) {
    console.warn('[uploadAttachment]', e?.message ?? e);
    throw e instanceof Error ? e : new Error(String(e?.message ?? e));
  }
}
