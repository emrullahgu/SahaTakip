// src/services/aiChatSessions.ts
// AI sohbet oturumu kalıcılığı (Supabase tabloları: ai_chat_sessions, ai_chat_messages)

import { supabase } from './supabase';

export interface AiChatSession {
  id: string;
  user_id: string | null;
  title: string;
  pinned: boolean;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiChatMessageRow {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  meta: Record<string, any> | null;
  created_at: string;
}

export async function listSessions(limit = 50): Promise<AiChatSession[]> {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .order('pinned', { ascending: false })
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AiChatSession[];
}

export async function createSession(title?: string): Promise<AiChatSession> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({ user_id: userId, title: title || 'Yeni sohbet' })
    .select('*')
    .single();
  if (error) throw error;
  return data as AiChatSession;
}

export async function renameSession(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function togglePin(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({ pinned })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('ai_chat_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function listMessages(sessionId: string, limit = 200): Promise<AiChatMessageRow[]> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AiChatMessageRow[];
}

export async function appendMessage(
  sessionId: string,
  role: AiChatMessageRow['role'],
  content: string,
  meta?: Record<string, any>,
): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_messages')
    .insert({ session_id: sessionId, role, content, meta: meta ?? null });
  if (error) throw error;
}

/** İlk kullanıcı mesajından otomatik başlık üret (max 60 karakter). */
export function deriveTitle(firstUserText: string): string {
  const cleaned = firstUserText.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 60) return cleaned || 'Yeni sohbet';
  return cleaned.slice(0, 57) + '…';
}
