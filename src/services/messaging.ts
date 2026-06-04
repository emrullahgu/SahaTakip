// messaging.ts — #4 Kullanıcılar arası + grup mesajlaşma (dosya ekli).
// conversations / conversation_participants / messages tablolari + chat-attachments
// bucket. RLS yalniz katilimcilara izin verir. Yeni mesajda diger katilimcilara
// bildirim (notifyUsers) gider.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { supabase, SUPABASE_CONFIGURED, getCurrentUser } from './supabase';
import { notifyUsers } from './notifications';

const ATTACH_BUCKET = 'chat-attachments';

export interface Conversation {
  id: string;
  title?: string;
  isGroup: boolean;
  createdBy: string;
  lastMessageAt: string;
  // türetilmiş (liste için)
  participantNames?: string[];
  displayTitle?: string;
}
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  body?: string;
  attachmentUrl?: string;   // depolanan path
  attachmentType?: 'image' | 'pdf' | 'file';
  attachmentName?: string;
  createdAt: string;
}
export interface ChatUser { id: string; fullName: string }

const convFromRow = (r: any): Conversation => ({
  id: r.id, title: r.title ?? undefined, isGroup: !!r.is_group,
  createdBy: r.created_by, lastMessageAt: r.last_message_at,
});
const msgFromRow = (r: any): ChatMessage => ({
  id: r.id, conversationId: r.conversation_id, senderId: r.sender_id,
  body: r.body ?? undefined, attachmentUrl: r.attachment_url ?? undefined,
  attachmentType: r.attachment_type ?? undefined, attachmentName: r.attachment_name ?? undefined,
  createdAt: r.created_at,
});

/** Sohbet için seçilebilecek kullanıcılar (profiles). */
export async function listChatUsers(): Promise<ChatUser[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const me = await getCurrentUser();
  const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name');
  if (error) { console.warn('[chat.users]', error.message); return []; }
  return (data ?? [])
    .filter((u: any) => u.id !== me?.id)
    .map((u: any) => ({ id: u.id, fullName: u.full_name || 'Kullanıcı' }));
}

/** Kullanıcının dahil olduğu sohbetler (son mesaja göre sıralı). */
export async function listConversations(): Promise<Conversation[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const me = await getCurrentUser();
  if (!me) return [];
  // Önce katıldığım conversation id'leri
  const { data: parts } = await supabase
    .from('conversation_participants').select('conversation_id').eq('user_id', me.id);
  const ids = (parts ?? []).map((p: any) => p.conversation_id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('conversations').select('*').in('id', ids).order('last_message_at', { ascending: false });
  if (error) { console.warn('[chat.convs]', error.message); return []; }
  const convs = (data ?? []).map(convFromRow);
  // Katılımcı adlarını çek (başlık için)
  const { data: allParts } = await supabase
    .from('conversation_participants').select('conversation_id, user_id').in('conversation_id', ids);
  const { data: profs } = await supabase.from('profiles').select('id, full_name');
  const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || 'Kullanıcı']));
  for (const c of convs) {
    const others = (allParts ?? [])
      .filter((p: any) => p.conversation_id === c.id && p.user_id !== me.id)
      .map((p: any) => nameById.get(p.user_id) || 'Kullanıcı');
    c.participantNames = others;
    c.displayTitle = c.isGroup ? (c.title || `Grup (${others.length + 1})`) : (others[0] || 'Sohbet');
  }
  return convs;
}

/** İki kişilik sohbeti bul ya da oluştur. */
export async function getOrCreateDirect(otherUserId: string): Promise<string | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  // Mevcut birebir sohbeti bul (her ikisinin de katılımcı olduğu, grup olmayan)
  const { data: mine } = await supabase
    .from('conversation_participants').select('conversation_id').eq('user_id', me.id);
  const myIds = (mine ?? []).map((p: any) => p.conversation_id);
  if (myIds.length) {
    const { data: shared } = await supabase
      .from('conversation_participants').select('conversation_id')
      .eq('user_id', otherUserId).in('conversation_id', myIds);
    for (const s of shared ?? []) {
      const { data: c } = await supabase.from('conversations').select('id, is_group').eq('id', s.conversation_id).single();
      if (c && !c.is_group) return c.id;
    }
  }
  // Yoksa oluştur
  const { data: conv, error } = await supabase
    .from('conversations').insert({ is_group: false }).select().single();
  if (error || !conv) { console.warn('[chat.direct]', error?.message); return null; }
  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: me.id },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);
  return conv.id;
}

