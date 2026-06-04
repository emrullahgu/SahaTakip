// CoPilotScreen — sistemden beslenen gerçek AI sohbet asistanı.
// AI Ayarları'ndaki sağlayıcıyı (OpenAI/Claude/Gemini) kullanır, her istekte
// canlı uygulama verisi + Bilgi Tabanı + son mesajları sistem promptuna ekler.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  askCopilot, loadHistory, saveHistory, clearHistory,
  scanInboxAndSuggest, QUICK_PROMPTS, type CopilotMessage,
} from '../services/aiCopilot';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CoPilot'>;

export default function CoPilotScreen() {
  const nav = useNavigation<Nav>();
  const { workOrders, customers, quotes, employees } = useAppContext();
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<CopilotMessage>>(null);

  const userName = profile?.full_name || profile?.email || user?.email || 'Kullanıcı';

  useEffect(() => {
    loadHistory().then(setMessages);
  }, []);

  const scroll = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const ask = useCallback(async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: CopilotMessage = {
      id: 'm_' + Date.now(),
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    scroll();

    try {
      const { reply, provider } = await askCopilot(
        text.trim(),
        { workOrders, customers, quotes, employees, currentUserName: userName },
        next,
      );
      const asstMsg: CopilotMessage = {
        id: 'm_' + Date.now() + '_a',
        role: 'assistant',
        content: reply + (provider === 'mock' ? '\n\n_— Yerel demo yanıtı (AI sağlayıcı tanımlı değil; AI Ayarları\'ndan ekleyebilirsiniz)_' : ''),
        createdAt: new Date().toISOString(),
      };
      const updated = [...next, asstMsg];
      setMessages(updated);
      saveHistory(updated);
      scroll();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'AI çağrısı başarısız');
    } finally {
      setBusy(false);
    }
  }, [busy, messages, workOrders, customers, quotes, employees, userName, scroll]);

  const onScanInbox = useCallback(async () => {
    setBusy(true);
    try {
      const reply = await scanInboxAndSuggest({ workOrders, customers, quotes, employees, currentUserName: userName });
      const asstMsg: CopilotMessage = {
        id: 'm_' + Date.now() + '_inbox',
        role: 'assistant',
        content: '**📥 Gelen Kutusu Taraması:**\n\n' + reply,
        createdAt: new Date().toISOString(),
      };
      const updated = [...messages, asstMsg];
      setMessages(updated);
      saveHistory(updated);
      scroll();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Inbox tarama başarısız');
    } finally {
      setBusy(false);
    }
  }, [messages, workOrders, customers, quotes, employees, userName, scroll]);

  const onClear = useCallback(() => {
    Alert.alert('Sohbeti Sıfırla', 'Tüm geçmiş silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: async () => {
        await clearHistory();
        setMessages([]);
      } },
    ]);
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Saha Copilot</Text>
          <Text style={s.subtitle}>Sistemden beslenen yapay zeka</Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('AiKnowledgeBase')} style={s.iconBtn}>
          <Ionicons name="library-outline" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => nav.navigate('AiSettings')} style={s.iconBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClear} style={s.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.rose.default} />
        </TouchableOpacity>
      </View>

      {messages.length === 0 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.welcome}>
          <Ionicons name="sparkles" size={48} color="#a855f7" />
          <Text style={s.welcomeTitle}>Merhaba {userName.split(' ')[0]}</Text>
          <Text style={s.welcomeText}>
            Senin sistemini biliyorum — iş emirleri, müşteriler, POZ kataloğu, onay kuyruğu hepsi elimde.
            {'\n\n'}Sana nasıl yardım edebilirim?
          </Text>
          <View style={s.quickGrid}>
            {QUICK_PROMPTS.map(q => (
              <TouchableOpacity key={q.label} style={s.quickCard} onPress={() => ask(q.prompt)}>
                <Ionicons name={q.icon as any} size={22} color="#a855f7" />
                <Text style={s.quickText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.inboxBtn} onPress={onScanInbox}>
            <Ionicons name="mail-unread-outline" size={18} color="#fff" />
            <Text style={s.inboxText}>Gelen Kutusu Tara (KB'deki e-posta/WhatsApp)</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {messages.length > 0 && (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.botBubble]}>
              {item.role === 'assistant' && (
                <View style={s.botHeader}>
                  <Ionicons name="sparkles" size={14} color="#a855f7" />
                  <Text style={s.botName}>Copilot</Text>
                </View>
              )}
              <Text style={item.role === 'user' ? s.userText : s.botText}>{item.content}</Text>
            </View>
          )}
        />
      )}

      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Bir şey sor... (örn: 3+1 ev için elektrik teklifi hazırla)"
          placeholderTextColor={colors.text.faint}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!busy}
        />
        <TouchableOpacity
          style={[s.sendBtn, (busy || !input.trim()) && { opacity: 0.5 }]}
          onPress={() => ask(input)}
          disabled={busy || !input.trim()}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border.primary,
  },
  iconBtn: { padding: 6 },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  subtitle: { color: colors.text.muted, fontSize: typography.xs },
  welcome: { padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  welcomeTitle: { color: colors.text.primary, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  welcomeText: { color: colors.text.muted, fontSize: typography.md, textAlign: 'center', lineHeight: 22 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md },
  quickCard: {
    width: '47%', padding: spacing.md, backgroundColor: colors.bg.secondary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6,
  },
  quickText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  inboxBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0ea5e9', paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderRadius: radius.full, marginTop: spacing.md,
  },
  inboxText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  bubble: {
    maxWidth: '90%', padding: spacing.md, borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#a855f7' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  botHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  botName: { color: '#a855f7', fontSize: typography.xs, fontWeight: '700' },
  userText: { color: '#fff', fontSize: typography.md, lineHeight: 22 },
  botText: { color: colors.text.primary, fontSize: typography.md, lineHeight: 22 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  input: {
    flex: 1, color: colors.text.primary, fontSize: typography.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, maxHeight: 120,
    backgroundColor: colors.bg.primary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#a855f7',
    alignItems: 'center', justifyContent: 'center',
  },
});
