// usageTracker — kullanım skoru + offline davranış (SUPABASE_CONFIGURED=false).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeScore, recordUsage, flushUsage, listUsage, setUsageUser } from '../usageTracker';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('usageTracker', () => {
  test('computeScore formülü: aktif gün×10 + oturum×5 + aksiyon×1 + ekran×0.5', () => {
    expect(computeScore({ activeDays: 3, sessions: 4, actions: 10, screens: 20 })).toBe(3 * 10 + 4 * 5 + 10 + 20 * 0.5); // 70
    expect(computeScore({ activeDays: 0, sessions: 0, actions: 0, screens: 0 })).toBe(0);
  });

  test('computeScore yarım ekran puanını yuvarlar', () => {
    expect(computeScore({ activeDays: 0, sessions: 0, actions: 0, screens: 3 })).toBe(2); // 1.5 → 2
  });

  test('recordUsage çökmez, yerel tampona yazar (offline)', async () => {
    await expect(recordUsage('screen')).resolves.toBeUndefined();
    await expect(recordUsage('action')).resolves.toBeUndefined();
    await expect(recordUsage('session')).resolves.toBeUndefined();
    const raw = await AsyncStorage.getItem('app_usage_buffer_v1');
    expect(raw).toBeTruthy();
    const b = JSON.parse(raw as string);
    expect(b.screens).toBe(1);
    expect(b.actions).toBe(1);
    expect(b.sessions).toBe(1);
  });

  test('offline: flushUsage no-op, listUsage boş döner', async () => {
    setUsageUser('Test Kullanıcı');
    await recordUsage('screen');
    await expect(flushUsage()).resolves.toBeUndefined();
    // SUPABASE_CONFIGURED=false → sunucuya yazılmaz, tampon korunur
    const raw = await AsyncStorage.getItem('app_usage_buffer_v1');
    expect(JSON.parse(raw as string).screens).toBe(1);
    expect(await listUsage(30)).toEqual([]);
  });
});
