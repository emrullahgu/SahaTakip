// ====================================================================
// isWriteQueued — offline yazma dürüstlüğü sözleşmesi (Gereksinim 3)
// ====================================================================
// Bir yazma DB'ye mi gitti yoksa yalnız yerel kuyruğa mı alındı? Üst katman
// (AppContext/AI ajan) "kaydedildi" yerine "kuyruğa alındı" diyebilmek için bunu
// önceden bilmeli. Bu test, kuyruğa-alma koşulunu kilitler:
//   queued = çevrimdışı/yapılandırılmamış (isOnlineMode=false) VEYA id UUID değil.

import { isWriteQueued, setRuntimeOnline } from '../data/repository';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const LOCAL_ID = 'Q-2026-LOCAL-1';

describe('isWriteQueued (offline yazma dürüstlüğü)', () => {
  const savedUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const savedKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = savedUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = savedKey;
    setRuntimeOnline(true);
  });

  test('çevrimiçi + UUID id → DB yazılır, queued DEĞİL', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    setRuntimeOnline(true);
    expect(isWriteQueued(UUID)).toBe(false);
  });

  test('çevrimiçi ama yerel (UUID olmayan) id → kuyruğa alınır (drain UUID üretir)', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    setRuntimeOnline(true);
    expect(isWriteQueued(LOCAL_ID)).toBe(true);
  });

  test('çevrimdışı → UUID olsa bile kuyruğa alınır (sunucuda DEĞİL)', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    setRuntimeOnline(false);
    expect(isWriteQueued(UUID)).toBe(true);
  });

  test('Supabase yapılandırılmamış → her zaman kuyruğa alınır', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    setRuntimeOnline(true);
    expect(isWriteQueued(UUID)).toBe(true);
  });
});
