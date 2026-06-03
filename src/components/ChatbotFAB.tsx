// ChatbotFAB — POZ-DEV-320 Sahada anlık yardım (Copilot LLM + kural tabanlı fallback)
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { runAgent } from '../services/agent/loop';
import type { RootStackParamList } from '../types';

interface Msg { role: 'user' | 'bot'; text: string; ts: string }

/** Başarılı yazma-aksiyonlarını sohbet için tek satır özetler. */
function summarizeAction(name: string, result: any): string {
  if (!result || result.error) return '';
  switch (name) {
    case 'create_quote_draft':
      return `✅ Teklif ${result.number ?? result.id} oluşturuldu — ${result.lineCount ?? 0} kalem · ₺${Number(result.grandTotal ?? 0).toLocaleString('tr-TR')}`;
    case 'create_customer':
      return result.customer ? `✅ Müşteri eklendi: ${result.customer.shortName ?? result.customer.short_name ?? ''}` : '';
    case 'create_work_order':
      return result.work_order ? `✅ İş emri oluşturuldu: ${result.work_order.number ?? ''}` : '';
    case 'update_work_order_status':
      return result.ok ? '✅ İş emri durumu güncellendi.' : '';
    case 'delete_work_order': return '🗑️ İş emri silindi.';
    case 'delete_customer': return '🗑️ Müşteri silindi.';
    default: return '';
  }
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
    { role: 'bot', text: 'Merhaba! Ben SahaTakip Ajanıyım. Gerçekten işlem yapabilirim: teklif/iş emri/müşteri oluşturma, sorgulama. Örn: «DİNÇER için POZ-RD3-0408\'den 5 adet teklif hazırla» — oluşturmadan önce onayınızı isterim.', ts: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const app = useAppContext();
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

  /** Yıkıcı (yazma) işlemler için çapraz-platform onay diyaloğu. */
  const confirmAction = (toolName: string, args: any): Promise<boolean> => {
    const labels: Record<string, string> = {
      create_quote_draft: `Teklif oluşturulsun mu?${args?.customerName ? ` (${args.customerName})` : ''}`,
      create_customer: `Yeni müşteri eklensin mi?${args?.short_name ? ` (${args.short_name})` : ''}`,
      create_work_order: 'İş emri oluşturulsun mu?',
      delete_work_order: 'İş emri silinsin mi?',
      delete_customer: 'Müşteri silinsin mi?',
      update_work_order_status: `İş emri durumu "${args?.status ?? ''}" yapılsın mı?`,
    };
    const msg = labels[toolName] || `"${toolName}" işlemi onaylıyor musunuz?`;
    return new Promise(resolve => {
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        resolve(typeof window !== 'undefined' ? window.confirm(msg) : true);
      } else {
        Alert.alert('Onay', msg, [
          { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Onayla', onPress: () => resolve(true) },
        ]);
      }
    });
  };

  const onSend = async () => {
    const t = input.trim();
    if (!t || busy) return;
    setMsgs(m => [...m, { role: 'user', text: t, ts: new Date().toISOString() }]);
    setInput('');
    setBusy(true);
    let finalText = '';
    const actions: string[] = [];
    try {
      // GERÇEK tool-calling agent — find/search/create tool'larını gerçekten çalıştırır.
      await runAgent({
        goal: t,
        ctx: { app, currentUserName: userName, confirm: confirmAction, log: () => {} },
        maxIterations: 10,
        onEvent: e => {
          if (e.type === 'thought' && e.content) finalText = e.content;
          else if (e.type === 'final') finalText = e.content || finalText;
          else if (e.type === 'tool_result' && e.ok) {
            const s = summarizeAction(e.name, e.result);
            if (s) actions.push(s);
          } else if (e.type === 'tool_denied') {
            actions.push('↩️ İşlem iptal edildi.');
          } else if (e.type === 'error') {
            finalText = '⚠️ ' + e.error;
          }
        },
      });
      const text = [finalText, actions.length ? actions.join('\n') : ''].filter(Boolean).join('\n\n') || 'Tamamlandı.';
      setMsgs(m => [...m, { role: 'bot', text, ts: new Date().toISOString() }]);
    } catch (e: any) {
      // AI sağlayıcı yapılandırılmamışsa kural tabanlı yardıma düş (yalan söyleme).
      const msg = /yapılandırıl/i.test(e?.message || '') ? getReply(t) : (getReply(t));
      setMsgs(m => [...m, { role: 'bot', text: msg, ts: new Date().toISOString() }]);
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
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Sorunuzu yazın..."
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
  inputRow: { flexDirection: 'row', gap: 6, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  input: { flex: 1, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.sm },
  sendBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  agentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7c3aed', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md },
  agentBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
});
