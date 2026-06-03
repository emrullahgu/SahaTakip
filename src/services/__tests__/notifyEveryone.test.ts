// notifyEveryone — "her iş herkese bildirim" yayını notify-push'a all:true ile gider.
const mockInvoke = jest.fn(async () => ({ data: { sent: 5 }, error: null }));

jest.mock('../supabase', () => ({
  SUPABASE_CONFIGURED: true,
  supabase: { functions: { invoke: (...a: any[]) => mockInvoke(...a) } },
  getCurrentUser: jest.fn(async () => ({ id: 'actor-123' })),
}));

import { notifyEveryone, notifyUsers } from '../notifications';

beforeEach(() => mockInvoke.mockClear());

describe('notifyEveryone', () => {
  it('notify-push fonksiyonunu all:true ve işlemi yapanı hariç tutarak çağırır', async () => {
    const res = await notifyEveryone('work_order_created', 'Yeni İş Emri', 'Müşteri — Servis', 'wo-1');
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(5);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [fn, opts] = mockInvoke.mock.calls[0] as any[];
    expect(fn).toBe('notify-push');
    expect(opts.body.all).toBe(true);
    expect(opts.body.excludeUserId).toBe('actor-123'); // kendi işine bildirim gitmez
    expect(opts.body.title).toBe('Yeni İş Emri');
    expect(opts.body.relatedId).toBe('wo-1');
  });

  it('notifyUsers hedef yoksa (all/userIds/userNames hiçbiri) çağırmaz', async () => {
    const res = await notifyUsers({}, 'custom', 'X', 'Y');
    expect(res.ok).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
