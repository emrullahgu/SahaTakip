// externalApiKeys — 3. parti servis API anahtarları yerel saklama (AsyncStorage).
// Tüm anahtarlar cihazda saklanır; sunucuya gönderilmez.
// Sunucu/Edge Function tarafında kullanılan anahtarlar için Supabase secrets kullanın.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@SahaTakip:external_api_keys';

export interface ExternalApiKeys {
  // Harita
  googleMapsKey?: string;

  // E-posta (Resend)
  resendApiKey?: string;
  resendFromEmail?: string;

  // SMS (Netgsm)
  netgsmUsername?: string;
  netgsmPassword?: string;
  netgsmHeader?: string;

  // WhatsApp Business (Meta)
  whatsappToken?: string;
  whatsappPhoneId?: string;

  // E-Fatura (genel)
  einvoiceApiKey?: string;
  einvoiceProvider?: 'logo' | 'mikro' | 'nesbilgi' | 'foriba' | 'manual' | 'other';

  // ERP (genel webhook ya da REST)
  erpApiKey?: string;
  erpBaseUrl?: string;

  // Apollo.io (lead/firma zenginleştirme + arama)
  apolloApiKey?: string;

  // Yedek / Storage
  s3AccessKey?: string;
  s3Secret?: string;
  s3Bucket?: string;
  s3Region?: string;
}

const DEFAULTS: ExternalApiKeys = {
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
  // GÜVENLİK: apolloApiKey ARTIK env default'undan ALINMAZ. EXPO_PUBLIC_* her zaman
  // istemci bundle'ına gömülür → Apollo anahtarı APK/web kaynağına sızıyordu. Anahtar
  // yalnızca (a) kullanıcının Ayarlar → Harici API Anahtarları ekranından girdiği değer
  // (AsyncStorage, bundle'a girmez) veya (b) apollo-proxy edge fonksiyonunun sunucu sırrı
  // (APOLLO_API_KEY secret) üzerinden gelir. Sızan eski anahtar ROTATE edilmeli.
};

export async function getExternalApiKeys(): Promise<ExternalApiKeys> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ExternalApiKeys;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export async function setExternalApiKeys(value: ExternalApiKeys): Promise<void> {
  // Boş string'leri undefined yap
  const clean: ExternalApiKeys = {};
  (Object.keys(value) as (keyof ExternalApiKeys)[]).forEach(k => {
    const v = value[k];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) (clean as any)[k] = t;
    } else if (v !== undefined) {
      (clean as any)[k] = v;
    }
  });
  await AsyncStorage.setItem(KEY, JSON.stringify(clean));
}

export async function clearExternalApiKeys(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
