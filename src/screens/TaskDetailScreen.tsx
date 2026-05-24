// TaskDetailScreen — POZ-DEV-306 Görev detayı + yorumlar + ekler
import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, Task, TaskComment, TaskAttachment } from '../types';
import { getTask, TASK_STATUS_LABEL, TASK_STATUS_COLOR, TASK_PRIORITY_LABEL, TASK_PRIORITY_COLOR, updateTaskStatus } from '../services/tasks';
import { listComments, addComment, deleteComment, listAttachments, addAttachment, deleteAttachment, extractMentions, ATTACHMENT_KIND_ICON } from '../services/taskCollab';
import { addNotification } from '../services/notifications';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type R = RouteProp<RootStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { taskId } = route.params;
  const { profile, user } = useAuth();
  const { employees } = useAppContext();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [commentText, setCommentText] = useState('');

  const refresh = useCallback(async () => {
    const t = await getTask(taskId);
    setTask(t || null);
    setComments(await listComments(taskId));
    setAttachments(await listAttachments(taskId));
  }, [taskId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!task) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <View style={s.empty}><Text style={s.emptyText}>Görev bulunamadı</Text></View>
      </SafeAreaView>
    );
  }

  const onAddComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    const mentions = extractMentions(text);
    const c = await addComment({
      taskId,
      authorId: user?.id || 'demo',
      authorName: profile?.full_name || user?.email || 'Demo',
      text,
    });
    setCommentText('');
    // Mention bildirimleri (yerel)
    for (const m of c.mentions) {
      await addNotification({
        type: 'task_mention',
        title: 'Bahsedildiniz',
        message: `${c.authorName}: ${text.slice(0, 60)}`,
        channels: ['push'],
        relatedId: taskId,
        recipient: m,
      });
    }
    // Atanmış kişiye yorum bildirimi
    if (task.assignedTo && task.assignedTo !== c.authorId) {
      await addNotification({
        type: 'task_comment',
        title: 'Yeni yorum',
        message: `${c.authorName} bir yorum ekledi`,
        channels: ['push'],
        relatedId: taskId,
        recipient: task.assignedTo,
      });
    }
    refresh();
  };

  const onAddAttachment = (kind: TaskAttachment['kind']) => {
    Alert.prompt?.('Ek Ekle', `Dosya adı / URI girin (${kind})`, async (name) => {
      if (!name) return;
      await addAttachment({ taskId, kind, uri: name, name, uploadedBy: user?.id });
      refresh();
    });
  };

  const cycleStatus = async () => {
    const order: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];
    const i = order.indexOf(task.status);
    const next = order[(i + 1) % order.length];
    await updateTaskStatus(task.id, next);
    refresh();
  };

  const employeeName = (id?: string) => employees.find(e => e.id === id)?.name || id || '—';

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { borderColor: TASK_STATUS_COLOR[task.status] }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{task.title}</Text>
            <View style={s.pillRow}>
              <View style={[s.pill, { backgroundColor: TASK_STATUS_COLOR[task.status] + '22', borderColor: TASK_STATUS_COLOR[task.status] }]}>
                <Text style={[s.pillText, { color: TASK_STATUS_COLOR[task.status] }]}>{TASK_STATUS_LABEL[task.status]}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: TASK_PRIORITY_COLOR[task.priority] + '22', borderColor: TASK_PRIORITY_COLOR[task.priority] }]}>
                <Text style={[s.pillText, { color: TASK_PRIORITY_COLOR[task.priority] }]}>{TASK_PRIORITY_LABEL[task.priority]}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => nav.navigate('TaskForm', { taskId: task.id })} style={s.iconBtn}>
            <Ionicons name="create-outline" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={s.metaCard}>
          {task.description ? <Text style={s.desc}>{task.description}</Text> : null}
          <Row icon="person-outline" label="Atanan" value={employeeName(task.assignedTo)} />
          {task.dueDate && <Row icon="calendar-outline" label="Termin" value={task.dueDate} />}
          {task.customerId && <Row icon="business-outline" label="Müşteri" value={task.customerId} />}
        </View>

        <TouchableOpacity style={[s.btn, { backgroundColor: TASK_STATUS_COLOR[task.status] }]} onPress={cycleStatus}>
          <Ionicons name="play-skip-forward-outline" size={18} color="#fff" />
          <Text style={s.btnText}>Durumu İlerlet</Text>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>Yorumlar ({comments.length})</Text>
        {comments.length === 0 && <Text style={s.empty}>Henüz yorum yok</Text>}
        {comments.map(c => (
          <View key={c.id} style={s.commentBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.commentAuthor}>{c.authorName}</Text>
              <Text style={s.commentText}>{c.text}</Text>
              <Text style={s.commentMeta}>{new Date(c.createdAt).toLocaleString('tr-TR')}</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Sil', 'Silinsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: async () => { await deleteComment(c.id); refresh(); } },
            ])}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={s.commentInputRow}>
          <TextInput
            style={s.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Yorum yaz... @kullaniciId ile bahset"
            placeholderTextColor={colors.text.faint}
            multiline
          />
          <TouchableOpacity style={s.sendBtn} onPress={onAddComment}>
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Ekler ({attachments.length})</Text>
        <View style={s.attachBtnRow}>
          {(['image', 'pdf', 'video', 'other'] as const).map(k => (
            <TouchableOpacity key={k} style={s.attachBtn} onPress={() => onAddAttachment(k)}>
              <Ionicons name={ATTACHMENT_KIND_ICON[k] as never} size={14} color={colors.text.primary} />
              <Text style={s.attachBtnText}>+ {k}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {attachments.map(a => (
          <View key={a.id} style={s.attachRow}>
            <Ionicons name={ATTACHMENT_KIND_ICON[a.kind] as never} size={20} color="#0ea5e9" />
            <View style={{ flex: 1 }}>
              <Text style={s.attachName}>{a.name}</Text>
              <Text style={s.attachMeta}>{new Date(a.uploadedAt).toLocaleString('tr-TR')}</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Sil', 'Silinsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: async () => { await deleteAttachment(a.id); refresh(); } },
            ])}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon as never} size={14} color={colors.text.muted} />
      <Text style={{ color: colors.text.muted, fontSize: typography.xs, width: 70 }}>{label}</Text>
      <Text style={{ color: colors.text.primary, fontSize: typography.sm, flex: 1 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  hero: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 2 },
  title: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: typography.xs, fontWeight: '700' },
  iconBtn: { padding: 6, backgroundColor: colors.bg.primary, borderRadius: radius.sm },
  metaCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  desc: { color: colors.text.primary, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.md },
  btnText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.md },
  empty: { color: colors.text.muted, fontStyle: 'italic', textAlign: 'center', padding: spacing.sm },
  emptyText: { color: colors.text.muted, padding: spacing.lg },
  commentBox: { flexDirection: 'row', gap: 8, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  commentAuthor: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  commentText: { color: colors.text.primary, fontSize: typography.sm, marginTop: 2 },
  commentMeta: { color: colors.text.faint, fontSize: typography.xs, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  commentInput: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, color: colors.text.primary, fontSize: typography.sm },
  sendBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  attachBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.full },
  attachBtnText: { color: colors.text.primary, fontSize: typography.xs },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  attachName: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  attachMeta: { color: colors.text.muted, fontSize: typography.xs },
});
