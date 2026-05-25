// csvExport.ts — POZ-DEV-067
// Basit CSV üretici + paylaşım (xlsx yerine, Türkçe Excel ile uyumlu UTF-8 BOM).

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildCsv(rows: (string | number | undefined | null)[][]): string {
  return rows.map(r => r.map(escapeCell).join(';')).join('\r\n');
}

export async function shareCsv(filename: string, csv: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const payload = '\uFEFF' + csv;

  if (Platform.OS === 'web') {
    // Web: doğrudan Blob → anchor download (FileSystem yok)
    try {
      const blob = new Blob([payload], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch {} }, 0);
      return url;
    } catch (e) {
      console.warn('[csvExport] web download failed', e);
      return '';
    }
  }

  const uri = (FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '') + safeName + '.csv';
  await FileSystem.writeAsStringAsync(uri, payload, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const can = await Sharing.isAvailableAsync();
  if (can) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: filename,
    });
  }
  return uri;
}
