// AiChatScreen — Faz 41 (canlı veriyle beslenen sürüm)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiMessage, RootStackParamList } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { listMessages, sendMessage, sendMessageWithAttachment, approveMessage, createSession, type ChatAttachment } from '../services/aiAssistant';
import { QUICK_PROMPTS } from '../services/aiCopilot';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import MarkdownText from '../components/MarkdownText';
import { FLATLIST_DEFAULTS } from '../utils/perf';

/** Bir uri'yi (web blob/data veya native dosya) base64'e çevirir. */
async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web' || uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('http')) {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const FileSystem = await import('expo-file-system');
  return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
}

type R = RouteProp<RootStackParamList, 'AiChat'>;

export default function AiChatScreen() {
  const route = useRoute<R>();
  // Canlı uygulama verisi — asistanın gerçekten "sistemi bilmesi" için şart.
  // (Önceki sürüm askCopilot'a boş dizi geçiyordu; asistan her şeye "sistemde
  //  göremiyorum" diyordu. Artık CoPilot ekranıyla aynı bağlamı besliyoruz.)
  const { workOrders, customers, quotes, employees } = useAppContext();
  const { profile, user } = useAuth();
  const userName = profile?.full_name || profile?.email || user?.email || 'Kullanıcı';

  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId || null);
  const [items, setItems] = useState<AiMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ChatAttachment | null>(null);
  const ref = useRef<FlatList>(null);

  const pickImage = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const a = res.assets[0];
      setPending({ base64: a.base64!, mimeType: a.mimeType || 'image/jpeg', kind: 'image', name: a.fileName || 'foto.jpg' });
    } catch { /* iptal */ }
  }, []);

  const pickPdf = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const base64 = await uriToBase64(a.uri);
      if (!base64) return;
      setPending({ base64, mimeType: 'application/pdf', kind: 'pdf', name: a.name || 'belge.pdf' });
    } catch { /* iptal */ }
  }, []);

  const load = useCallback(async (id: string) => {
    const msgs = await listMessages(id);
    setItems(msgs);
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  useEffect(() => {
    (async () => {
      let id = sessionId;
      if (!id) { const s = await createSession('Yeni Sohbet', 'chat'); id = s.id; setSessionId(id); }
      load(id);
    })();
  }, []);

  const submit = useCallback(async (raw: string) => {
    const content = raw.trim();
    const att = pending;
    if ((!content && !att) || !sessionId || busy) return;
    setBusy(true);
    setText('');
    setPending(null);
    const snap = { workOrders, customers, quotes, employees, currentUserName: userName };
    // Optimistic user msg (ek varsa etiketle).
    const shown = att
      ? [att.kind === 'pdf' ? `📄 ${att.name}` : `🖼️ ${att.name}`, content].filter(Boolean).join('\n')
      : content;
    const userMsg: AiMessage = { id: Math.random().toString(), sessionId, role: 'user', content: shown, createdAt: new Date().toISOString() };
    setItems(prev => [...prev, userMsg]);
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50);
    try {
      if (att) {
        await sendMessageWithAttachment(sessionId, content, att, snap);
      } else {
        await sendMessage(sessionId, content, snap);
      }
      await load(sessionId);
    } catch (e: any) {
      // Hata sessizce yutulmasın — kullanıcıya baloncukla göster.
      setItems(prev => [...prev, {
        id: Math.random().toString(), sessionId, role: 'assistant',
        content: `⚠️ Yanıt alınamadı: ${e?.message || 'bilinmeyen hata'}`,
        createdAt: new Date().toISOString(),
      }]);
    } finally { setBusy(false); }
  }, [sessionId, busy, pending, workOrders, customers, quotes, employees, userName, load]);

  const empty = items.length === 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {empty ? (
          <ScrollView contentContainerStyle={s.welcome}>
            <Ionicons name="sparkles" size={44} color="#06b6d4" />
            <Text style={s.welcomeTitle}>Merhaba {userName.split(' ')[0]}</Text>
            <Text style={s.welcomeText}>
              Sistemini biliyorum — iş emirleri, müşteriler, teklifler ve POZ kataloğu elimde. Bir şey sor ya da hızlı başla:
            </Text>
            <View style={s.quickGrid}>
              {QUICK_PROMPTS.map(q => (
                <TouchableOpacity key={q.label} style={s.quickCard} onPress={() => submit(q.prompt)} disabled={busy}>
                  <Ionicons name={q.icon as any} size={20} color="#06b6d4" />
                  <Text style={s.quickText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            {...FLATLIST_DEFAULTS}
            ref={ref}
            data={items}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: spacing.md, gap: 8 }}
            renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View style={[s.bubble, isUser ? s.user : s.assistant]}>
                  {isUser
                    ? <Text style={s.msg}>{item.content}</Text>
                    : <MarkdownText content={item.content} color={colors.text.primary} size={typography.sm} />}
                  {item.sources && item.sources.length > 0 && (
                    <View style={s.srcRow}>
                      {item.sources.map((src: string) => (
                        <View key={src} style={s.src}><Text style={s.srcT}>{src}</Text></View>
                      ))}
                    </View>
                  )}
                  {!isUser && (
                    <View style={s.aRow}>
                      {item.tokens !== undefined && <Text style={s.meta}>{item.tokens} token</Text>}
                      {!item.approved ? (
                        <TouchableOpacity style={s.appr} onPress={async () => { await approveMessage(item.id); sessionId && load(sessionId); }}>
                          <Ionicons name="checkmark" size={12} color="#22c55e" />
                          <Text style={s.apprT}>Onayla</Text>
                        </TouchableOpacity>
                      ) : <View style={s.apprDone}><Ionicons name="checkmark-circle" size={12} color="#22c55e" /><Text style={s.apprT}>Onaylı</Text></View>}
                    </View>
                  )}
                </View>
              );
            }}
            ListFooterComponent={busy ? (
              <View style={[s.bubble, s.assistant, s.typing]}>
                <ActivityIndicator size="small" color="#06b6d4" />
                <Text style={s.typingT}>Düşünüyor…</Text>
              </View>
            ) : null}
          />
        )}
        {pending && (
          <View style={s.pendingBar}>
            <Ionicons name={pending.kind === 'pdf' ? 'document-text' : 'image'} size={16} color="#06b6d4" />
            <Text style={s.pendingName} numberOfLines={1}>{pending.name}</Text>
            <TouchableOpacity onPress={() => setPending(null)}><Ionicons name="close-circle" size={18} color={colors.rose.default} /></TouchableOpacity>
          </View>
        )}
        <View style={s.inputRow}>
          <TouchableOpacity style={s.attachBtn} onPress={pickImage} disabled={busy} hitSlop={6}>
            <Ionicons name="image-outline" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.attachBtn} onPress={pickPdf} disabled={busy} hitSlop={6}>
            <Ionicons name="document-attach-outline" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Mesaj yazın veya 📎 ekleyin..." placeholderTextColor={colors.text.faint} multiline editable={!busy} />
          <TouchableOpacity style={[s.send, (busy || (!text.trim() && !pending)) && { opacity: 0.5 }]} onPress={() => submit(text)} disabled={busy || (!text.trim() && !pending)}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  welcome: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  welcomeTitle: { color: colors.text.primary, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  welcomeText: { color: colors.text.muted, fontSize: typography.md, textAlign: 'center', lineHeight: 22 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md },
  quickCard: { width: '47%', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  quickText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  bubble: { padding: spacing.sm, borderRadius: radius.md, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#06b6d4' },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  msg: { color: '#fff', fontSize: typography.sm },
  srcRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  src: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.bg.primary },
  srcT: { color: colors.text.muted, fontSize: 10 },
  aRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  meta: { color: colors.text.faint, fontSize: 10 },
  appr: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#22c55e' },
  apprDone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  apprT: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingT: { color: colors.text.muted, fontSize: typography.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: 6, borderTopWidth: 1, borderTopColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  attachBtn: { padding: 4 },
  pendingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 8, marginHorizontal: spacing.sm, marginBottom: spacing.xs, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  pendingName: { flex: 1, color: colors.text.primary, fontSize: typography.xs },
  input: { flex: 1, backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, maxHeight: 100 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center' },
});
