// supabase/functions/notify-push/index.ts
// Cross-user push bildirimi — atama vb. olaylarında HEDEF kullanıcının cihazına
// bildirim gönderir. Service role ile RLS'i aşar:
//   1) userIds / userNames → hedef auth user id'lerini çöz
//   2) push_tokens (+ fallback notification_preferences.push_token) → Expo token'lar
//   3) Expo Push API ile gönder (100'erli batch)
//   4) Her hedef user_id için notifications satırı yaz (in-app bildirim merkezi)
//
// Body: { userIds?: string[], userNames?: string[], type, title, body, relatedId? }
// Resp: { ok, sent, targets, errors }
//
// Deploy:  supabase functions deploy notify-push
// Env:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireUser } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(t: unknown): t is string {
  return typeof t === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(t.trim());
}

// E-posta YALNIZ kritik olaylarda gönderilir — "her iş herkese" yayınında tüm
// ekibe koşulsuz e-posta KVKK/spam riski. (channel_enabled.email DEFAULT false.)
const CRITICAL_EMAIL_TYPES = new Set(['sla_breach', 'quote_accepted', 'payment_received']);

// Kullanıcı push kanalını kapatmış mı? Tercih satırı yoksa varsayılan AÇIK
// (channel_enabled DEFAULT {"push":true}). event_channels[type] tanımlıysa
// olay-bazlı matris kazanır.
function pushEnabled(pref: any, evType: string): boolean {
  if (!pref) return true;
  const ch = pref.channel_enabled ?? {};
  const ev = pref.event_channels ?? {};
  const list = ev[evType];
  if (Array.isArray(list) && list.length) return list.includes('push');
  return ch.push !== false;
}

// E-posta kanalı açık mı? DEFAULT false → opt-in olmayan kullanıcıya gönderilmez.
function emailEnabled(pref: any, evType: string): boolean {
  if (!pref) return false;
  const ch = pref.channel_enabled ?? {};
  const ev = pref.event_channels ?? {};
  const list = ev[evType];
  if (Array.isArray(list) && list.length) return list.includes('email');
  return ch.email === true;
}

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

