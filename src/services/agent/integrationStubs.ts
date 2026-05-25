// services/agent/integrationStubs.ts
// ---------------------------------------------------------------
// Henüz bağlı olmayan dış sistem entegrasyonları için tool stub'ları.
// Ajan bunları çağırdığında "henüz bağlı değil" diyen yapılandırılmış
// bir yanıt döner; bu sayede LLM hayal kurmaz ve kullanıcıya net bir
// "neyi eksik" mesajı verebilir. Gerçek entegrasyon eklendiğinde
// handler içindeki TODO'lar gerçek API çağrılarıyla doldurulur.
//
// Roadmap:
//  - Gmail: OAuth2 + Google API'lar (gönder/oku/etiketle)
//  - WhatsApp: Cloud API (Meta) veya 360dialog (mesaj/şablon gönder)
//  - Paraşüt: OAuth2 + REST (fatura, müşteri, tahsilat)
// ---------------------------------------------------------------

import type { ToolDef } from './tools';

const NOT_CONFIGURED = (provider: string, capability: string) => ({
  ok: false,
  configured: false,
  provider,
  capability,
  message:
    `${provider} entegrasyonu henüz yapılandırılmamış. Ayarlar → Entegrasyonlar ekranından bağlantıyı kurun. ` +
    `Yetenek "${capability}" hazır olduğunda bu tool gerçek çağrıyı yapacak.`,
  setupHint:
    provider === 'Gmail'
      ? 'EXPO_PUBLIC_GMAIL_CLIENT_ID + OAuth akışı (Google Cloud Console → Gmail API).'
      : provider === 'WhatsApp'
        ? 'EXPO_PUBLIC_WHATSAPP_PHONE_ID + EXPO_PUBLIC_WHATSAPP_TOKEN (Meta Cloud API).'
        : provider === 'Paraşüt'
          ? 'EXPO_PUBLIC_PARASUT_CLIENT_ID + EXPO_PUBLIC_PARASUT_CLIENT_SECRET + company_id (https://apidocs.parasut.com).'
          : provider === 'Google Drive'
            ? 'EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID + OAuth scope "drive.readonly" (Google Cloud Console → Drive API).'
            : 'Sağlayıcı dokümantasyonuna bakın.',
});

// ============== GMAIL ==============

export const gmail_send: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'gmail_send',
      description:
        '[STUB] Gmail üzerinden e-posta gönderir. Müşteriye teklif/rapor PDF\'i göndermek için kullanılacak. Şu an yapılandırılmadığı için çağrıldığında "konfigüre değil" yanıtı döner.',
      parameters: {
        type: 'object',
        required: ['to', 'subject', 'body'],
        properties: {
          to: { type: 'string', description: 'Alıcı e-posta adresi.' },
          subject: { type: 'string' },
          body: { type: 'string', description: 'Düz metin veya HTML.' },
          attachments: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ek dosya URL/path listesi (opsiyonel).',
          },
        },
      },
    },
  },
  handler: async (args) => NOT_CONFIGURED('Gmail', 'mail gönder: ' + (args.to || '?')),
};

export const gmail_list_recent: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'gmail_list_recent',
      description: '[STUB] Son gelen e-postaları listeler (müşteri yanıtlarını izlemek için).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Gmail arama sorgusu (örn "from:musteri@x.com").' },
          maxResults: { type: 'number' },
        },
      },
    },
  },
  handler: async () => NOT_CONFIGURED('Gmail', 'gelen kutusu listele'),
};

// ============== WHATSAPP ==============

