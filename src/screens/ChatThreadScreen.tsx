// ChatThreadScreen — bir sohbetin mesajları + foto/PDF/dosya ekli composer.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { colors, spacing, radius, typography } from '../theme';
import {
  listMessages, sendMessage, uploadChatAttachment, attachmentSignedUrl,
  subscribeToMessages, deleteMessage, markConversationRead,
  type ChatMessage,
} from '../services/messaging';
import { getCurrentUser } from '../services/supabase';
import { openUrlSafe } from '../utils/urlGuard';
import type { RootStackParamList } from '../types';

type R = RouteProp<RootStackParamList, 'ChatThread'>;

export default function ChatThreadScreen() {
  const nav = useNavigation();
  const { conversationId, title } = useRoute<R>().params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | undefined>();
  const [pending, setPending] = useState<{ uri: string; name: string } | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => { getCurrentUser().then(u => setMeId(u?.id)); }, []);

  const load = useCallback(async () => {
    const msgs = await listMessages(conversationId);
    setMessages(msgs);
    // ekler için imzalı URL üret
    const urls: Record<string, string> = {};
    for (const m of msgs) {
      if (m.attachmentUrl && !signed[m.attachmentUrl]) {
        const u = await attachmentSignedUrl(m.attachmentUrl);
        if (u) urls[m.attachmentUrl] = u;
      }
    }
    if (Object.keys(urls).length) setSigned(prev => ({ ...prev, ...urls }));
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [conversationId, signed]);

  useEffect(() => {
    load();
    void markConversationRead(conversationId);
    // Realtime: yeni mesaj gelince anında yenile (polling yerine). Yedek olarak
    // 15sn'de bir senkron (realtime bağlantısı koparsa kaçan mesaj olmasın).
    const unsub = subscribeToMessages(conversationId, () => { load(); void markConversationRead(conversationId); });
    const t = setInterval(load, 15000);
    return () => { unsub(); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const confirmDelete = (m: ChatMessage) => {
    if (m.senderId !== meId) return;
    Alert.alert('Mesajı sil', 'Bu mesaj silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try { await deleteMessage(m.id); setMessages(prev => prev.map(x => x.id === m.id ? { ...x, deleted: true, body: undefined, attachmentUrl: undefined, attachmentType: undefined, attachmentName: undefined } : x)); }
        catch (e: any) { Alert.alert('Hata', e?.message || 'Silinemedi'); }
      } },
    ]);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) setPending({ uri: res.assets[0].uri, name: res.assets[0].fileName || 'foto.jpg' });
  };
  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) setPending({ uri: res.assets[0].uri, name: res.assets[0].name || 'dosya' });
  };

  const send = async () => {
    if (!text.trim() && !pending) return;
    setSending(true);
    try {
      let att;
      if (pending) att = await uploadChatAttachment(pending.uri, pending.name) || undefined;
      await sendMessage(conversationId, text, att);
      setText(''); setPending(null);
      await load();
    } catch (e: any) {
      Alert.alert('Gönderilemedi', e?.message || 'Hata');
    } finally { setSending(false); }
  };

  const renderMsg = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === meId;
    const url = item.attachmentUrl ? signed[item.attachmentUrl] : undefined;
    if (item.deleted) {
      return (
        <View style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}>
          {!mine && <View style={[styles.msgAvatar, styles.msgAvatarFallback, { opacity: 0.5 }]}><Ionicons name="person" size={14} color="#fff" /></View>}
          <View style={[styles.bubble, styles.bubbleDeleted]}>
            <View style={styles.deletedRow}>
              <Ionicons name="ban-outline" size={13} color={colors.text.faint} />
              <Text style={styles.deletedText}>Bu mesaj silindi</Text>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}>
        {!mine && (
          item.senderAvatar
            ? <Image source={{ uri: item.senderAvatar }} style={styles.msgAvatar} resizeMode="cover" />
            : <View style={[styles.msgAvatar, styles.msgAvatarFallback]}><Text style={styles.msgAvatarText}>{(item.senderName || '?').slice(0, 1).toUpperCase()}</Text></View>
        )}
        <TouchableOpacity
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
          activeOpacity={mine ? 0.7 : 1}
          onLongPress={() => confirmDelete(item)}
          delayLongPress={350}
        >
          {!mine && <Text style={styles.sender}>{item.senderName}</Text>}
          {item.attachmentType === 'image' && url && (
            <TouchableOpacity onPress={() => openUrlSafe(url)} activeOpacity={0.9}>
              <Image source={{ uri: url }} style={styles.attachImg} resizeMode="cover" />
            </TouchableOpacity>
          )}
          {item.attachmentUrl && item.attachmentType !== 'image' && (
            <TouchableOpacity style={styles.fileChip} onPress={() => url && openUrlSafe(url)} activeOpacity={0.8}>
              <Ionicons name={item.attachmentType === 'pdf' ? 'document-text' : 'document-attach'} size={18} color={colors.indigo.default} />
              <Text style={styles.fileName} numberOfLines={1}>{item.attachmentName || 'Dosya'}</Text>
            </TouchableOpacity>
          )}
          {!!item.body && <Text style={[styles.body, mine && { color: '#fff' }]}>{item.body}</Text>}
          <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.7)' }]}>{item.createdAt.slice(11, 16)}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMsg}
          contentContainerStyle={{ padding: spacing.md }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {pending && (
          <View style={styles.pendingBar}>
            <Ionicons name="attach" size={16} color={colors.indigo.default} />
            <Text style={styles.pendingName} numberOfLines={1}>{pending.name}</Text>
            <TouchableOpacity onPress={() => setPending(null)}><Ionicons name="close-circle" size={18} color={colors.rose.default} /></TouchableOpacity>
          </View>
        )}

        <View style={styles.composer}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage} hitSlop={6}><Ionicons name="image-outline" size={22} color={colors.text.muted} /></TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={pickFile} hitSlop={6}><Ionicons name="attach-outline" size={22} color={colors.text.muted} /></TouchableOpacity>
          <TextInput
            style={styles.composerInput}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.text.faint}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending} activeOpacity={0.8}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  title: { flex: 1, fontSize: typography.lg, color: colors.text.primary, fontWeight: '800' },
  msgRow: { marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginBottom: 2 },
  msgAvatarFallback: { backgroundColor: colors.indigo.default, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  msgLeft: { justifyContent: 'flex-start' },
  msgRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, padding: spacing.sm, paddingHorizontal: spacing.md },
  bubbleMine: { backgroundColor: colors.indigo.default, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderBottomLeftRadius: 4 },
  bubbleDeleted: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderStyle: 'dashed', opacity: 0.7 },
  deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deletedText: { fontSize: typography.xs, color: colors.text.faint, fontStyle: 'italic' },
  sender: { fontSize: 11, color: colors.emerald.default, fontWeight: '700', marginBottom: 2 },
  body: { fontSize: typography.sm, color: colors.text.primary, lineHeight: 19 },
  time: { fontSize: 10, color: colors.text.faint, alignSelf: 'flex-end', marginTop: 3 },
  attachImg: { width: 200, height: 150, borderRadius: radius.md, marginBottom: 4 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.indigo.bg, borderRadius: radius.sm, padding: 8, marginBottom: 4 },
  fileName: { flex: 1, fontSize: typography.xs, color: colors.indigo.default, fontWeight: '600' },
  pendingBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.indigo.bg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginHorizontal: spacing.md, borderRadius: radius.md },
  pendingName: { flex: 1, fontSize: typography.xs, color: colors.indigo.default },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  attachBtn: { padding: 4 },
  composerInput: { flex: 1, maxHeight: 100, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.sm },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.indigo.default, alignItems: 'center', justifyContent: 'center' },
});
