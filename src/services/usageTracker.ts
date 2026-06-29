// usageTracker.ts — Uygulama kullanım takibi (kim ne kadar kullanmış) + skor.
// İstemci yerelde günlük sayaç tamponlar; periyodik (debounce) ATOMİK olarak
// bump_app_usage RPC ile sunucuya yazar. Yönetici/müdür leaderboard'da herkesi görür.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const BUF_KEY = 'app_usage_buffer_v1';
type UsageKind = 'screen' | 'action' | 'session';
interface Buffer { date: string; screens: number; actions: number; sessions: number; }

let ctxName: string | undefined;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
// Tüm tampon okuma-değiştirme-yazma işlemleri TEK zincirde serileştirilir → read-modify-write
// yarışı (kayıp artış) imkânsız. record ile flush asla iç içe geçmez.
let chain: Promise<void> = Promise.resolve();
function enqueue(fn: () => Promise<void>): Promise<void> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function emptyBuf(): Buffer { return { date: today(), screens: 0, actions: 0, sessions: 0 }; }

/** Depodaki tamponu OLDUĞU GİBİ döndürür (eski tarihi ATMAZ — gün dönümü ayrı ele alınır). */
async function readBufRaw(): Promise<Buffer> {
  try { const raw = await AsyncStorage.getItem(BUF_KEY); return raw ? JSON.parse(raw) as Buffer : emptyBuf(); }
  catch { return emptyBuf(); }
}
async function writeBuf(b: Buffer): Promise<void> { try { await AsyncStorage.setItem(BUF_KEY, JSON.stringify(b)); } catch { /* sessiz */ } }

/** Tamponu KENDİ tarihiyle sunucuya yaz; başarılıysa sayaçlarını sıfırla (b'yi mutasyona uğratır).
 *  Zincir içinde çağrıldığından eşzamanlı artış araya giremez (delta kaybı yok). */
async function pushBuffer(b: Buffer): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return false;
  if (b.screens === 0 && b.actions === 0 && b.sessions === 0) return true;
  try {
    const { error } = await supabase.rpc('bump_app_usage', {
      p_screens: b.screens, p_actions: b.actions, p_sessions: b.sessions, p_name: ctxName ?? null, p_date: b.date,
    });
    if (error) return false;            // başarısız → sayaçlar korunur (retry)
    b.screens = 0; b.actions = 0; b.sessions = 0;
    return true;
  } catch { return false; }             // offline → koru
}

/** Aktif kullanıcı adını ayarla (RPC'ye user_name olarak geçer). Profil yüklenince çağır. */
export function setUsageUser(name?: string | null): void { ctxName = name || undefined; }

/** Bir kullanım olayı kaydet (serileştirilmiş; gün dönümünde eski günü ÖNCE flush eder). */
export async function recordUsage(kind: UsageKind, _label?: string): Promise<void> {
  await enqueue(async () => {
    let b = await readBufRaw();
    if (b.date !== today()) {
      await pushBuffer(b);              // eski günü kendi tarihiyle sunucuya yaz (veri kaybı yok)
      b = emptyBuf();
    }
    if (kind === 'screen') b.screens += 1;
    else if (kind === 'action') b.actions += 1;
    else b.sessions += 1;
    await writeBuf(b);
  });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { flushUsage().catch(() => {}); }, 20000);
}

/** Tamponu sunucuya yaz (atomik artış, doğru tarih). Başarısızsa korur (retry). */
export async function flushUsage(): Promise<void> {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  await enqueue(async () => {
    const b = await readBufRaw();
    await pushBuffer(b);                // başarıda sayaçları sıfırlar (b mutasyon)
    await writeBuf(b);
  });
}

// =============================================================
// OKUMA + SKOR
// =============================================================
export interface UsageScore {
  userId: string;
  name: string;
  activeDays: number;
  screens: number;
  actions: number;
  sessions: number;
  lastActive: string;
  score: number;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Engagement skoru: aktif gün + oturum ağırlıklı (şeffaf, takip edilebilir). */
export function computeScore(u: { activeDays: number; sessions: number; actions: number; screens: number }): number {
  return Math.round(u.activeDays * 10 + u.sessions * 5 + u.actions * 1 + u.screens * 0.5);
}

/** Son N günün kullanımını kullanıcı başına toplar + skorlar (RLS: yönetici hepsi / diğer kendi). */
export async function listUsage(days = 30): Promise<UsageScore[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const since = daysAgoIso(days);
  const { data, error } = await supabase.from('app_usage').select('*').gte('date', since);
  if (error || !data) return [];
  const byUser = new Map<string, UsageScore & { _dates: Set<string> }>();
  for (const r of data as any[]) {
    const id = r.user_id as string;
    let u = byUser.get(id);
    if (!u) { u = { userId: id, name: r.user_name || 'Kullanıcı', activeDays: 0, screens: 0, actions: 0, sessions: 0, lastActive: r.last_active || '', score: 0, _dates: new Set() }; byUser.set(id, u); }
    u.screens += r.screen_views || 0;
    u.actions += r.actions || 0;
    u.sessions += r.sessions || 0;
    u._dates.add(r.date);
    if (r.user_name) u.name = r.user_name;
    if ((r.last_active || '') > u.lastActive) u.lastActive = r.last_active || '';
  }
  const out: UsageScore[] = [];
  byUser.forEach(u => {
    u.activeDays = u._dates.size;
    u.score = computeScore(u);
    const { _dates, ...rest } = u;
    out.push(rest);
  });
  return out.sort((a, b) => b.score - a.score);
}