/** Grup sohbeti oluştur. */
export async function createGroup(title: string, userIds: string[]): Promise<string | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data: conv, error } = await supabase
    .from('conversations').insert({ is_group: true, title: title.trim() || 'Grup' }).select().single();
  if (error || !conv) { console.warn('[chat.group]', error?.message); return null; }
  const members = Array.from(new Set([me.id, ...userIds]));
  await supabase.from('conversation_participants').insert(
    members.map(uid => ({ conversation_id: conv.id, user_id: uid })));
  return conv.id;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from('messages').select('*').eq('conversation_id', conversationId)
    .order('created_at', { ascending: true }).limit(500);
  if (error) { console.warn('[chat.msgs]', error.message); return []; }
  const msgs = (data ?? []).map(msgFromRow);
  // Gönderen adları
  const { data: profs } = await supabase.from('profiles').select('id, full_name');
  const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || 'Kullanıcı']));
  for (const m of msgs) m.senderName = nameById.get(m.senderId) || 'Kullanıcı';
  return msgs;
}

/** Dosya ekini chat-attachments bucket'ına yükle, path döner. */
export async function uploadChatAttachment(localUri: string, fileName?: string): Promise<{ path: string; type: ChatMessage['attachmentType']; name: string } | null> {
  if (!SUPABASE_CONFIGURED || !localUri) return null;
  const me = await getCurrentUser();
  const lower = (fileName || localUri).toLowerCase();
  const type: ChatMessage['attachmentType'] =
    /\.(png|jpe?g|gif|webp|heic)$/.test(lower) ? 'image' : /\.pdf$/.test(lower) ? 'pdf' : 'file';
  const ext = (lower.match(/\.([a-z0-9]+)$/)?.[1]) || (type === 'image' ? 'jpg' : 'bin');
  const contentType = type === 'image' ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : type === 'pdf' ? 'application/pdf' : 'application/octet-stream';
  const path = `${me?.id ?? 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  let buf: ArrayBuffer | Buffer;
  if (Platform.OS === 'web' || localUri.startsWith('http') || localUri.startsWith('blob:') || localUri.startsWith('data:')) {
    buf = await (await fetch(localUri)).arrayBuffer();
  } else {
    const b64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    buf = Buffer.from(b64, 'base64');
  }
  const { error } = await supabase.storage.from(ATTACH_BUCKET).upload(path, buf as any, { contentType, upsert: false });
  if (error) { console.warn('[chat.upload]', error.message); throw new Error(error.message); }
  return { path, type, name: fileName || path.split('/').pop() || 'dosya' };
}

/** Ek için geçici imzalı URL (private bucket). */
export async function attachmentSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(ATTACH_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Mesaj gönder (opsiyonel ek) + diğer katılımcılara bildirim. */
export async function sendMessage(
  conversationId: string,
  body: string,
  attachment?: { path: string; type: ChatMessage['attachmentType']; name: string },
): Promise<ChatMessage | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data, error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    body: body.trim() || null,
    attachment_url: attachment?.path ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_name: attachment?.name ?? null,
  }).select().single();
  if (error) { console.warn('[chat.send]', error.message); throw new Error(error.message); }
  // last_message_at güncelle
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  // Diğer katılımcılara bildirim
  try {
    const { data: parts } = await supabase
      .from('conversation_participants').select('user_id').eq('conversation_id', conversationId);
    const others = (parts ?? []).map((p: any) => p.user_id).filter((id: string) => id !== me.id);
    if (others.length) {
      const preview = attachment ? `📎 ${attachment.name}` : body.slice(0, 80);
      void notifyUsers({ userIds: others }, 'custom', 'Yeni Mesaj', preview, conversationId).catch(() => {});
    }
  } catch { /* sessiz */ }
  return data ? msgFromRow(data) : null;
}
