// AiChatScreen — Faz 41
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiMessage, RootStackParamList } from '../types';
import { listMessages, sendMessage, approveMessage, createSession } from '../services/aiAssistant';

type R = RouteProp<RootStackParamList, 'AiChat'>;

export default function AiChatScreen() {
  const route = useRoute<R>();
  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId || null);
  const [items, setItems] = useState<AiMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<FlatList>(null);

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

  const onSend = async () => {
    if (!text.trim() || !sessionId || busy) return;
    setBusy(true);
    const content = text;
    setText('');
    // Optimistic user msg
    const userMsg: AiMessage = { id: Math.random().toString(), sessionId, role: 'user', content, createdAt: new Date().toISOString() };
    setItems(prev => [...prev, userMsg]);
    try {
      await sendMessage(sessionId, content);
      await load(sessionId);
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={ref}
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: spacing.md, gap: 8 }}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View style={[s.bubble, isUser ? s.user : s.assistant]}>
                <Text style={s.msg}>{item.content}</Text>
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
        />
        <View style={s.inputRow}>
          <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Mesaj yazın..." placeholderTextColor={colors.text.faint} multiline />
          <TouchableOpacity style={[s.send, busy && { opacity: 0.5 }]} onPress={onSend} disabled={busy}>
            <Ionicons name={busy ? 'hourglass-outline' : 'send'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bubble: { padding: spacing.sm, borderRadius: radius.md, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#06b6d4' },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  msg: { color: colors.text.primary, fontSize: typography.sm },
  srcRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  src: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.bg.primary },
  srcT: { color: colors.text.muted, fontSize: 10 },
  aRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  meta: { color: colors.text.faint, fontSize: 10 },
  appr: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#22c55e' },
  apprDone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  apprT: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
  inputRow: { flexDirection: 'row', padding: spacing.sm, gap: 6, borderTopWidth: 1, borderTopColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  input: { flex: 1, backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, maxHeight: 100 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center' },
});
