// services/agent/integrationStubs.ts
// ---------------------------------------------------------------
// Dış sistem entegrasyonları için agent tool'ları.
//
// CANLI (Supabase Edge Functions üzerinden gerçek çağrı):
//  - Gmail: gmail_send → gmail-send fn · gmail_list_recent → inbox_messages tablosu
//  - WhatsApp: whatsapp_send → whatsapp-send fn (Meta Cloud API)
//
// STUB (henüz backend yok — çağrıldığında "yapılandırılmadı" döner):
//  - Paraşüt: OAuth2 + REST (fatura, müşteri, tahsilat)
//  - Google Drive: OAuth2 + Drive API (dosya ara/oku)
// ---------------------------------------------------------------

import type { ToolDef } from './tools';
import { sendGmail, sendWhatsApp } from '../channels';
import { supabase, SUPABASE_CONFIGURED } from '../supabase';

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
        'Gmail üzerinden e-posta gönderir (gmail-send Edge Function). Müşteriye teklif/rapor/bilgilendirme yollamak için. Body düz metin veya HTML olabilir; otomatik algılanır. (Dosya ekleri şu an desteklenmiyor.)',
      parameters: {
        type: 'object',
        required: ['to', 'subject', 'body'],
        properties: {
          to: { type: 'string', description: 'Alıcı e-posta adresi.' },
          subject: { type: 'string' },
          body: { type: 'string', description: 'Düz metin veya HTML.' },
        },
      },
    },
  },
  destructive: true, // dışa e-posta gönderir → kullanıcı onayı gerekir
  handler: async (args) => {
    if (!SUPABASE_CONFIGURED) return NOT_CONFIGURED('Gmail', 'mail gönder: ' + (args.to || '?'));
    const to = String(args.to || '').trim();
    if (!to) return { ok: false, provider: 'Gmail', error: 'Alıcı (to) boş.' };
    const body = String(args.body ?? '');
    const looksHtml = /<[a-z][\s\S]*>/i.test(body);
    try {
      const r = await sendGmail({
        to,
        subject: String(args.subject ?? '(konu yok)'),
        html: looksHtml ? body : undefined,
        text: looksHtml ? undefined : body,
        relatedType: 'agent',
      });
      return r.ok
        ? { ok: true, provider: 'Gmail', to, message: `E-posta gönderildi → ${to}`, result: r.result }
        : { ok: false, provider: 'Gmail', to, error: r.error || 'Gönderilemedi.' };
    } catch (e: any) {
      return { ok: false, provider: 'Gmail', to, error: e?.message || String(e) };
    }
  },
};

export const gmail_list_recent: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'gmail_list_recent',
      description:
        'Son gelen e-postaları listeler (inbox_messages tablosu — gmail-webhook tarafından doldurulur). Müşteri yanıtlarını/talepleri izlemek için. query ile "from:adres" veya konu/içerik kelimesi filtrelenebilir.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Arama: "from:musteri@x.com" veya konu/içerikte geçen kelime.' },
          maxResults: { type: 'number', description: 'Varsayılan 10, max 50.' },
        },
      },
    },
  },
  handler: async (args) => {
    if (!SUPABASE_CONFIGURED) return NOT_CONFIGURED('Gmail', 'gelen kutusu listele');
    const max = Math.min(Math.max(Number(args.maxResults) || 10, 1), 50);
    try {
      const { data, error } = await supabase
        .from('inbox_messages')
        .select('id, sender, subject, body, received_at, processed')
        .eq('source', 'gmail')
        .order('received_at', { ascending: false })
        .limit(max);
      if (error) return { ok: false, provider: 'Gmail', error: error.message };
      let rows: any[] = data || [];
      const term = String(args.query || '').trim().toLowerCase();
      if (term) {
        const m = term.match(/from:(\S+)/);
        if (m) rows = rows.filter(r => (r.sender || '').toLowerCase().includes(m[1]));
        else rows = rows.filter(r =>
          (r.subject || '').toLowerCase().includes(term) || (r.body || '').toLowerCase().includes(term));
      }
      return {
        ok: true,
        provider: 'Gmail',
        count: rows.length,
        messages: rows.map(r => ({
          from: r.sender,
          subject: r.subject,
          date: r.received_at,
          preview: String(r.body || '').slice(0, 200),
          processed: r.processed,
        })),
      };
    } catch (e: any) {
      return { ok: false, provider: 'Gmail', error: e?.message || String(e) };
    }
  },
};

// ============== WHATSAPP ==============

export const whatsapp_send: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'whatsapp_send',
      description:
        'WhatsApp üzerinden mesaj/şablon gönderir (whatsapp-send Edge Function · Meta Cloud API). Saha ekibine bilgi, müşteriye teklif onay linki vs. için. templateName verilirse onaylı şablon, yoksa düz metin gönderilir.',
      parameters: {
        type: 'object',
        required: ['phone', 'message'],
        properties: {
          phone: { type: 'string', description: 'E.164 formatında (+90...).' },
          message: { type: 'string', description: 'Düz metin mesaj.' },
          templateName: { type: 'string', description: 'Onaylı şablon adı (opsiyonel).' },
          templateParams: { type: 'array', items: { type: 'string' }, description: 'Şablon body parametreleri (sırasıyla).' },
        },
      },
    },
  },
  destructive: true, // dışa WhatsApp mesajı gönderir → kullanıcı onayı gerekir
  handler: async (args) => {
    if (!SUPABASE_CONFIGURED) return NOT_CONFIGURED('WhatsApp', 'mesaj gönder: ' + (args.phone || '?'));
    const to = String(args.phone || '').trim();
    if (!to) return { ok: false, provider: 'WhatsApp', error: 'Telefon (phone) boş.' };
    const params: string[] = Array.isArray(args.templateParams) ? args.templateParams.map(String) : [];
    const template = args.templateName
      ? {
          name: String(args.templateName),
          language: 'tr',
          components: params.length
            ? [{ type: 'body', parameters: params.map(t => ({ type: 'text', text: t })) }]
            : undefined,
        }
      : undefined;
    try {
      const r = await sendWhatsApp({
        to,
        message: args.message ? String(args.message) : undefined,
        template,
        relatedType: 'agent',
      });
      return r.ok
        ? { ok: true, provider: 'WhatsApp', to, message: `WhatsApp gönderildi → ${to}`, result: r.result }
        : { ok: false, provider: 'WhatsApp', to, error: r.error || 'Gönderilemedi.' };
    } catch (e: any) {
      return { ok: false, provider: 'WhatsApp', to, error: e?.message || String(e) };
    }
  },
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
