// POZ-DEV-301: Görev yorum & ek servisleri
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskComment, TaskAttachment, TaskAttachmentKind } from '../types';

const COMMENT_KEY = 'task_comments_v1';
const ATTACH_KEY = 'task_attachments_v1';

export async function listComments(taskId?: string): Promise<TaskComment[]> {
  const raw = await AsyncStorage.getItem(COMMENT_KEY);
  const all = raw ? (JSON.parse(raw) as TaskComment[]) : [];
  const filtered = taskId ? all.filter(c => c.taskId === taskId) : all;
  return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const MENTION_RE = /@([A-Za-z0-9_-]+)/g;
export function extractMentions(text: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

export async function addComment(input: Omit<TaskComment, 'id' | 'createdAt' | 'mentions'> & { mentions?: string[] }): Promise<TaskComment> {
  const all = (await listComments()).slice();
  const created: TaskComment = {
    ...input,
    mentions: input.mentions ?? extractMentions(input.text),
    id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(created);
  await AsyncStorage.setItem(COMMENT_KEY, JSON.stringify(all));
  return created;
}

export async function deleteComment(id: string): Promise<void> {
  const all = await listComments();
  await AsyncStorage.setItem(COMMENT_KEY, JSON.stringify(all.filter(c => c.id !== id)));
}

export async function listAttachments(taskId?: string): Promise<TaskAttachment[]> {
  const raw = await AsyncStorage.getItem(ATTACH_KEY);
  const all = raw ? (JSON.parse(raw) as TaskAttachment[]) : [];
  const filtered = taskId ? all.filter(a => a.taskId === taskId) : all;
  return filtered.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function addAttachment(input: Omit<TaskAttachment, 'id' | 'uploadedAt'>): Promise<TaskAttachment> {
  const all = (await listAttachments()).slice();
  const created: TaskAttachment = {
    ...input,
    id: `ta_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    uploadedAt: new Date().toISOString(),
  };
  all.unshift(created);
  await AsyncStorage.setItem(ATTACH_KEY, JSON.stringify(all));
  return created;
}

export async function deleteAttachment(id: string): Promise<void> {
  const all = await listAttachments();
  await AsyncStorage.setItem(ATTACH_KEY, JSON.stringify(all.filter(a => a.id !== id)));
}

export const ATTACHMENT_KIND_ICON: Record<TaskAttachmentKind, string> = {
  image: 'image-outline',
  pdf: 'document-text-outline',
  video: 'videocam-outline',
  other: 'attach-outline',
};
