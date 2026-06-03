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

  let payload: any;
  try { payload = await req.json(); } catch { return json({ ok: false, error: 'Geçersiz JSON' }, 400); }

  const { userIds = [], userNames = [], type = 'custom', title, body, relatedId = null } = payload ?? {};
  if (!title || !body) return json({ ok: false, error: 'title ve body zorunlu' }, 400);

  // 1) Hedef user id setini topla
  const targetIds = new Set<string>(Array.isArray(userIds) ? userIds : []);
  if (Array.isArray(userNames) && userNames.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('full_name', userNames);
    for (const p of profs ?? []) targetIds.add(p.id);
  }
  const ids = Array.from(targetIds);
  if (!ids.length) return json({ ok: true, sent: 0, targets: 0, note: 'Eşleşen kullanıcı yok' });

  // 2) Token'ları topla (push_tokens + fallback notification_preferences)
  const tokens: string[] = [];
  const { data: pt } = await supabase.from('push_tokens').select('token').in('user_id', ids);
  for (const r of pt ?? []) if (r?.token) tokens.push(r.token);
  const { data: np } = await supabase.from('notification_preferences').select('push_token').in('user_id', ids);
  for (const r of np ?? []) if (r?.push_token) tokens.push(r.push_token);

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

  return json({ ok: true, sent, targets: ids.length, tokens: tokens.length, errors });
});
