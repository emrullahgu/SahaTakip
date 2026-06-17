// secCenter.test.ts — KVKK gerçek erasure (RPC) dürüstlüğü
const mockRpc = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { rpc: (...args: any[]) => mockRpc(...args) },
}));

import { addErasureJob } from '../secCenter';

beforeEach(() => { mockRpc.mockReset(); });

describe('addErasureJob — KVKK gerçek silme', () => {
  it('full + userId: kvkk_erase_user RPC çağrılır, completed + toplam affectedRecords', async () => {
    mockRpc.mockResolvedValue({ data: { locations: 3, shifts: 2, checkins: 1, geofence_events: 0 }, error: null });
    const job = await addErasureJob('Ali Veli', 'full', 'uuid-1');
    expect(mockRpc).toHaveBeenCalledWith('kvkk_erase_user', { p_user: 'uuid-1' });
    expect(job.status).toBe('completed');
    expect(job.affectedRecords).toBe(6);
    expect(job.completedAt).toBeTruthy();
  });

  it('full + userId ama RPC hata dönerse: failed (sahte başarı yok)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    const job = await addErasureJob('Ali Veli', 'full', 'uuid-1');
    expect(job.status).toBe('failed');
  });

  it('userId yoksa RPC çağrılmaz, queued kalır (geriye uyum)', async () => {
    const job = await addErasureJob('Ali Veli', 'full');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(job.status).toBe('queued');
  });

  it('anonymize/partial kapsam gerçek silme yapmaz (RPC çağrılmaz)', async () => {
    const a = await addErasureJob('Ali', 'anonymize', 'uuid-1');
    const p = await addErasureJob('Ali', 'partial', 'uuid-1');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(a.status).toBe('queued');
    expect(p.status).toBe('queued');
  });
});
