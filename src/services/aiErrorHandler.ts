// services/aiErrorHandler.ts — AI çağrılarından dönen hataları Türkçe, kullanıcı dostu mesaja çevir.
export type AiErrorCode =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'AUTH'
  | 'INVALID_INPUT'
  | 'API_ERROR'
  | 'NETWORK'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface NormalizedAiError {
  code: AiErrorCode;
  message: string;
  statusCode?: number;
  original?: unknown;
}

export function normalizeAiError(e: any): NormalizedAiError {
  const raw =
    e?.message ||
    e?.error_description ||
    e?.context?.error?.message ||
    (typeof e === 'string' ? e : '') ||
    'Bilinmeyen hata.';
  const status: number | undefined = e?.context?.status ?? e?.status ?? e?.statusCode;

  if (/timeout|zaman a/i.test(raw)) {
    return { code: 'TIMEOUT', message: 'İstek zaman aşımına uğradı. İnternet bağlantınızı kontrol edin ve tekrar deneyin.', statusCode: status, original: e };
  }
  if (status === 429 || /rate.?limit/i.test(raw)) {
    return { code: 'RATE_LIMIT', message: 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyip tekrar deneyin.', statusCode: 429, original: e };
  }
  if (status === 401 || status === 403 || /unauthor|forbid|jwt|auth/i.test(raw)) {
    return { code: 'AUTH', message: 'Oturum doğrulanamadı. Lütfen yeniden giriş yapın.', statusCode: status, original: e };
  }
  if (status === 400 || /invalid|geçersiz|gerekli/i.test(raw)) {
    return { code: 'INVALID_INPUT', message: raw, statusCode: status ?? 400, original: e };
  }
  if (/network|fetch failed|enetunreach|econnreset|net::/i.test(raw)) {
    return { code: 'NETWORK', message: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.', original: e };
  }
  if (/yapılandırılmamış|not configured|missing.*key/i.test(raw)) {
    return { code: 'NOT_CONFIGURED', message: 'AI yapılandırması eksik. Yönetici ile iletişime geçin.', original: e };
  }
  if (status && status >= 500) {
    return { code: 'API_ERROR', message: 'AI servisi şu an yanıt veremiyor. Birazdan tekrar deneyin.', statusCode: status, original: e };
  }
  return { code: 'UNKNOWN', message: raw, statusCode: status, original: e };
}

/** Alert.alert için hazır başlık + mesaj çifti döner. */
export function aiErrorAlert(e: unknown): { title: string; message: string } {
  const err = normalizeAiError(e);
  const titles: Record<AiErrorCode, string> = {
    TIMEOUT: 'Zaman Aşımı',
    RATE_LIMIT: 'Hız Limiti',
    AUTH: 'Yetki Hatası',
    INVALID_INPUT: 'Geçersiz Girdi',
    API_ERROR: 'Servis Hatası',
    NETWORK: 'Bağlantı Hatası',
    NOT_CONFIGURED: 'Yapılandırma',
    UNKNOWN: 'Hata',
  };
  return { title: titles[err.code], message: err.message };
}
