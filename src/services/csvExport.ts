// csvExport.ts — POZ-DEV-067
// Basit CSV üretici + paylaşım (xlsx yerine, Türkçe Excel ile uyumlu UTF-8 BOM).

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
  const uri = (FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '') + safeName + '.csv';
  // UTF-8 BOM Excel için
  await FileSystem.writeAsStringAsync(uri, '\uFEFF' + csv, {
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
