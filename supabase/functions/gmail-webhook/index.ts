// supabase/functions/gmail-webhook/index.ts
// Gmail Push Notification (Pub/Sub) webhook scaffold.
//
// SETUP (one-time):
//   1. Google Cloud Console → enable Gmail API + Pub/Sub.
//   2. Create Pub/Sub topic `gmail-saha`.
//   3. Grant gmail-api-push@system.gserviceaccount.com "Pub/Sub Publisher".
//   4. Authorize a user, call gmail.users.watch({ topicName, labelIds: ['INBOX'] }).
//   5. Pub/Sub push subscription → POST this function URL.
//
// Pub/Sub sends: { message: { data: base64({ emailAddress, historyId }), messageId } }
// We then call Gmail API history.list since last historyId to fetch new messages.
//
// For MVP scaffold we just store the raw notification; full Gmail OAuth + history
// fetch should be implemented with a service account or refresh token stored in
// app_settings.google_oauth.
//
// Deploy:  supabase functions deploy gmail-webhook --no-verify-jwt
// Env:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GMAIL_REFRESH_TOKEN (later)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface PubSubEnvelope {
  message: { data: string; messageId: string; publishTime: string };
  subscription: string;
}

async function fetchLatestMessages(emailAddress: string, _historyId: string) {
  // TODO: implement Gmail API call with OAuth refresh token.
  // For now we just return an empty list — operator will paste manually
  // until OAuth is wired.
  return [] as Array<{ id: string; from: string; subject: string; body: string; date: string }>;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const env: PubSubEnvelope = await req.json();
    const decoded = JSON.parse(atob(env.message.data));
    const { emailAddress, historyId } = decoded;

    const messages = await fetchLatestMessages(emailAddress, historyId);

    if (messages.length === 0) {
      // Just record the notification so we can audit later.
      await supabase.from('inbox_messages').insert({
        source: 'gmail',
        external_id: `notify-${env.message.messageId}`,
        sender: emailAddress,
        subject: '(Gmail bildirim — içerik çekilmedi)',
        body: `historyId=${historyId}`,
        metadata: { raw: decoded },
      });
    } else {
      const rows = messages.map((m) => ({
        source: 'gmail',
        external_id: m.id,
        sender: m.from,
        subject: m.subject,
        body: m.body,
        received_at: m.date,
        metadata: { emailAddress },
      }));
      await supabase.from('inbox_messages').upsert(rows, { onConflict: 'source,external_id' });
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('gmail-webhook error', e);
    return new Response('error', { status: 500 });
  }
});
