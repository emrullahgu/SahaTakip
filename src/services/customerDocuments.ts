// ====================================================================
// customerDocuments — POZ-DEV-045
// Müşteri belgeleri. expo-document-picker / expo-image-picker zorunlu değil:
// kayıt sırasında uri (file://… veya Supabase Storage URL) verilir.
// Online modda supabase.storage'a yüklemeyi dener; offline'da yerel uri saklanır.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { CustomerDocument } from '../types';
import { supabase } from './supabase';
import { isOnlineMode } from './data/repository';

const KEY = '@SahaTakip:customer_documents';
const BUCKET = 'customer-docs';

export async function listDocuments(): Promise<CustomerDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CustomerDocument[]) : [];
  } catch {
    return [];
  }
}

export async function listDocumentsByCustomer(customerId: string): Promise<CustomerDocument[]> {
  const all = await listDocuments();
  return all
    .filter(d => d.customerId === customerId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function saveDocuments(list: CustomerDocument[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

/**
 * Belge ekler. uri lokal (file://…) ya da indirilebilir URL olabilir.
 * Online modda supabase Storage'a yüklemeye çalışır.
 */
export async function addDocument(
  doc: Omit<CustomerDocument, 'id' | 'uploadedAt'>,
): Promise<CustomerDocument> {
  let finalUri = doc.uri;
  let storagePath = doc.storagePath;

  if (isOnlineMode() && doc.uri.startsWith('file://')) {
    try {
      const ext = doc.name.split('.').pop() || 'bin';
      storagePath = `${doc.customerId}/${Date.now()}-${doc.name}`;
      const base64 = await FileSystem.readAsStringAsync(doc.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const buf = Buffer.from(base64, 'base64');
      const up = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
        contentType: doc.mimeType || `application/${ext}`,
        upsert: false,
      });
      if (!up.error) {
        const pub = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        finalUri = pub.data.publicUrl;
      }
    } catch (e) {
      console.warn('[customerDocuments.upload]', e);
    }
  }

  const newDoc: CustomerDocument = {
    ...doc,
    id: `doc-${Date.now()}`,
    uploadedAt: new Date().toISOString(),
    uri: finalUri,
    storagePath,
  };
  const all = await listDocuments();
  all.unshift(newDoc);
  await saveDocuments(all);
  return newDoc;
}

export async function deleteDocument(id: string) {
  const all = await listDocuments();
  const target = all.find(d => d.id === id);
  await saveDocuments(all.filter(d => d.id !== id));
  if (target?.storagePath && isOnlineMode()) {
    supabase.storage
      .from(BUCKET)
      .remove([target.storagePath])
      .catch(e => console.warn('[doc.remove]', e));
  }
}

// Buffer polyfill için global yoksa stub (React Native runtime'da yok ama tsc için yeter)
declare const Buffer: any;
