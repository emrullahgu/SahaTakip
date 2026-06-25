// approvals — onay havuzu offline akışı (Faz5: sunucu + offline fallback)
// Test ortamında SUPABASE_CONFIGURED=false → AsyncStorage yolu çalışır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApproval, listApprovals, getApproval, decideApproval } from '../governance';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('governance approvals (offline yol)', () => {
  test('createApproval pending + UUID id döner, listede görünür', async () => {
    const a = await createApproval({ kind: 'discount', title: 'İskonto onayı', requestedBy: 'u1', requestedByName: 'Ali' });
    expect(a.status).toBe('pending');
    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i); // UUID
    const list = await listApprovals();
    expect(list.find(x => x.id === a.id)).toBeTruthy();
  });

  test('decideApproval durumu günceller (yerel cache)', async () => {
    const a = await createApproval({ kind: 'delete', title: 'Silme onayı' });
    await decideApproval(a.id, 'approved', 'mgr1', 'uygun', 'Müdür');
    const got = await getApproval(a.id);
    expect(got?.status).toBe('approved');
    expect(got?.decidedBy).toBe('mgr1');
  });
});
