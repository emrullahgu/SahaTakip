// ChatbotFAB — POZ-DEV-320 Sahada anlık yardım (Copilot LLM + kural tabanlı fallback)
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { askCopilot, askCopilotWithAttachment, type CopilotMessage } from '../services/aiCopilot';
import type { RootStackParamList } from '../types';

interface Msg { role: 'user' | 'bot'; text: string; ts: string }
interface Pending { base64: string; mimeType: string; kind: 'image' | 'pdf'; name: string }

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

const KNOWLEDGE: { trigger: RegExp; reply: string }[] = [
  { trigger: /müşter|customer/i, reply: 'Müşteri eklemek için: Müşteriler → + butonu. Mevcut müşteriyi düzenlemek için karta dokunun.' },
  { trigger: /teklif|quote|proposal/i, reply: 'Yeni teklif: Hub → Teklifler → Yeni. YG Trafo veya GES teklifi için Teklif Modülleri menüsünü kullanın.' },
  { trigger: /görev|task/i, reply: 'Görev oluştur: Görev Yönetimi → Görevler → +. Kanban görünümünde kart sürükleyerek durum değiştirebilirsiniz.' },
  { trigger: /takvim|calendar|etkinlik/i, reply: 'Takvim ekranından bir güne dokunun, "Ekle" ile etkinlik oluşturun. Katılımcılara otomatik bildirim gider.' },
  { trigger: /bordro|maaş|puantaj/i, reply: 'Önce Puantaj ekranından personelin günlerini işaretleyin. Sonra Bordro Hesaplamaları → + ile aylık hesabı oluşturun.' },
  { trigger: /şifre|password|parola/i, reply: 'Şifre değiştirmek için Profil → Şifreyi Değiştir. Unuttuysanız Giriş ekranından "Şifremi Unuttum".' },
  { trigger: /(merhaba|selam|hi|hello)/i, reply: 'Merhaba! SahaTakip asistanıyım. Görev, teklif, müşteri, takvim, bordro... ne hakkında yardım istersiniz?' },
  { trigger: /yardım|help/i, reply: 'Şu konularda yardımcı olabilirim: müşteri, teklif, görev, takvim, bordro, şifre, bildirim. Sorunuzu yazın.' },
];

function getReply(text: string): string {
  for (const k of KNOWLEDGE) if (k.trigger.test(text)) return k.reply;
  return 'Bu konuda doğrudan bilgim yok. Lütfen ana menüden ilgili modülü açın ya da soruyu daha açık yazın. (örn: "yeni teklif nasıl yapılır?")';
}

export default function ChatbotFAB() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: 'Merhaba! Ben SahaTakip Asistanıyım. Sistemini biliyorum — iş emirleri, teklifler, müşteriler, POZ kataloğu. Soru sor, özet iste, teklif taslağı hazırlat. 📎 ile fotoğraf veya PDF ekleyebilirsin — okuyup yorumlarım. Otonom işlem (oluştur/sil/gönder) için «Ajan» butonuna dokun.', ts: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { workOrders, customers, quotes, employees } = useAppContext();
  const { profile, user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const launchAgent = () => {
    const seed = (input.trim() || msgs.filter(m => m.role === 'user').slice(-1)[0]?.text || '').trim();
    setOpen(false);
    setInput('');
    // @ts-ignore - AgentConsole route param tipi initialGoal kabul ediyor
    nav.navigate('AgentConsole', seed ? { initialGoal: seed, autoStart: true } : undefined);
  };
  const userName = profile?.full_name || profile?.email || user?.email || 'Kullanıcı';

  useEffect(() => {
    if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [open, msgs.length]);

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const a = res.assets[0];
      setPending({ base64: a.base64!, mimeType: a.mimeType || 'image/jpeg', kind: 'image', name: a.fileName || 'foto.jpg' });
    } catch { /* iptal */ }
  };
  const pickPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const base64 = await uriToBase64(a.uri);
      if (!base64) return;
      setPending({ base64, mimeType: 'application/pdf', kind: 'pdf', name: a.name || 'belge.pdf' });
    } catch { /* iptal */ }
  };

  const onSend = async () => {
    const t = input.trim();
    if ((!t && !pending) || busy) return;
    const ts = new Date().toISOString();
    const att = pending;
    const shownText = [att ? (att.kind === 'pdf' ? `📄 ${att.name}` : `🖼️ ${att.name}`) : '', t].filter(Boolean).join('\n');
    setMsgs(m => [...m, { role: 'user', text: shownText || (att ? att.name : ''), ts }]);
    setInput('');
    setPending(null);
    setBusy(true);
    try {
      const history: CopilotMessage[] = msgs.map(m => ({
        id: m.ts, role: m.role === 'user' ? 'user' : 'assistant', content: m.text, createdAt: m.ts,
      }));
      const snap = { workOrders, customers, quotes, employees, currentUserName: userName };
      let reply: string;
      if (att) {
        // Foto/PDF ekli → vision/belge analizi (OpenAI/Gemini/Claude).
        const r = await askCopilotWithAttachment(t, att, snap, history);
        reply = r.reply;
      } else {
        // Bilgili konuşma asistanı (canlı veri + KB + geçmiş).
        const r = await askCopilot(t, snap, [...history, { id: ts, role: 'user', content: t, createdAt: ts }]);
        reply = r.reply;
      }
      setMsgs(m => [...m, { role: 'bot', text: reply || 'Tamamlandı.', ts: new Date().toISOString() }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'bot', text: getReply(t), ts: new Date().toISOString() }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={[s.fab, { bottom: 84 + insets.bottom }]} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalRoot}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.headerIcon}><Ionicons name="chatbubbles" size={18} color="#fff" /></View>
              <Text style={s.modalTitle}>SahaTakip Asistanı</Text>
              <TouchableOpacity onPress={launchAgent} style={s.agentBtn} accessibilityLabel="Otonom ajan">
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={s.agentBtnText}>Ajan</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView ref={scrollRef} style={s.body} contentContainerStyle={{ padding: spacing.sm, gap: 6 }}>
              {msgs.map((m, i) => (
                <View key={i} style={[s.bubble, m.role === 'user' ? s.userBubble : s.botBubble]}>
                  <Text style={[s.bubbleText, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
                </View>
              ))}
            </ScrollView>
            {pending && (
              <View style={s.pendingBar}>
                <Ionicons name={pending.kind === 'pdf' ? 'document-text' : 'image'} size={16} color="#a855f7" />
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
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Sorunuzu yazın veya 📎 ile foto/PDF ekleyin..."
                placeholderTextColor={colors.text.faint}
                onSubmitEditing={onSend}
                editable={!busy}
              />
              <TouchableOpacity style={[s.sendBtn, busy && { opacity: 0.5 }]} onPress={onSend} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { height: '75%', backgroundColor: colors.bg.primary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  headerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', flex: 1 },
  body: { flex: 1 },
  bubble: { padding: spacing.sm, borderRadius: radius.md, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0ea5e9' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  bubbleText: { color: colors.text.primary, fontSize: typography.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  attachBtn: { padding: 4 },
  pendingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 8, marginHorizontal: spacing.sm, marginTop: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  pendingName: { flex: 1, color: colors.text.primary, fontSize: typography.xs },
  input: { flex: 1, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.sm },
  sendBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  agentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7c3aed', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md },
  agentBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
});
