// src/services/aiExport.ts
// AI yanıtlarını cihaz dosyasına yazıp paylaşma (markdown / metin).
// SDK 56 expo-file-system: Paths/File API kullanılır.

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share, Platform } from 'react-native';

export type ExportFormat = 'md' | 'txt';

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'ai-yanit';
}

/**
 * AI yanıtını dosyaya yazıp sistem paylaşım menüsünü açar.
 * Sharing desteklenmiyorsa React Native Share fallback kullanılır.
 */
export async function shareAiResponse(
  content: string,
  opts: { title?: string; format?: ExportFormat } = {},
): Promise<{ ok: boolean; error?: string }> {
  const fmt = opts.format ?? 'md';
  const title = sanitize(opts.title ?? `AI Yanit ${new Date().toISOString().slice(0, 16)}`);
  try {
    const file = new File(Paths.cache, `${title}.${fmt}`);
    try { file.create({ overwrite: true } as any); } catch { /* ignore */ }
    file.write(content);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: fmt === 'md' ? 'text/markdown' : 'text/plain',
        dialogTitle: 'AI yanıtını paylaş',
        UTI: fmt === 'md' ? 'net.daringfireball.markdown' : 'public.plain-text',
      });
      return { ok: true };
    }
    // Fallback
    await Share.share(
      Platform.OS === 'ios' ? { url: file.uri, message: content } : { message: content },
      { dialogTitle: 'AI yanıtını paylaş' },
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

/** Sadece panoya değil — basit metin paylaşımı (dosya oluşturmadan). */
export async function shareText(text: string, title?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await Share.share({ message: text, title: title ?? 'AI Yanıt' });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