async function sendExpo(tokens: string[], title: string, body: string, data: Record<string, unknown>) {
  const valid = Array.from(new Set(tokens.filter(isExpoPushToken)));
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100).map(to => ({
      to, title, body, data, sound: 'default', channelId: 'default',
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const j = await res.json().catch(() => ({}));
      for (const t of (j?.data ?? [])) {
        if (t?.status === 'ok') sent++;
        else if (t?.message) errors.push(t.message);
      }
    } catch (e) {
      errors.push(String((e as Error)?.message ?? e));
    }
  }
  return { sent, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST gerekli' }, 405);

  // Kimlik: anonim/kimliksiz çağrı reddedilir — önceden herkes (kimliksiz) TÜM
  // kullanıcılara push/e-posta spam'i atabiliyordu (service_role ile RLS aşılıyor).
  const auth = await requireUser(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ ok: false, error: 'Geçersiz JSON' }, 400); }

  const { userIds = [], userNames = [], all = false, excludeUserId = null, email = false, type = 'custom', title, body, relatedId = null } = payload ?? {};
  if (!title || !body) return json({ ok: false, error: 'title ve body zorunlu' }, 400);
  // NOT: all=true yayını "her iş herkese bildirim" tasarımının parçası ve field
  // kullanıcılarınca da tetiklenir → role-gate EDİLMEZ. Kimlik kontrolü (yukarıda)
  // anonim suistimali zaten kapatır; rol bazlı sıkılaştırma ayrı bir karar.

  // 1) Hedef user id setini topla
  const targetIds = new Set<string>(Array.isArray(userIds) ? userIds : []);
  if (Array.isArray(userNames) && userNames.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('full_name', userNames);
    for (const p of profs ?? []) targetIds.add(p.id);
  }
  // all=true → TÜM kullanıcılara yayın (her iş herkese bildirim). İşlemi yapan
  // kişiyi (excludeUserId) hariç tutabilir — kendi yaptığı işe bildirim gitmesin.
  if (all === true) {
    const { data: everyone } = await supabase.from('profiles').select('id');
    for (const p of everyone ?? []) targetIds.add(p.id);
  }
  if (excludeUserId) targetIds.delete(excludeUserId);
  const ids = Array.from(targetIds);
  if (!ids.length) return json({ ok: true, sent: 0, targets: 0, note: 'Eşleşen kullanıcı yok' });

  // 1.5) Bildirim tercihlerini çek (kanal opt-out + olay matrisi) → user_id bazlı map
  const prefById = new Map<string, any>();
  {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, push_token, channel_enabled, event_channels')
      .in('user_id', ids);
    for (const p of prefs ?? []) if (p?.user_id) prefById.set(p.user_id, p);
  }

  // 2) Token'ları topla (push_tokens + fallback notification_preferences) — YALNIZ
  // push kanalı AÇIK olan kullanıcıların token'ları. Opt-out edene token toplanmaz.
  const tokens: string[] = [];
  const { data: pt } = await supabase.from('push_tokens').select('user_id, token').in('user_id', ids);
  for (const r of pt ?? []) {
    if (r?.token && pushEnabled(prefById.get(r.user_id), type)) tokens.push(r.token);
  }
  for (const uid of ids) {
    const pref = prefById.get(uid);
    if (pref?.push_token && pushEnabled(pref, type)) tokens.push(pref.push_token);
  }

  // 3) Expo push
  const { sent, errors } = await sendExpo(tokens, title, body, { type, relatedId });

  // 4) Her hedef user için in-app bildirim satırı
  const rows = ids.map(uid => ({
    user_id: uid,
    type,
    title,
    message: body,
    channels: ['push'],
    related_id: relatedId,
    read: false,
  }));
  const { error: insErr } = await supabase.from('notifications').insert(rows);
  if (insErr) errors.push(`notifications insert: ${insErr.message}`);

  // 5) E-POSTA yayını: YALNIZ kritik olay tiplerinde VE e-posta kanalını açmış
  // (opt-in) kullanıcılara. Aksi halde "her iş herkese" yayını tüm ekibe koşulsuz
  // e-posta = KVKK/spam. RESEND_API_KEY yoksa sessizce atlanır (push + in-app çalışır).
  let emailsSent = 0;
  const emailAllowed = payload.email === true && CRITICAL_EMAIL_TYPES.has(type);
  if (emailAllowed) {
    try {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      // Yalnız e-posta kanalı açık (opt-in) kullanıcı id'leri.
      const optInIds = new Set(ids.filter(uid => emailEnabled(prefById.get(uid), type)));
      if (resendKey && optInIds.size) {
        const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emails = (list?.users ?? [])
          .filter((u: any) => optInIds.has(u.id) && u.email)
          .map((u: any) => u.email as string);
        if (emails.length) {
          const from = Deno.env.get('RESEND_FROM') || 'SahaTakip <onboarding@resend.dev>';
          // bcc ile gönder → alıcılar birbirini görmez (gizlilik).
          // GÜVENLİK: title/body kullanıcı girdisi → HTML'e kaçışsız gömülürse e-posta
          // HTML/phishing enjeksiyonu (authenticated kullanıcı <a>/<img> sokabilir). Escape et.
          const esc = (x: unknown) => String(x ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from, to: [from], bcc: emails,
              subject: esc(title),
              html: `<div style="font-family:Arial,sans-serif"><h3 style="color:#1e40af">${esc(title)}</h3><p>${esc(body)}</p><p style="color:#888;font-size:12px">SahaTakip · KOBİNERJİ</p></div>`,
            }),
          });
          if (r.ok) emailsSent = emails.length;
          else errors.push(`resend: HTTP ${r.status}`);
        }
      }
    } catch (e) {
      errors.push(`email: ${String((e as Error)?.message ?? e)}`);
    }
  }

  return json({ ok: true, sent, targets: ids.length, tokens: tokens.length, emailsSent, errors });
});
