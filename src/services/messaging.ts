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
  lastMessage?: string;
  unread?: number;
  avatarUrl?: string; // birebir sohbette karşı kişinin profil fotoğrafı
}
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  body?: string;
  attachmentUrl?: string;   // depolanan path
  attachmentType?: 'image' | 'pdf' | 'file';
  attachmentName?: string;
  createdAt: string;
}
export interface ChatUser { id: string; fullName: string; avatarUrl?: string }

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
  const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');
  if (error) { console.warn('[chat.users]', error.message); return []; }
  return (data ?? [])
    .filter((u: any) => u.id !== me?.id)
    .map((u: any) => ({ id: u.id, fullName: u.full_name || 'Kullanıcı', avatarUrl: u.avatar_url ?? undefined }));
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
  const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url');
  const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || 'Kullanıcı']));
  const avatarById = new Map((profs ?? []).map((p: any) => [p.id, p.avatar_url ?? undefined]));
  // Son mesaj önizleme + okunmamış sayısı için: her sohbetin son mesajı + benim last_read_at'ım
  const { data: myParts } = await supabase
    .from('conversation_participants').select('conversation_id, last_read_at').eq('user_id', me.id).in('conversation_id', ids);
  const lastReadById = new Map((myParts ?? []).map((p: any) => [p.conversation_id, p.last_read_at]));
  // Son 1 mesaj (önizleme) — her sohbet için ayrı çekmek yerine hepsini çekip grupla
  const { data: recentMsgs } = await supabase
    .from('messages').select('conversation_id, sender_id, body, attachment_name, created_at')
    .in('conversation_id', ids).is('deleted_at', null).order('created_at', { ascending: false }).limit(400);
  const lastByConv = new Map<string, any>();
  const unreadByConv = new Map<string, number>();
  for (const m of recentMsgs ?? []) {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    const lr = lastReadById.get(m.conversation_id);
    if (m.sender_id !== me.id && (!lr || new Date(m.created_at) > new Date(lr))) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) || 0) + 1);
    }
  }
  for (const c of convs) {
    const otherParts = (allParts ?? []).filter((p: any) => p.conversation_id === c.id && p.user_id !== me.id);
    const others = otherParts.map((p: any) => nameById.get(p.user_id) || 'Kullanıcı');
    c.participantNames = others;
    c.displayTitle = c.isGroup ? (c.title || `Grup (${others.length + 1})`) : (others[0] || 'Sohbet');
    if (!c.isGroup && otherParts[0]) c.avatarUrl = avatarById.get(otherParts[0].user_id) || undefined;
    const lm = lastByConv.get(c.id);
    c.lastMessage = lm ? (lm.body || (lm.attachment_name ? `📎 ${lm.attachment_name}` : '')) : '';
    c.unread = unreadByConv.get(c.id) || 0;
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
    .is('deleted_at', null)
    .order('created_at', { ascending: true }).limit(500);
  if (error) { console.warn('[chat.msgs]', error.message); return []; }
  const msgs = (data ?? []).map(msgFromRow);
  // Gönderen adları
  const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url');
  const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || 'Kullanıcı']));
  const avatarById = new Map((profs ?? []).map((p: any) => [p.id, p.avatar_url ?? undefined]));
  for (const m of msgs) { m.senderName = nameById.get(m.senderId) || 'Kullanıcı'; m.senderAvatar = avatarById.get(m.senderId) || undefined; }
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

/** Kendi mesajını sil (soft). */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', messageId);
  if (error) throw new Error(`[chat.delete] ${error.message}`);
}

/** Sohbeti "okundu" işaretle (unread sayacı sıfırlanır). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  try {
    await supabase.from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId).eq('user_id', me.id);
  } catch { /* sessiz */ }
}

/**
 * Realtime: bir sohbete gelen YENİ mesajları anlık dinler (polling yerine).
 * Dönen fonksiyon ile abonelik iptal edilir.
 */
export function subscribeToMessages(conversationId: string, onChange: () => void): () => void {
  if (!SUPABASE_CONFIGURED) return () => {};
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      () => onChange(),
    )
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch { /* ignore */ } };
}
