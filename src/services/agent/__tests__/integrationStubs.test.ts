// integrationStubs.test.ts — Gmail/WhatsApp canlı bağlantı + Paraşüt/Drive stub testleri
jest.mock('../../channels', () => ({
  sendGmail: jest.fn(),
  sendWhatsApp: jest.fn(),
}));

const mockFrom = jest.fn();
jest.mock('../../supabase', () => ({
  SUPABASE_CONFIGURED: true,
  supabase: { from: (...a: any[]) => mockFrom(...a) },
}));

import {
  gmail_send, whatsapp_send, gmail_list_recent,
  parasut_create_invoice, gdrive_search,
} from '../integrationStubs';
import { sendGmail, sendWhatsApp } from '../../channels';

const ctx: any = { app: {}, confirm: async () => true, log: () => {} };

beforeEach(() => jest.clearAllMocks());

describe('Gmail — canli', () => {
  it('gmail_send duz metni text olarak gonderir', async () => {
    (sendGmail as jest.Mock).mockResolvedValueOnce({ ok: true, result: { id: 'm1' } });
    const r = await gmail_send.handler({ to: 'a@b.com', subject: 'Selam', body: 'Merhaba dunya' }, ctx);
    expect(r.ok).toBe(true);
    expect(sendGmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'a@b.com', subject: 'Selam', text: 'Merhaba dunya', html: undefined,
    }));
  });

  it('gmail_send HTML govdeyi html olarak algilar', async () => {
    (sendGmail as jest.Mock).mockResolvedValueOnce({ ok: true });
    await gmail_send.handler({ to: 'a@b.com', subject: 'X', body: '<p>Merhaba</p>' }, ctx);
    expect(sendGmail).toHaveBeenCalledWith(expect.objectContaining({ html: '<p>Merhaba</p>', text: undefined }));
  });

  it('gmail_send destructive (onay gerektirir)', () => {
    expect(gmail_send.destructive).toBe(true);
  });

  it('gmail_send hata sonucunu yapilandirilmis doner', async () => {
    (sendGmail as jest.Mock).mockResolvedValueOnce({ ok: false, error: 'SMTP reddetti' });
    const r = await gmail_send.handler({ to: 'a@b.com', subject: 'X', body: 'y' }, ctx);
    expect(r).toMatchObject({ ok: false, provider: 'Gmail', error: 'SMTP reddetti' });
  });

  it('gmail_list_recent inbox_messages tablosunu sorgular ve from: ile filtreler', async () => {
    const builder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          { id: '1', sender: 'musteri@x.com', subject: 'Teklif', body: 'icerik', received_at: '2026-06-01', processed: false },
          { id: '2', sender: 'baska@y.com', subject: 'Spam', body: 'z', received_at: '2026-06-02', processed: true },
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(builder);
    const r = await gmail_list_recent.handler({ query: 'from:musteri@x.com' }, ctx);
    expect(mockFrom).toHaveBeenCalledWith('inbox_messages');
    expect(builder.eq).toHaveBeenCalledWith('source', 'gmail');
    expect(r.ok).toBe(true);
    expect(r.count).toBe(1);
    expect(r.messages[0].from).toBe('musteri@x.com');
  });
});

describe('WhatsApp — canli', () => {
  it('whatsapp_send duz metin gonderir', async () => {
    (sendWhatsApp as jest.Mock).mockResolvedValueOnce({ ok: true, result: { wamid: 'w1' } });
    const r = await whatsapp_send.handler({ phone: '+905551112233', message: 'Servis tamam' }, ctx);
    expect(r.ok).toBe(true);
    expect(sendWhatsApp).toHaveBeenCalledWith(expect.objectContaining({ to: '+905551112233', message: 'Servis tamam' }));
  });

  it('whatsapp_send sablon parametrelerini components body parameters listesine maps', async () => {
    (sendWhatsApp as jest.Mock).mockResolvedValueOnce({ ok: true });
    await whatsapp_send.handler({ phone: '+90555', message: 'x', templateName: 'onay', templateParams: ['Ali', '1500'] }, ctx);
    const arg = (sendWhatsApp as jest.Mock).mock.calls[0][0];
    expect(arg.template.name).toBe('onay');
    expect(arg.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Ali' }, { type: 'text', text: '1500' },
    ]);
  });

  it('whatsapp_send destructive (onay gerektirir)', () => {
    expect(whatsapp_send.destructive).toBe(true);
  });
});

describe('Parasut / Drive — hala stub (durust)', () => {
  it('parasut_create_invoice configured:false doner', async () => {
    const r = await parasut_create_invoice.handler({ customerName: 'ABC', lines: [] }, ctx);
    expect(r.ok).toBe(false);
    expect(r.configured).toBe(false);
    expect(r.provider).toBe('Paraşüt');
  });
  it('gdrive_search configured:false doner', async () => {
    const r = await gdrive_search.handler({ q: 'teklif' }, ctx);
    expect(r.ok).toBe(false);
    expect(r.configured).toBe(false);
    expect(r.provider).toBe('Google Drive');
  });
});
