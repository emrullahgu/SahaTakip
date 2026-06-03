// pushNotifications.test.ts — Expo uzak push (sendRemotePush) testleri
import { isExpoPushToken, buildExpoMessages, sendRemotePush } from '../pushNotifications';

const TOK = (n: number) => `ExponentPushToken[token${n}]`;

describe('isExpoPushToken', () => {
  it('geçerli Expo token formatlarını tanır', () => {
    expect(isExpoPushToken('ExponentPushToken[abcDEF123]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[xyz]')).toBe(true);
  });
  it('geçersizleri reddeder', () => {
    expect(isExpoPushToken('rastgele')).toBe(false);
    expect(isExpoPushToken('')).toBe(false);
    expect(isExpoPushToken(null)).toBe(false);
    expect(isExpoPushToken(undefined)).toBe(false);
  });
});

describe('buildExpoMessages', () => {
  it('geçersiz token\'ları eler ve tekilleştirir', () => {
    const batches = buildExpoMessages(['gecersiz', TOK(1), TOK(1)], 'B', 'G');
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1); // tekil + sadece geçerli
    expect(batches[0][0]).toMatchObject({ to: TOK(1), title: 'B', body: 'G', sound: 'default', channelId: 'default' });
  });

  it('100\'erli batch\'lere böler', () => {
    const tokens = Array.from({ length: 150 }, (_, i) => TOK(i));
    const batches = buildExpoMessages(tokens, 'B', 'G');
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(100);
    expect(batches[1]).toHaveLength(50);
  });

  it('hiç geçerli token yoksa boş döner', () => {
    expect(buildExpoMessages(['x', 'y'], 'B', 'G')).toEqual([]);
  });
});

describe('sendRemotePush', () => {
  let mockFetch: jest.Mock;
  beforeEach(() => { mockFetch = jest.fn(); global.fetch = mockFetch; });

  it('ticket sonuçlarını sent/failed olarak özetler', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'ok' }, { status: 'error', message: 'DeviceNotRegistered' }] }),
    });
    const r = await sendRemotePush([TOK(1), TOK(2)], 'Başlık', 'Gövde', { workOrderId: 'wo1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://exp.host/--/api/v2/push/send');
    expect(r.sent).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.errors).toContain('DeviceNotRegistered');
  });

  it('geçerli token yoksa fetch çağırmaz', async () => {
    const r = await sendRemotePush(['gecersiz'], 'B', 'G');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(r).toEqual({ sent: 0, failed: 0, errors: [] });
  });

  it('HTTP hatasında batch\'i failed sayar', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502, json: () => Promise.resolve({}) });
    const r = await sendRemotePush([TOK(1)], 'B', 'G');
    expect(r.sent).toBe(0);
    expect(r.failed).toBe(1);
    expect(r.errors[0]).toContain('502');
  });

  it('150 token → 2 fetch çağrısı (batch)', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    const tokens = Array.from({ length: 150 }, (_, i) => TOK(i));
    await sendRemotePush(tokens, 'B', 'G');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
