// ososDelivery.test.ts — OSOS otomatik dağıtım kilidi (İş kuralı 3: otomatik e-posta YOK)
// Gözetimsiz çalıştırma (maybeRunAutoToday → runDailyAutomation()) kanallara GÖNDERMEMELİ;
// yalnız ELLE tetikleme (deliver:true) gönderir.

const mockBroadcast = jest.fn(async () => ({ ok: true, details: [] as any[] }));
jest.mock('../channels', () => ({ broadcast: (...a: any[]) => mockBroadcast(...a) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { runDailyAutomation, getAutoReportConfig, saveAutoReportConfig } from '../osos';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockBroadcast.mockClear();
});

describe('OSOS dağıtım kilidi (İş kuralı 3)', () => {
  it('deliver bayrağı OLMADAN broadcast çağrılmaz (gözetimsiz/otomatik yol)', async () => {
    const cfg = await getAutoReportConfig();
    await saveAutoReportConfig({ ...cfg, enabled: true, emails: ['a@b.com'] });
    const res = await runDailyAutomation({ force: true });
    expect(mockBroadcast).not.toHaveBeenCalled();
    expect(res.delivered).toBeNull();
  });

  it('deliver:true ile (elle tetikleme) broadcast çağrılır', async () => {
    const cfg = await getAutoReportConfig();
    await saveAutoReportConfig({ ...cfg, enabled: true, emails: ['a@b.com'] });
    await runDailyAutomation({ force: true, deliver: true });
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
  });
});
