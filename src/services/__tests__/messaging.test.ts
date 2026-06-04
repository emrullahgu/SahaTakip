// messaging — temel API + offline güvenli davranış
import * as messaging from '../messaging';

describe('messaging servisi', () => {
  it('beklenen fonksiyonları export eder', () => {
    for (const fn of ['listConversations', 'listChatUsers', 'getOrCreateDirect', 'createGroup', 'listMessages', 'sendMessage', 'uploadChatAttachment', 'attachmentSignedUrl']) {
      expect(typeof (messaging as any)[fn]).toBe('function');
    }
  });

  it('SUPABASE yapılandırılmamışsa liste fonksiyonları boş döner (çökmez)', async () => {
    await expect(messaging.listConversations()).resolves.toEqual([]);
    await expect(messaging.listChatUsers()).resolves.toEqual([]);
    await expect(messaging.listMessages('x')).resolves.toEqual([]);
  });
});