export const whatsapp_send: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'whatsapp_send',
      description:
        '[STUB] WhatsApp üzerinden mesaj/şablon gönderir. Saha ekiplerine bilgi, müşteriye teklif onay linki vs. için. Şu an yapılandırılmadı.',
      parameters: {
        type: 'object',
        required: ['phone', 'message'],
        properties: {
          phone: { type: 'string', description: 'E.164 formatında (+90...).' },
          message: { type: 'string', description: 'Düz metin mesaj.' },
          templateName: { type: 'string', description: 'Onaylı şablon adı (opsiyonel).' },
          templateParams: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  handler: async (args) => NOT_CONFIGURED('WhatsApp', 'mesaj gönder: ' + (args.phone || '?')),
};

// ============== PARAŞÜT ==============

export const parasut_create_invoice: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'parasut_create_invoice',
      description:
        '[STUB] Paraşüt\'te satış faturası oluşturur (teklif onaylandığında otomatik). Şu an yapılandırılmadı.',
      parameters: {
        type: 'object',
        required: ['customerName', 'lines'],
        properties: {
          customerName: { type: 'string' },
          quoteId: { type: 'string', description: 'Kaynak teklif id\'si (opsiyonel).' },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
                vatRate: { type: 'number' },
              },
            },
          },
          dueDate: { type: 'string', description: 'Vade tarihi YYYY-MM-DD.' },
        },
      },
    },
  },
  handler: async (args) => NOT_CONFIGURED('Paraşüt', 'fatura oluştur: ' + (args.customerName || '?')),
};

export const parasut_list_invoices: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'parasut_list_invoices',
      description: '[STUB] Paraşüt\'teki açık/ödenmiş faturaları listeler. Tahsilat takibi için.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'open | paid | overdue' },
          customerName: { type: 'string' },
        },
      },
    },
  },
  handler: async () => NOT_CONFIGURED('Paraşüt', 'fatura listele'),
};

export const parasut_record_payment: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'parasut_record_payment',
      description: '[STUB] Paraşüt\'te bir faturaya tahsilat kaydı düşer.',
      parameters: {
        type: 'object',
        required: ['invoiceId', 'amount'],
        properties: {
          invoiceId: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string' },
          method: { type: 'string', description: 'havale | nakit | kredi_karti' },
        },
      },
    },
  },
  handler: async () => NOT_CONFIGURED('Paraşüt', 'tahsilat kaydet'),
};

// ============== GOOGLE DRIVE ==============

export const gdrive_search: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'gdrive_search',
      description:
        '[STUB] Kullanıcının Google Drive\'ında dosya araması yapar (PDF teklif, Excel maliyet listesi, sözleşme, fotoğraf vb.). q parametresi Drive arama söz dizimini destekler (örn "name contains \'teklif\' and mimeType=\'application/pdf\'").',
      parameters: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', description: 'Drive query string veya basit anahtar kelime.' },
          maxResults: { type: 'number', description: 'Maks. sonuç (varsayılan 10, max 50).' },
          mimeType: { type: 'string', description: 'application/pdf, application/vnd.google-apps.spreadsheet, image/jpeg vb. (opsiyonel).' },
          folderId: { type: 'string', description: 'Belirli klasör içinde ara (opsiyonel).' },
        },
      },
    },
  },
  handler: async (args) => NOT_CONFIGURED('Google Drive', 'dosya ara: ' + (args.q || '?')),
};

export const gdrive_read_file: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'gdrive_read_file',
      description:
        '[STUB] Google Drive dosyasının içeriğini metin olarak getirir. Google Docs/Sheets/Slides → düz metin export\'u; PDF → OCR/metin çıkarımı; resim → vision modeli ile tarif. Geçmiş tekliflerde, sözleşmelerde, malzeme listelerinde araştırma için.',
      parameters: {
        type: 'object',
        required: ['fileId'],
        properties: {
          fileId: { type: 'string', description: 'Drive file ID (gdrive_search sonuçlarından).' },
          maxChars: { type: 'number', description: 'Döndürülecek maks. karakter (varsayılan 6000).' },
        },
      },
    },
  },
  handler: async (args) => NOT_CONFIGURED('Google Drive', 'dosya oku: ' + (args.fileId || '?')),
};

export const gdrive_list_recent: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'gdrive_list_recent',
      description: '[STUB] Drive\'da son değişiklik görmüş dosyaları listeler.',
      parameters: {
        type: 'object',
        properties: {
          maxResults: { type: 'number' },
          daysBack: { type: 'number', description: 'Kaç gün geriye bakılacak (varsayılan 30).' },
        },
      },
    },
  },
  handler: async () => NOT_CONFIGURED('Google Drive', 'son dosyaları listele'),
};

export const INTEGRATION_TOOLS = {
  gmail_send,
  gmail_list_recent,
  whatsapp_send,
  parasut_create_invoice,
  gdrive_search,
  gdrive_read_file,
  gdrive_list_recent,
  parasut_list_invoices,
  parasut_record_payment,
};
