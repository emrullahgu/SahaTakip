// src/services/channels.ts
// WhatsApp / Gmail / Google Chat dış kanallar için tek-noktadan istemci.
// Edge functions: whatsapp-send, gmail-send, gchat-send

import { supabase, SUPABASE_CONFIGURED } from './supabase';

function ensure(): void {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase yapılandırılmamış — kanal mesajları kullanılamıyor.');
}

export interface ChannelResult {
  ok: boolean;
  result?: any;
  error?: string;
}

/** WhatsApp Business mesajı. */
export async function sendWhatsApp(opts: {
  to: string;
  message?: string;
  template?: { name: string; language?: string; components?: any[] };
  relatedType?: string;
  relatedId?: string;
}): Promise<ChannelResult> {
  ensure();
  const { data, error } = await supabase.functions.invoke('whatsapp-send', {
    body: {
      to: opts.to,
      message: opts.message,
      template: opts.template,
      related_type: opts.relatedType,
      related_id: opts.relatedId,
    },
  });
  if (error) return { ok: false, error: error.message };
  return data as ChannelResult;
}

/** Gmail e-posta. */
export async function sendGmail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  relatedType?: string;
  relatedId?: string;
}): Promise<ChannelResult> {
  ensure();
  const { data, error } = await supabase.functions.invoke('gmail-send', {
    body: {
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      cc: opts.cc,
      bcc: opts.bcc,
      related_type: opts.relatedType,
      related_id: opts.relatedId,
    },
  });
  if (error) return { ok: false, error: error.message };
  return data as ChannelResult;
}

/** Google Chat (incoming webhook). */
export async function sendGoogleChat(opts: {
  space?: string;     // 'default' veya GCHAT_WEBHOOK_<NAME> suffix
  text?: string;
  cardsV2?: any[];
  relatedType?: string;
  relatedId?: string;
}): Promise<ChannelResult> {
  ensure();
  const { data, error } = await supabase.functions.invoke('gchat-send', {
    body: {
      space: opts.space ?? 'default',
      text: opts.text,
      cardsV2: opts.cardsV2,
      related_type: opts.relatedType,
      related_id: opts.relatedId,
    },
  });
  if (error) return { ok: false, error: error.message };
  return data as ChannelResult;
}

/** Tek seferde birden fazla kanala broadcast. */
export async function broadcast(opts: {
  text: string;
  whatsapp?: string[];     // telefon listesi
  emails?: { to: string; subject: string }[];
  gchatSpaces?: string[];  // ['default','OPERASYON']
}): Promise<{ ok: boolean; details: any[] }> {
  const details: any[] = [];
  for (const to of opts.whatsapp ?? []) {
    details.push({ channel: 'whatsapp', to, ...(await sendWhatsApp({ to, message: opts.text })) });
  }
  for (const e of opts.emails ?? []) {
    details.push({ channel: 'gmail', to: e.to, ...(await sendGmail({ to: e.to, subject: e.subject, text: opts.text })) });
  }
  for (const space of opts.gchatSpaces ?? []) {
    details.push({ channel: 'gchat', space, ...(await sendGoogleChat({ space, text: opts.text })) });
  }
  return { ok: details.every(d => d.ok), details };
}
