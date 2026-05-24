// ChatbotFAB — POZ-DEV-320 Sahada anlık yardım (kural tabanlı + opsiyonel AI)
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';

interface Msg { role: 'user' | 'bot'; text: string; ts: string }

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
    { role: 'bot', text: 'Merhaba! Ben SahaTakip asistanıyım. Size nasıl yardımcı olabilirim?', ts: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [open, msgs.length]);

  const onSend = () => {
    const t = input.trim();
    if (!t) return;
    const userMsg: Msg = { role: 'user', text: t, ts: new Date().toISOString() };
    const botMsg: Msg = { role: 'bot', text: getReply(t), ts: new Date().toISOString() };
    setMsgs(m => [...m, userMsg, botMsg]);
    setInput('');
  };

  return (
    <>
      <TouchableOpacity style={s.fab} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalRoot}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.headerIcon}><Ionicons name="chatbubbles" size={18} color="#fff" /></View>
              <Text style={s.modalTitle}>SahaTakip Asistanı</Text>
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
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Sorunuzu yazın..."
                placeholderTextColor={colors.text.faint}
                onSubmitEditing={onSend}
              />
              <TouchableOpacity style={s.sendBtn} onPress={onSend}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fab: { position: 'absolute', right: 20, bottom: 80, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
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
  inputRow: { flexDirection: 'row', gap: 6, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  input: { flex: 1, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.sm },
  sendBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
});
